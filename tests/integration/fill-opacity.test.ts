import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { exportPresentation, parsePresentation, renderPresentation } from '../../dist/index.js';

const table = { layout: 'table', title: 'Table', columns: ['A', 'B'], rows: [['1', '2'], ['3', '4'], ['5', '6']], fillOpacity: 0.8 };
const cards = [{ title: 'One', blocks: [{ type: 'paragraph', text: 'x' }] }, { title: 'Two', blocks: [{ type: 'paragraph', text: 'y' }] }];
const deck = {
  metadata: { title: 'Fills' },
  theme: 'dark',
  slides: [table, { layout: 'cards', title: 'Cards', cards, fillOpacity: 0.5 }, { layout: 'cards/hexagon', title: 'Shapes', cards, fillOpacity: 0.5 }, { layout: 'cards/honeycomb', title: 'Honeycomb', cards, fillOpacity: 0.5 },
    { layout: 'agenda', title: 'Agenda', items: [{ title: 'One' }, { title: 'Two' }], fillOpacity: 0.5 },
    { layout: 'process', title: 'Process', steps: [{ title: 'One' }, { title: 'Two' }], fillOpacity: 0.5 }],
};

it('rejects a fill opacity outside 0 to 1', () => {
  expect(() => parsePresentation({ ...deck, slides: [{ ...table, fillOpacity: 1.5 }] })).toThrow();
  expect(() => parsePresentation({ ...deck, slides: [{ ...table, fillOpacity: '0.8' }] })).toThrow();
});

it('fills table cells and cards translucently in Chromium and exported PowerPoint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-fill-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(renderPresentation(deck));
    const cells = await page.locator('.sf-table tr').evaluateAll(rows => rows.map(row => getComputedStyle(row.children[0]!).backgroundColor));
    // The header, then rows alternating light (surface) and dark (background), all at 0.8.
    expect(cells.every(color => color.endsWith(', 0.8)'))).toBe(true);
    expect(cells[1]).toBe(cells[3]);
    expect(cells[1]).not.toBe(cells[2]);
    expect(await page.locator('.sf-card').first().evaluate(card => getComputedStyle(card).backgroundColor)).toMatch(/, 0\.5\)$/);
    for (const selector of ['.sf-agenda-item', '.sf-step']) expect(await page.locator(selector).first().evaluate(card => getComputedStyle(card).backgroundColor)).toMatch(/, 0\.5\)$/);

    const source = join(directory, 'fills.json');
    const output = join(directory, 'fills.pptx');
    await writeFile(source, JSON.stringify(deck));
    await exportPresentation(source, { output });
    const files = unzipSync(await readFile(output));
    expect(strFromU8(files['ppt/slides/slide1.xml']!)).not.toContain('<a:highlight>');
    const fills = (strFromU8(files['ppt/slides/slide1.xml']!).match(/<a:tcPr\b[\s\S]*?<\/a:tcPr>/g) ?? [])
      .map(properties => properties.slice(properties.lastIndexOf('</a:lnB>')));
    expect(fills).toHaveLength(8);
    for (const fill of fills) expect(fill).toContain('<a:alpha val="80000"/>');
    expect(strFromU8(files['ppt/slides/slide2.xml']!)).toContain('<a:alpha val="50000"/>');
    for (const slide of ['slide5', 'slide6']) expect(strFromU8(files[`ppt/slides/${slide}.xml`]!)).toContain('<a:alpha val="50000"/>');
    for (const slide of ['slide3', 'slide4']) expect(strFromU8(files[`ppt/slides/${slide}.xml`]!)).toMatch(/name="Card shape"[\s\S]*?<a:alpha val="50000"\/>/);
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
