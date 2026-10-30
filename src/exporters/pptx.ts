import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type ElementHandle, type Page } from 'playwright';
import { renderPresentation } from '../renderers/html.js';
import { fileRenderOptions, loadPresentation } from '../templates/load.js';
import { applyMetadata, type PresentationMetadata } from './metadata.js';
import { widenTextBoxes, type TextSlack } from './text-fit.js';
import { applyEastAsianFont } from './fonts.js';
import { applyTextOutlines, markTextOutlines } from './text-outline.js';
import { applyBackgrounds } from './backgrounds.js';
import { validateLayout, type ValidationIssue } from '../validators/layout.js';
import { validatePptx } from '../validators/pptx.js';
import { SLIDE_SIZE } from '../themes/tokens.js';
import { slidePrefix } from '../images/html.js';
import { checkPublicHost, dataUrl, IMAGE_EXTENSIONS, RemoteImageFetcher, type RemoteImageOptions } from '../images/remote.js';

export interface ExportOptions {
  output: string;
  selector?: string;
  metadata?: PresentationMetadata;
  /** Layout errors block export by default; warnings are always returned. */
  validate?: boolean;
  timeout?: number;
  /** Extra text box width tolerating PowerPoint font metrics; `false` keeps converter sizes. */
  textSlack?: TextSlack | false;
  /** PowerPoint East Asian font for CJK text; defaults to Microsoft JhengHei. */
  eastAsianFont?: string;
  /**
   * Limits for downloading remote images. With `blockPrivateNetwork`, browser requests to
   * non-public addresses are refused too, including the input URL itself.
   */
  remoteImages?: RemoteImageOptions;
}

/**
 * Abort browser requests to non-public addresses and remember them. Hosts are resolved here and
 * again by Chromium, so this is a guard against mistakes and plain links, not DNS rebinding.
 */
async function blockPrivateRequests(page: Page): Promise<string[]> {
  const blocked: string[] = [];
  const hosts = new Map<string, Promise<boolean>>();
  await page.route(/^https?:/i, async route => {
    const url = new URL(route.request().url());
    let allowed = hosts.get(url.hostname);
    if (!allowed) {
      allowed = checkPublicHost(url.hostname).then(() => true, () => false);
      hosts.set(url.hostname, allowed);
    }
    if (await allowed) return route.fallback();
    blocked.push(url.href);
    return route.abort('blockedbyclient');
  });
  return blocked;
}

export async function waitForAssets(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image =>
      image.decode().catch(() => undefined)));
  });
}

/**
 * Replace each rendered slide image with a data URL: local `file:` images are read from disk and
 * remote HTTP(S) images are fetched in Node, so the host's CORS and CORP headers do not matter.
 */
async function prepareImages(page: Page, selector: string, fetcher: RemoteImageFetcher): Promise<void> {
  const images = page.locator(selector).locator('img');
  const sources = await images.evaluateAll((elements, selector) =>
    (elements as HTMLImageElement[]).map(image => {
      const bounds = image.getBoundingClientRect();
      const slide = Array.from(document.querySelectorAll(selector)).indexOf(image.closest(selector)!) + 1;
      return image.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        && bounds.width > 0 && bounds.height > 0 ? { src: image.currentSrc || image.src, slide } : null;
    }), selector);
  const replacements = await Promise.all(sources.map(async source => {
    if (source === null) return null;
    if (/^https?:/i.test(source.src)) {
      try {
        const image = await fetcher.fetch(source.src);
        return dataUrl(image.type, image.data);
      } catch (error) {
        throw new Error(`${slidePrefix(source.slide)}${error instanceof Error ? error.message : String(error)}`, { cause: error });
      }
    }
    if (!source.src.startsWith('file:')) return source.src;
    const path = fileURLToPath(source.src);
    const mime = IMAGE_EXTENSIONS.get(extname(path).toLowerCase());
    if (!mime) throw new Error(`Unsupported image format: ${path}. Use SVG, PNG, JPEG, GIF, WebP, or AVIF.`);
    let bytes: Buffer;
    try {
      bytes = await readFile(path);
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code === 'ENOENT') {
        throw new Error(`Image not found: ${path}. Relative image paths are resolved from the presentation's folder.`);
      }
      throw new Error(`Cannot read image ${path}: ${error instanceof Error ? error.message : String(error)}`);
    }
    return `data:${mime};base64,${bytes.toString('base64')}`;
  }));
  await images.evaluateAll(async (elements, replacements) => {
    const images = elements as HTMLImageElement[];
    await Promise.all(images.map(async (image, index) => {
      if (replacements[index] === null) return;
      // The converter reloads images with anonymous CORS; preflight the same contract.
      image.removeAttribute('srcset');
      const picture = image.closest('picture');
      picture?.querySelectorAll('source').forEach(source => source.remove());
      image.src = replacements[index]!;
      const probe = new Image();
      probe.crossOrigin = 'anonymous';
      probe.src = image.src;
      try {
        await probe.decode();
        await image.decode();
      } catch {
        throw new Error(`Image cannot be exported. Check its format, availability, and CORS headers: ${image.alt || images.indexOf(image) + 1}`);
      }
    }));
  }, replacements);
}

/** Wait for a studio `/render` frame to finish drawing; its failure reason becomes the export error. */
async function waitForStudioFrame(frameElement: ElementHandle, slide: number, timeout: number): Promise<void> {
  const frame = await frameElement.contentFrame();
  const source = await frameElement.getAttribute('src');
  if (!frame) throw new Error(`Slide ${slide}: the background frame did not load: ${source}`);
  const published = await frame.waitForFunction(() => 'bgRender' in window, undefined, { timeout })
    .then(() => true, () => false);
  if (!published) {
    throw new Error(`Slide ${slide}: ${new URL(source ?? '').origin} did not provide the studio render page. `
      + 'Check the share link and that this studio version serves /render.');
  }
  const failure = await frame.evaluate(async () => {
    const render = (window as unknown as { bgRender: { version: number; ready: Promise<void> } }).bgRender;
    if (render.version !== 1) return `unsupported render page version ${render.version}`;
    try {
      await render.ready;
      return undefined;
    } catch (error) {
      const { code, message } = error as { code?: string; message?: string };
      return `${code ?? 'error'}: ${message ?? String(error)}`;
    }
  });
  if (failure) throw new Error(`Slide ${slide}: the studio could not draw the background (${failure}).`);
}

/**
 * Capture every slide's `[data-pptx-background]` layer as a PNG of the slide (its own color included),
 * then remove the layer and the slide color so the converter emits neither. Slides without a layer get `undefined`.
 */
async function captureBackgrounds(page: Page, selector: string, timeout: number): Promise<Array<Buffer | undefined>> {
  const slides = await page.locator(selector).all();
  const layers = await Promise.all(slides.map(slide => slide.locator(':scope > [data-pptx-background]').count()));
  if (!layers.some(count => count > 0)) return slides.map(() => undefined);
  const hide = await page.addStyleTag({
    content: `:is(${selector}) > :not([data-pptx-background]) { visibility: hidden !important; }`,
  });
  const captured: Array<Buffer | undefined> = [];
  // Slides sit at different page offsets, so identical backgrounds can differ by anti-aliasing;
  // reuse the first capture of the same layer on the same slide color so PowerPoint stores it once.
  const byLayer = new Map<string, Buffer>();
  for (const [index, slide] of slides.entries()) {
    if (layers[index] === 0) {
      captured.push(undefined);
      continue;
    }
    const key = await slide.evaluate(element =>
      `${getComputedStyle(element).backgroundColor}\n${element.querySelector(':scope > [data-pptx-background]')!.outerHTML}`);
    const previous = byLayer.get(key);
    if (previous) {
      captured.push(previous);
      continue;
    }
    // Chromium pauses animation frames in cross-origin frames that are out of view.
    await slide.scrollIntoViewIfNeeded();
    for (const frame of await slide.locator(':scope > [data-pptx-background] iframe').elementHandles()) {
      await waitForStudioFrame(frame, index + 1, timeout);
    }
    const image = await slide.screenshot({ type: 'png', animations: 'disabled' });
    byLayer.set(key, image);
    captured.push(image);
  }
  await hide.evaluate(element => (element as Element).remove());
  await page.locator(selector).evaluateAll(elements => {
    for (const slide of elements as HTMLElement[]) {
      const layer = slide.querySelector(':scope > [data-pptx-background]');
      if (!layer) continue;
      layer.remove();
      slide.style.setProperty('background', 'transparent', 'important');
    }
  });
  return captured;
}

/** Export a JSON file, HTML file, or trusted HTTP(S) presentation URL. */
export async function exportPresentation(input: string, options: ExportOptions): Promise<ValidationIssue[]> {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-'));
  let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined;
  try {
    let url: string;
    let metadata = options.metadata ?? {};
    if (/^https?:\/\//i.test(input)) {
      url = new URL(input).href;
    } else if (extname(input).toLowerCase() === '.json') {
      const file = resolve(input);
      const loaded = await loadPresentation(file);
      const html = renderPresentation(loaded.content, fileRenderOptions(file, loaded));
      const temporary = join(directory, 'presentation.html');
      await writeFile(temporary, html);
      url = pathToFileURL(temporary).href;
    } else {
      url = pathToFileURL(resolve(input)).href;
    }
    browser = await chromium.launch();
    const page = await browser.newPage({
      viewport: { width: SLIDE_SIZE.widthPx, height: SLIDE_SIZE.heightPx },
      deviceScaleFactor: 1,
    });
    page.setDefaultTimeout(options.timeout ?? 60_000);
    const selector = options.selector ?? '[data-pptx="slide"], .slide';
    const fetcher = new RemoteImageFetcher(options.remoteImages);
    const blocked = fetcher.options.blockPrivateNetwork ? await blockPrivateRequests(page) : [];
    const failBlocked = () => {
      if (blocked.length) {
        throw new Error(`Blocked requests to non-public addresses: ${[...new Set(blocked)].join(', ')}`);
      }
    };
    try {
      await page.goto(url, { waitUntil: 'load' });
    } catch (error) {
      failBlocked();
      throw error;
    }
    await prepareImages(page, selector, fetcher);
    await waitForAssets(page);
    failBlocked();
    const issues = await validateLayout(page, { selector });
    if (options.validate !== false && issues.some(issue => issue.severity === 'error')) {
      throw new Error(`Layout validation failed:\n${issues.map(issue => issue.message).join('\n')}`);
    }
    const documentMetadata = await page.evaluate(() => {
      const meta = (name: string) => document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
      return { title: document.title, author: meta('author'), subject: meta('subject'), lang: document.documentElement.lang };
    });
    metadata = { ...documentMetadata, ...metadata };
    const backgrounds = await captureBackgrounds(page, selector, options.timeout ?? 60_000);
    // After layout validation, which would report the placeholder fonts as unavailable.
    const outlines = await markTextOutlines(page, selector);
    await page.addScriptTag({ path: fileURLToPath(new URL('./engine.js', import.meta.url)) });
    const base64 = await page.evaluate(async ({ selector, size }) => {
      const engine = (window as unknown as {
        SlideForgeEngine: { convert(selector: string, width: number, height: number): Promise<string> };
      }).SlideForgeEngine;
      return engine.convert(selector, size.widthInches, size.heightInches);
    }, { selector, size: SLIDE_SIZE });
    const converted = applyTextOutlines(Buffer.from(base64, 'base64'), outlines);
    const fitted = options.textSlack === false ? converted : widenTextBoxes(converted, options.textSlack);
    const data = applyMetadata(applyBackgrounds(applyEastAsianFont(fitted, options.eastAsianFont), backgrounds), metadata);
    const report = validatePptx(data);
    if (!report.valid) throw new Error(`Invalid generated PPTX: ${report.issues.map(issue => issue.message).join('; ')}`);
    await writeFile(resolve(options.output), data);
    return issues;
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}
