import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { exportPresentation, parsePresentation, renderPresentation } from '../../dist/index.js';

const slide = {
  layout: 'table',
  title: 'Effort',
  columns: ['Work', 'Days', 'Output'],
  rows: [['Design', '80', 'Architecture'], ['Build', '270', 'Modules']],
  columnWidths: [35, 10, 55],
};
const deck = (options: object) => ({ metadata: { title: 'Tables' }, slides: [{ ...slide, ...options }] });

it('validates column alignments and leaves omitted alignment unchanged', () => {
  expect(renderPresentation(deck({}))).not.toContain('style="text-align:');
  for (const columnAlignments of [['right'], ['left', 'justify', 'right'], ['left', null, 'right'], 'right']) {
    expect(() => parsePresentation(deck({ columnAlignments }))).toThrow();
  }
  const input = parsePresentation(deck({ columnAlignments: ['left', 'right', 'center'] }));
  expect(parsePresentation(input)).toEqual(input);
});

it('aligns headers and body cells in Chromium and exported PowerPoint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-table-align-'));
  const browser = await chromium.launch();
  try {
    const input = deck({ columnAlignments: ['left', 'right', 'center'] });
    const page = await browser.newPage();
    await page.setContent(renderPresentation(input));
    const alignments = await page.locator('tr').evaluateAll(rows =>
      rows.map(row => Array.from(row.children, cell => getComputedStyle(cell).textAlign)));
    expect(alignments).toEqual(Array.from({ length: 3 }, () => ['left', 'right', 'center']));
    const source = join(directory, 'table.json');
    const output = join(directory, 'table.pptx');
    await writeFile(source, JSON.stringify(input));
    await exportPresentation(source, { output });
    const xml = strFromU8(unzipSync(await readFile(output))['ppt/slides/slide1.xml']!);
    for (const value of ['Days', '80', '270']) {
      const paragraph = xml.match(/<a:p>[\s\S]*?<\/a:p>/g)?.find(p => p.includes(`<a:t>${value}</a:t>`));
      expect(paragraph).toContain('algn="r"');
    }
    expect(xml).toContain('algn="ctr"');
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
