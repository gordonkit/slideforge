import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium, type Page } from 'playwright';
import { renderPresentation } from '../renderers/html.js';
import { readPresentationFile } from '../schemas/input.js';
import { applyMetadata, type PresentationMetadata } from './metadata.js';
import { widenTextBoxes, type TextSlack } from './text-fit.js';
import { applyEastAsianFont } from './fonts.js';
import { validateLayout, type ValidationIssue } from '../validators/layout.js';
import { validatePptx } from '../validators/pptx.js';
import { SLIDE_SIZE } from '../themes/tokens.js';

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
}

export async function waitForAssets(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(Array.from(document.images, image =>
      image.decode().catch(() => undefined)));
  });
}

async function prepareImages(page: Page, selector: string): Promise<void> {
  const images = page.locator(selector).locator('img');
  const sources = await images.evaluateAll(elements =>
    (elements as HTMLImageElement[]).map(image => {
      const bounds = image.getBoundingClientRect();
      return image.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })
        && bounds.width > 0 && bounds.height > 0 ? image.currentSrc || image.src : null;
    }));
  const replacements = await Promise.all(sources.map(async source => {
    if (source === null) return null;
    if (!source.startsWith('file:')) return source;
    const path = fileURLToPath(source);
    const mime = new Map([
      ['.svg', 'image/svg+xml'], ['.png', 'image/png'], ['.jpg', 'image/jpeg'],
      ['.jpeg', 'image/jpeg'], ['.gif', 'image/gif'], ['.webp', 'image/webp'], ['.avif', 'image/avif'],
    ]).get(extname(path).toLowerCase());
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
      const content = await readPresentationFile(file);
      const html = renderPresentation(content, {
        baseUrl: pathToFileURL(dirname(file) + '/').href,
      });
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
    await page.goto(url, { waitUntil: 'load' });
    await prepareImages(page, selector);
    await waitForAssets(page);
    const issues = await validateLayout(page, { selector });
    if (options.validate !== false && issues.some(issue => issue.severity === 'error')) {
      throw new Error(`Layout validation failed:\n${issues.map(issue => issue.message).join('\n')}`);
    }
    const documentMetadata = await page.evaluate(() => {
      const meta = (name: string) => document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)?.content;
      return { title: document.title, author: meta('author'), subject: meta('subject'), lang: document.documentElement.lang };
    });
    metadata = { ...documentMetadata, ...metadata };
    await page.addScriptTag({ path: fileURLToPath(new URL('./engine.js', import.meta.url)) });
    const base64 = await page.evaluate(async ({ selector, size }) => {
      const engine = (window as unknown as {
        SlideForgeEngine: { convert(selector: string, width: number, height: number): Promise<string> };
      }).SlideForgeEngine;
      return engine.convert(selector, size.widthInches, size.heightInches);
    }, { selector, size: SLIDE_SIZE });
    const converted = Buffer.from(base64, 'base64');
    const fitted = options.textSlack === false ? converted : widenTextBoxes(converted, options.textSlack);
    const data = applyMetadata(applyEastAsianFont(fitted, options.eastAsianFont), metadata);
    const report = validatePptx(data);
    if (!report.valid) throw new Error(`Invalid generated PPTX: ${report.issues.map(issue => issue.message).join('; ')}`);
    await writeFile(resolve(options.output), data);
    return issues;
  } finally {
    await browser?.close();
    await rm(directory, { recursive: true, force: true });
  }
}
