import { execFile } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validatePptx } from '../../src/validators/pptx.js';
import { layoutFamilies } from '../../src/layouts/registry.js';
import { exportPresentation, previewPresentation } from '../../dist/index.js';

const exec = promisify(execFile);
const cli = resolve('dist/cli/index.js');
let directory: string;
beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), 'slideforge-test-')); });
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

describe('built CLI', () => {
  it('initializes without overwriting existing content, builds and exports an editable slide per family', async () => {
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
    expect(report.slideCount).toBe(layoutFamilies.length);
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

  it('exports every cover variant without layout issues and with the same editable text', async () => {
    const output = join(directory, 'variants.pptx');
    const issues = await exportPresentation(resolve('examples/variants/presentation.json'), { output });
    expect(issues.filter(issue => issue.rule !== 'layout.fonts')).toEqual([]);
    const files = unzipSync(await readFile(output));
    const slides = [1, 2, 3, 4].map(index => strFromU8(files[`ppt/slides/slide${index}.xml`]!));
    const texts = slides.map(xml => (xml.match(/<a:t>[^<]+<\/a:t>/g) ?? []).length);
    expect(new Set(texts).size).toBe(1);
    const shapes = slides.map(xml => (xml.match(/<p:sp>/g) ?? []).length);
    // split's panel and band's header block are one shape each.
    expect([shapes[2]! - shapes[0]!, shapes[3]! - shapes[0]!]).toEqual([1, 1]);
    expect(shapes[1]).toBe(shapes[0]);
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

/**
 * A stand-in for the studio's /render page: it publishes `window.bgRender`, fills the window with the
 * colour named in `#d=`, and rejects `ready` for `#d=fail`, as the real page does for a broken link.
 */
const renderPage = `<!doctype html><html><body style="margin:0"><canvas></canvas><script>
const d = new URLSearchParams(location.hash.slice(1)).get('d');
window.bgRender = { version: 1, ready: (async () => {
  if (d === 'fail') throw Object.assign(new Error('the share link is broken'), { code: 'broken' });
  while (!innerWidth) await new Promise(resolve => setTimeout(resolve, 20));
  const canvas = document.querySelector('canvas');
  canvas.width = innerWidth; canvas.height = innerHeight;
  const context = canvas.getContext('2d');
  context.fillStyle = '#' + d; context.fillRect(0, 0, innerWidth, innerHeight);
  await new Promise(requestAnimationFrame);
})() };
</script></body></html>`;

describe('slide backgrounds', () => {
  let studio: Server;
  let origin: string;
  let serveRender = true;
  beforeAll(async () => {
    studio = createServer((request, response) => {
      if (serveRender && request.url === '/render') response.writeHead(200, { 'Content-Type': 'text/html' }).end(renderPage);
      else response.writeHead(404).end('Not found');
    });
    await new Promise<void>(resolve => studio.listen(0, '127.0.0.1', resolve));
    const address = studio.address();
    if (!address || typeof address === 'string') throw new Error('No test server port');
    origin = `http://127.0.0.1:${address.port}`;
  });
  afterAll(async () => { await new Promise(resolve => studio.close(resolve)); });

  async function deck(name: string, content: object): Promise<string> {
    const path = join(directory, `${name}.json`);
    await writeFile(path, JSON.stringify({ metadata: { title: name }, ...content }));
    return path;
  }

  it('exports images and studio links as PowerPoint slide backgrounds', async () => {
    await writeFile(join(directory, 'stripes.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#cde"/></svg>');
    const input = await deck('backgrounds', {
      backgrounds: { default: 'stripes.svg', cards: `${origin}/studio#d=88aaee` },
      slides: [
        { layout: 'cover', title: 'Image default' },
        { layout: 'cards', title: 'Studio by layout', cards: [{ title: 'A', blocks: [{ type: 'paragraph', text: 'B' }] }] },
        { layout: 'cover', title: 'Own studio link', background: `${origin}/studio#d=ffcc88` },
        { layout: 'cover', title: 'Plain', background: 'none' },
        { layout: 'content', title: 'Image again', blocks: [{ type: 'paragraph', text: 'Body' }] },
      ],
    });
    const output = join(directory, 'backgrounds.pptx');
    // Background layers are not overlap candidates, so the deck exports without warnings.
    expect(await exportPresentation(input, { output })).toEqual([]);
    const data = await readFile(output);
    const report = validatePptx(data);
    expect(report.valid, JSON.stringify(report.issues)).toBe(true);
    expect(report.slideCount).toBe(5);
    const files = unzipSync(data);
    const slides = [1, 2, 3, 4, 5].map(n => strFromU8(files[`ppt/slides/slide${n}.xml`]!));
    expect(slides.map(xml => xml.includes('r:embed="rIdSlideForgeBackground"'))).toEqual([true, true, true, false, true]);
    // Pictures are not added as shapes, and the image default used twice is stored once.
    expect(slides.some(xml => xml.includes('<p:pic>'))).toBe(false);
    const media = Object.keys(files).filter(path => /^ppt\/media\/slideforge-background-[0-9a-f]+\.png$/.test(path));
    expect(media).toHaveLength(3);
    for (const path of media) {
      const view = new DataView(files[path]!.buffer, files[path]!.byteOffset);
      expect([view.getUint32(16), view.getUint32(20)]).toEqual([1920, 1080]);
    }
    const target = (n: number) => /Id="rIdSlideForgeBackground"[^>]*Target="([^"]+)"/.exec(strFromU8(files[`ppt/slides/_rels/slide${n}.xml.rels`]!))?.[1];
    expect(target(1)).toBeDefined();
    expect(target(5)).toBe(target(1));
    expect(target(2)).not.toBe(target(1));
  }, 180_000);

  it('fails with the studio reason when a link cannot be drawn', async () => {
    const input = await deck('broken', { slides: [{ layout: 'cover', title: 'Broken', background: `${origin}/studio#d=fail` }] });
    await expect(exportPresentation(input, { output: join(directory, 'broken.pptx') }))
      .rejects.toThrow('Slide 1: the studio could not draw the background (broken: the share link is broken).');
  }, 120_000);

  it('fails clearly when the studio host has no render page', async () => {
    const input = await deck('missing', { slides: [{ layout: 'cover', title: 'Missing', background: `${origin}/studio#d=missing` }] });
    serveRender = false;
    try {
      await expect(exportPresentation(input, { output: join(directory, 'missing.pptx'), timeout: 3000 }))
        .rejects.toThrow('did not provide the studio render page');
    } finally {
      serveRender = true;
    }
  }, 120_000);
});

describe('templates', () => {
  const backgroundCount = (data: Uint8Array) => Object.entries(unzipSync(data))
    .filter(([path, content]) => /^ppt\/slides\/slide\d+\.xml$/.test(path) && /<p:bg><p:bgPr><a:blipFill/.test(strFromU8(content)))
    .length;

  it('initializes, builds, and exports a deck with a built-in template', async () => {
    const input = join(directory, 'corporate.json');
    const pptx = join(directory, 'corporate.pptx');
    await exec(process.execPath, [cli, 'init', input, '--template', 'corporate']);
    expect(JSON.parse(await readFile(input, 'utf8')).template).toBe('corporate');
    await exec(process.execPath, [cli, 'build', input, '--output', join(directory, 'corporate.html')]);
    const html = await readFile(join(directory, 'corporate.html'), 'utf8');
    expect(html).toContain('--sf-accent:#b45309');
    expect(html).toContain('sf-layout-cover sf-variant-band');
    expect(html).toContain(`${pathToFileURL(resolve('templates/corporate/assets/rule.svg')).href}`);
    await exec(process.execPath, [cli, 'export', input, '--output', pptx], { timeout: 120_000 });
    const data = await readFile(pptx);
    expect(validatePptx(data).valid).toBe(true);
    expect(backgroundCount(data)).toBe(layoutFamilies.length);

    await expect(exec(process.execPath, [cli, 'init', join(directory, 'unknown.json'), '--template', 'nope']))
      .rejects.toMatchObject({ code: 1, stderr: expect.stringContaining('Unknown template "nope". Use "corporate" or "default"') });
    await expect(readFile(join(directory, 'unknown.json'))).rejects.toMatchObject({ code: 'ENOENT' });

    const nested = join(directory, 'new', 'folder', 'deck.json');
    await exec(process.execPath, [cli, 'init', nested, '--template', 'corporate']);
    expect(JSON.parse(await readFile(nested, 'utf8')).template).toBe('corporate');
    expect(await readFile(join(directory, 'new', 'folder', 'deck-assets', 'diagram.svg'), 'utf8')).toContain('<svg');
    await expect(exec(process.execPath, [cli, 'init', nested]))
      .rejects.toMatchObject({ code: 1, stderr: expect.stringContaining(`${nested} already exists; init never overwrites a file`) });
    await expect(exec(process.execPath, [cli, 'build', input, '--template', 'corporate'])).rejects.toMatchObject({ code: 2 });
  }, 180_000);

  it('exports examples/templates with its own template and with each built-in one', async () => {
    const example = resolve('examples/templates/presentation.json');
    const content = JSON.parse(await readFile(example, 'utf8'));
    expect(content.template).toBe('./brand');
    for (const template of ['./brand', 'corporate', 'default']) {
      const input = template === './brand' ? example : join(directory, `templates-${template}.json`);
      if (input !== example) await writeFile(input, JSON.stringify({ ...content, template }));
      const output = join(directory, `templates-${template.replace(/\W/g, '')}.pptx`);
      expect((await exportPresentation(input, { output })).filter(issue => issue.rule !== 'layout.fonts'), template).toEqual([]);
      const data = await readFile(output);
      expect(validatePptx(data).slideCount).toBe(content.slides.length);
      expect(backgroundCount(data)).toBe(template === 'default' ? 0 : content.slides.length);
    }
  }, 300_000);

  it('exports and previews a local template whose assets live beside it', async () => {
    const brand = join(directory, 'brand');
    await mkdir(join(brand, 'assets'), { recursive: true });
    await writeFile(join(brand, 'template.json'), JSON.stringify({
      name: 'brand', palette: { light: { accent: '#0f766e' } }, backgrounds: { default: 'assets/corner.svg' }, variants: { cover: 'split' },
    }));
    await writeFile(join(brand, 'assets', 'corner.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="60" height="60" fill="#0f766e"/></svg>');
    await writeFile(join(directory, 'secret.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    await mkdir(join(directory, 'decks'), { recursive: true });
    const input = join(directory, 'decks', 'brand.json');
    await writeFile(input, JSON.stringify({
      metadata: { title: 'Brand' }, template: '../brand',
      slides: [{ layout: 'cover', title: 'Brand cover' }, { layout: 'content', title: 'Body', blocks: [{ type: 'paragraph', text: 'Text' }] }],
    }));
    const output = join(directory, 'brand.pptx');
    expect((await exportPresentation(input, { output })).filter(issue => issue.rule !== 'layout.fonts')).toEqual([]);
    expect(backgroundCount(await readFile(output))).toBe(2);

    const server = await previewPresentation(input, 0);
    try {
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Preview did not bind a TCP port');
      const origin = `http://127.0.0.1:${address.port}`;
      const page = await (await fetch(`${origin}/`)).text();
      expect(page).toContain(`src="${origin}/@slideforge/template/assets/corner.svg"`);
      expect(page).toContain('sf-variant-split');
      const asset = await fetch(`${origin}/@slideforge/template/assets/corner.svg`);
      expect(asset.status).toBe(200);
      expect(asset.headers.get('content-type')).toBe('image/svg+xml');
      expect((await fetch(`${origin}/@slideforge/template/..%2Fsecret.svg`)).status).toBe(404);
      expect((await fetch(`${origin}/@slideforge/template/template.json`)).status).toBe(404);
    } finally {
      await server.close();
    }
  }, 180_000);

  it('exports title-outline as a PowerPoint text outline and keeps unstroked text plain', async () => {
    await mkdir(join(directory, 'outlined'), { recursive: true });
    await writeFile(join(directory, 'outlined', 'template.json'), JSON.stringify({
      name: 'outlined', palette: { light: { outline: '#0b1f3a' } }, tokens: { border: { 'title-outline': 4 } },
    }));
    const input = join(directory, 'outlined.json');
    await writeFile(input, JSON.stringify({
      metadata: { title: 'Outlined' }, template: './outlined',
      slides: [{ layout: 'content', title: 'Outlined 標題', blocks: [{ type: 'paragraph', text: 'Plain body' }] }],
    }));
    const output = join(directory, 'outlined.pptx');
    expect((await exportPresentation(input, { output })).filter(issue => issue.rule !== 'layout.fonts')).toEqual([]);
    const slide = strFromU8(unzipSync(await readFile(output))['ppt/slides/slide1.xml']!);
    const runs = (slide.match(/<a:r>[\s\S]*?<\/a:r>/g) ?? []);
    const title = runs.find(run => run.includes('Outlined 標題'))!;
    // 4 CSS px is 2 pt: 25400 EMU.
    expect(title).toMatch(/<a:rPr [^>]*><a:ln w="25400"><a:solidFill><a:srgbClr val="0B1F3A"\/><\/a:solidFill><\/a:ln>/);
    expect(title).toContain('<a:latin typeface="Arial"');
    expect(title).toContain('<a:ea typeface="Microsoft JhengHei"');
    expect(runs.find(run => run.includes('Plain body'))).not.toContain('<a:ln');
    expect(slide).not.toContain('slideforge-outline-');

    const html = join(directory, 'stroked.html');
    await writeFile(html, `<html><body style="margin:0;font-family:Arial">
      <section data-pptx="slide" style="width:1920px;height:1080px">
      <h1 style="-webkit-text-stroke:2px rgba(255,0,0,0.5)">Stroked <span style="-webkit-text-stroke-width:0">plain</span></h1>
      </section></body></html>`);
    const stroked = join(directory, 'stroked.pptx');
    expect(await exportPresentation(html, { output: stroked })).toEqual([]);
    const xml = strFromU8(unzipSync(await readFile(stroked))['ppt/slides/slide1.xml']!);
    const parts = xml.match(/<a:r>[\s\S]*?<\/a:r>/g) ?? [];
    expect(parts.find(run => run.includes('Stroked'))).toContain('<a:ln w="12700"><a:solidFill><a:srgbClr val="FF0000"><a:alpha val="50000"/>');
    expect(parts.find(run => run.includes('plain'))).not.toContain('<a:ln');
    expect(xml).not.toContain('slideforge-outline-');
  }, 180_000);
});
