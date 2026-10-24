import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { compareSlideImages } from '../../src/validators/visual.js';

it('measures PNG differences and rejects mismatched dimensions', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-visual-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 100, height: 100 } });
    await page.setContent('<style>body{margin:0;background:white}</style>');
    const source = join(directory, 'source.png');
    const rendered = join(directory, 'rendered.png');
    await page.screenshot({ path: source });
    const equal = await compareSlideImages(source, source, join(directory, 'equal.json'));
    expect(equal.differenceRatio).toBe(0);
    await page.setContent('<style>body{margin:0;background:red}</style>');
    await page.screenshot({ path: rendered });
    const different = await compareSlideImages(source, rendered, join(directory, 'diff.json'));
    expect(different.differenceRatio).toBe(1);
    expect(different.classification).toBe('rendering-difference');
    expect(JSON.parse(await readFile(join(directory, 'diff.json'), 'utf8')).changedPixels).toBe(10_000);
    await page.setViewportSize({ width: 50, height: 50 });
    await page.screenshot({ path: rendered });
    await expect(compareSlideImages(source, rendered, join(directory, 'invalid.json'))).rejects.toThrow('dimensions');
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
