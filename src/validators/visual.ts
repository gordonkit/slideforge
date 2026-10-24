import { execFile } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';
import { SLIDE_SIZE } from '../themes/tokens.js';
import { waitForAssets } from '../exporters/pptx.js';

/** Capture source slides at their actual CSS size, without preview scaling. */
export async function captureSourceSlides(input: string, outputDirectory: string): Promise<string[]> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: SLIDE_SIZE.widthPx, height: SLIDE_SIZE.heightPx },
      deviceScaleFactor: 1,
    });
    await page.goto(/^https?:\/\//i.test(input) ? input : pathToFileURL(resolve(input)).href);
    await waitForAssets(page);
    const slides = page.locator('[data-pptx="slide"], .slide');
    const count = await slides.count();
    if (!count) throw new Error('No source slides found');
    await mkdir(outputDirectory, { recursive: true });
    const paths: string[] = [];
    for (let index = 0; index < count; index++) {
      const path = join(outputDirectory, `slide-${index + 1}.png`);
      await slides.nth(index).screenshot({ path, animations: 'disabled' });
      paths.push(path);
    }
    return paths;
  } finally {
    await browser.close();
  }
}

export interface VisualDifferenceReport {
  width: number;
  height: number;
  changedPixels: number;
  totalPixels: number;
  differenceRatio: number;
  diffImage: string;
  classification: 'rendering-difference';
}

/** Optional system renderer, kept separate from structural validation and conversion. */
export async function renderPptxSlides(input: string, outputDirectory: string): Promise<string[]> {
  const temporary = await mkdtemp(join(tmpdir(), 'slideforge-render-'));
  const exec = promisify(execFile);
  try {
    await mkdir(outputDirectory, { recursive: true });
    await exec('libreoffice', [
      `-env:UserInstallation=${pathToFileURL(join(temporary, 'profile')).href}`,
      '--headless', '--convert-to', 'pdf', '--outdir', temporary, resolve(input),
    ], { timeout: 120_000 });
    const pdf = join(temporary, `${basename(input).replace(/\.pptx$/i, '')}.pdf`);
    await exec('pdftoppm', [
      '-png', '-scale-to-x', String(SLIDE_SIZE.widthPx),
      '-scale-to-y', String(SLIDE_SIZE.heightPx), pdf, join(temporary, 'rendered'),
    ], { timeout: 120_000 });
    const names = (await readdir(temporary)).filter(name => /^rendered-\d+\.png$/.test(name))
      .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
    if (!names.length) throw new Error('Renderer produced no slide images');
    return await Promise.all(names.map(async name => {
      const output = resolve(outputDirectory, name);
      await copyFile(join(temporary, name), output);
      return output;
    }));
  } catch (error) {
    throw new Error('PPTX rendering requires compatible LibreOffice Impress and Poppler (pdftoppm). '
      + 'Install them or supply independently rendered PNGs to compareSlideImages.', { cause: error });
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

/** Generate an independently rendered, per-slide visual difference report. */
export async function comparePresentation(
  sourceHtml: string,
  pptx: string,
  outputDirectory: string,
): Promise<VisualDifferenceReport[]> {
  const source = await captureSourceSlides(sourceHtml, join(outputDirectory, 'source'));
  const rendered = await renderPptxSlides(pptx, join(outputDirectory, 'pptx'));
  if (source.length !== rendered.length) throw new Error('Source and rendered PPTX slide counts differ');
  const reports: VisualDifferenceReport[] = [];
  for (let index = 0; index < source.length; index++) {
    reports.push(await compareSlideImages(source[index]!, rendered[index]!, join(outputDirectory, `slide-${index + 1}.json`)));
  }
  return reports;
}

/** Compare source PNG with an independently rendered PPTX PNG at identical dimensions.
 * Pixel changes are rendering differences, not evidence of structural defects.
 */
export async function compareSlideImages(
  sourcePng: string,
  pptxRenderedPng: string,
  outputReportJson: string,
  channelTolerance = 16,
): Promise<VisualDifferenceReport> {
  if (!Number.isInteger(channelTolerance) || channelTolerance < 0 || channelTolerance > 255) {
    throw new Error('Pixel channel tolerance must be an integer from 0 to 255');
  }
  const [source, rendered] = await Promise.all([readFile(sourcePng), readFile(pptxRenderedPng)]);
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const comparison = await page.evaluate(async ({ source, rendered, tolerance }) => {
      async function load(base64: string) {
        const image = new Image();
        image.src = `data:image/png;base64,${base64}`;
        await image.decode();
        return image;
      }
      const [left, right] = await Promise.all([load(source), load(rendered)]);
      if (left.width !== right.width || left.height !== right.height) {
        throw new Error('Rendered PNG dimensions differ; render at the source resolution before comparison');
      }
      if (left.width * left.height > 20_000_000) throw new Error('Comparison image is too large');
      const canvas = document.createElement('canvas');
      canvas.width = left.width;
      canvas.height = left.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(left, 0, 0);
      const original = context.getImageData(0, 0, left.width, left.height);
      context.clearRect(0, 0, left.width, left.height);
      context.drawImage(right, 0, 0);
      const result = context.getImageData(0, 0, left.width, left.height);
      let changedPixels = 0;
      for (let offset = 0; offset < result.data.length; offset += 4) {
        const changed = [0, 1, 2, 3].some(channel =>
          Math.abs(original.data[offset + channel]! - result.data[offset + channel]!) > tolerance);
        if (changed) changedPixels++;
        result.data[offset] = 255;
        result.data[offset + 1] = changed ? 0 : 255;
        result.data[offset + 2] = changed ? 0 : 255;
        result.data[offset + 3] = 255;
      }
      context.putImageData(result, 0, 0);
      return {
        width: left.width, height: left.height, changedPixels,
        totalPixels: left.width * left.height,
        differenceRatio: changedPixels / (left.width * left.height),
        png: canvas.toDataURL('image/png').split(',')[1]!,
      };
    }, { source: source.toString('base64'), rendered: rendered.toString('base64'), tolerance: channelTolerance });
    const diffImage = resolve(`${outputReportJson}.diff.png`);
    const { png, ...metrics } = comparison;
    const report: VisualDifferenceReport = { ...metrics, diffImage, classification: 'rendering-difference' };
    await writeFile(diffImage, Buffer.from(png, 'base64'));
    await writeFile(outputReportJson, JSON.stringify(report, null, 2) + '\n');
    return report;
  } finally {
    await browser.close();
  }
}
