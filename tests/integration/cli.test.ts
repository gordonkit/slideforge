import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { strFromU8, unzipSync } from 'fflate';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { validatePptx } from '../../src/validators/pptx.js';
import { exportPresentation } from '../../src/exporters/pptx.js';
import { previewPresentation } from '../../src/renderers/preview.js';

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
    expect(strFromU8(files['docProps/core.xml']!)).toContain('SlideForge — Present ideas clearly');
    expect(Object.keys(files).some(path => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(path))).toBe(true);
    const validation = await exec(process.execPath, [cli, 'validate', pptx]);
    expect(JSON.parse(validation.stdout).valid).toBe(true);
  }, 180_000);

  it('returns meaningful usage and validation exit codes', async () => {
    await expect(exec(process.execPath, [cli, 'unknown'])).rejects.toMatchObject({ code: 2 });
    await expect(exec(process.execPath, [cli, 'export', 'input.json'])).rejects.toMatchObject({ code: 2 });
    const invalid = join(directory, 'invalid.pptx');
    await writeFile(invalid, 'not a presentation');
    await expect(exec(process.execPath, [cli, 'validate', invalid])).rejects.toMatchObject({ code: 1 });
  });

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
});
