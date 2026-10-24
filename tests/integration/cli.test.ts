import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validatePptx } from '../../src/validators/pptx.js';
import { exportPresentation, previewPresentation } from '../../dist/index.js';

const exec = promisify(execFile);
const cli = resolve('dist/cli/index.js');
let directory: string;
beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), 'slideforge-test-')); });
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

describe('built CLI', () => {
  it('initializes without overwriting existing content, builds and exports six editable slides', async () => {
    const input = join(directory, 'presentation.json');
    const html = join(directory, 'presentation.html');
    const pptx = join(directory, 'presentation.pptx');
    await exec(process.execPath, [cli, 'init', input]);
    await expect(exec(process.execPath, [cli, 'init', input])).rejects.toMatchObject({ code: 1 });
    await exec(process.execPath, [cli, 'build', input, '--output', html]);
    expect(await readFile(html, 'utf8')).toContain('data-pptx="slide"');
    expect(await readFile(join(directory, 'presentation-assets/diagram.svg'), 'utf8')).toContain('<svg');
    await exec(process.execPath, [cli, 'export', input, '--output', pptx], { timeout: 120_000 });
    const data = await readFile(pptx);
    const report = validatePptx(data);
    expect(report.valid, JSON.stringify(report.issues)).toBe(true);
    expect(report.slideCount).toBe(6);
    expect(report.editableTextCount).toBeGreaterThan(12);
    expect(report.shapeCount).toBeGreaterThan(12);
    const files = unzipSync(data);
    const slideXml = Object.entries(files).filter(([path]) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
      .map(([, content]) => strFromU8(content)).join('');
    expect(slideXml.includes('可編輯的文字與圖形')).toBe(true);
    expect((slideXml.match(/<p:pic>/g) ?? []).length).toBeGreaterThanOrEqual(1);
    expect(strFromU8(files['docProps/core.xml']!)).toContain('SlideForge — Present ideas clearly');
    expect(Object.keys(files).some(path => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path))).toBe(true);
    const validation = await exec(process.execPath, [cli, 'validate', pptx]);
    expect(JSON.parse(validation.stdout).valid).toBe(true);
  }, 180_000);

  it('documents the default preview port in help', async () => {
    expect((await exec(process.execPath, [cli, '--help'])).stdout).toContain('slideforge preview presentation.json [--port 5180]');
  });

  it('returns meaningful usage and validation exit codes', async () => {
    await expect(exec(process.execPath, [cli, 'unknown'])).rejects.toMatchObject({ code: 2 });
    await expect(exec(process.execPath, [cli, 'export', 'input.json'])).rejects.toMatchObject({ code: 2 });
    const invalid = join(directory, 'invalid.pptx');
    await writeFile(invalid, 'not a presentation');
    await expect(exec(process.execPath, [cli, 'validate', invalid])).rejects.toMatchObject({ code: 1 });
  }, 60_000);

  it('initializes paths with spaces and does not leave JSON after an asset collision', async () => {
    const input = join(directory, 'my deck.json');
    await exec(process.execPath, [cli, 'init', input]);
    expect(await readFile(input, 'utf8')).toContain('my%20deck-assets/diagram.svg');
    await rm(input);
    await expect(exec(process.execPath, [cli, 'init', input])).rejects.toMatchObject({ code: 1 });
    await expect(readFile(input)).rejects.toMatchObject({ code: 'ENOENT' });
    expect(await readFile(join(directory, 'my deck-assets/diagram.svg'), 'utf8')).toContain('<svg');
  }, 60_000);

  it('explains schema errors and missing images in plain words', async () => {
    const invalid = join(directory, 'mismatch.json');
    await writeFile(invalid, JSON.stringify({
      metadata: { title: 'Mismatch' },
      slides: [{ layout: 'table', title: 'Table', columns: ['A', 'B'], rows: [['1']] }],
    }));
    await expect(exec(process.execPath, [cli, 'build', invalid, '--output', join(directory, 'mismatch.html')]))
      .rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('slides[0].rows[0] (slide 1): Every row must have one cell per column') });

    const html = join(directory, 'missing-image.html');
    await writeFile(html, `<html><body style="margin:0"><section data-pptx="slide" style="width:1920px;height:1080px">
      <img src="no-such-image.png" alt="Missing" style="width:200px;height:100px"></section></body></html>`);
    await expect(exportPresentation(html, { output: join(directory, 'missing-image.pptx') }))
      .rejects.toThrow(`Image not found: ${join(directory, 'no-such-image.png')}. Relative image paths are resolved from the presentation's folder.`);
  }, 120_000);

  it('exports HTML while ignoring non-rendered images', async () => {
    const html = join(directory, 'hidden-image.html');
    const output = join(directory, 'hidden-image.pptx');
    await writeFile(html, `<html><body style="margin:0;font-family:Arial">
      <section data-pptx="slide" style="width:1920px;height:1080px">
      <h1>Visible content</h1><div hidden><img src="missing-hidden-image.png"></div>
      </section></body></html>`);
    expect(await exportPresentation(html, { output })).toEqual([]);
    expect(validatePptx(await readFile(output)).editableTextCount).toBe(1);
  }, 120_000);

  it('previews and exports a rendered presentation URL through the public API', async () => {
    const input = join(directory, 'url-presentation.json');
    await writeFile(input, JSON.stringify({
      metadata: { title: 'URL export', author: 'API test' },
      theme: 'dark',
      slides: [{ layout: 'content', title: 'Editable via URL', blocks: [{ type: 'paragraph', text: 'API workflow' }] }],
    }));
    const server = await previewPresentation(input, 0);
    try {
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Preview did not bind a TCP port');
      const url = `http://127.0.0.1:${address.port}/`;
      const response = await fetch(url);
      expect(response.ok).toBe(true);
      expect(await response.text()).toContain('data-theme="dark"');
      const output = join(directory, 'url.pptx');
      expect(await exportPresentation(url, { output })).toEqual([]);
      expect(validatePptx(await readFile(output)).slideCount).toBe(1);
    } finally {
      await server.close();
    }
  }, 120_000);

  it('reloads the preview when the JSON changes, including after invalid edits', async () => {
    const input = join(directory, 'live.json');
    const deck = (title: string) => JSON.stringify({
      metadata: { title: 'Live reload' },
      slides: [{ layout: 'content', title, blocks: [{ type: 'paragraph', text: 'Body' }] }],
    });
    const titleIs = (title: string) => `document.querySelector('.sf-slide h1')?.textContent === ${JSON.stringify(title)}`;
    await writeFile(input, deck('First title'));
    const server = await previewPresentation(input, 0);
    const browser = await chromium.launch();
    try {
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Preview did not bind a TCP port');
      const page = await browser.newPage();
      const connected = () => page.waitForEvent('console', message => message.text().includes('[vite] connected'));
      let ready = connected();
      await page.goto(`http://127.0.0.1:${address.port}/`);
      await ready;
      await page.waitForFunction(titleIs('First title'));

      ready = connected();
      await writeFile(input, '{ "metadata": ');
      await page.waitForFunction(() => document.title === 'Invalid presentation');
      await ready;

      await writeFile(input, deck('Second title'));
      await page.waitForFunction(titleIs('Second title'));
    } finally {
      await browser.close();
      await server.close();
    }
  }, 60_000);
});
