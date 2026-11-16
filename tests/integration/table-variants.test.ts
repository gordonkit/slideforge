import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { exportPresentation, renderPresentation } from '../../dist/index.js';

const table = { title: 'Table', columns: ['Topic', 'Question'], rows: [['One', 'a'], ['Two', 'b'], ['Three', 'c']] };
const deck = { metadata: { title: 'Tables' }, slides: [{ ...table, layout: 'table/lines' }, { ...table, layout: 'table/accent' }] };

it('draws the lines and accent table variants in Chromium and keeps them in PowerPoint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-table-variants-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.setContent(renderPresentation(deck));
    const styles = await page.locator('.sf-slide').evaluateAll(slides => slides.map(slide => {
      const style = (selector: string) => getComputedStyle(slide.querySelector(selector)!);
      const accent = getComputedStyle(slide).getPropertyValue('--sf-accent').trim();
      return {
        accent,
        header: { background: style('th').backgroundColor, color: style('th').color, bottom: style('th').borderBottomWidth, left: style('th').borderLeftWidth },
        first: { color: style('td').color, left: style('td').borderLeftWidth, weight: style('td').fontWeight },
      };
    }));
    const [lines, accent] = styles;
    // lines: a clear header in the accent color over a thick rule, and no column rules.
    expect(lines!.header.background).toBe('rgba(0, 0, 0, 0)');
    expect(lines!.header.bottom).toBe('6px');
    expect(lines!.header.left).toBe('0px');
    expect(lines!.first.left).toBe('0px');
    // accent: no column rules, and the first column bold in the accent color.
    expect(accent!.first.left).toBe('0px');
    expect(Number(accent!.first.weight)).toBeGreaterThanOrEqual(700);
    expect(accent!.first.color).not.toBe(lines!.first.color);
    expect(accent!.first.color).toBe(lines!.header.color);

    const source = join(directory, 'tables.json');
    const output = join(directory, 'tables.pptx');
    await writeFile(source, JSON.stringify(deck));
    await exportPresentation(source, { output });
    const files = unzipSync(await readFile(output));
    const firstCell = (slide: number) => strFromU8(files[`ppt/slides/slide${slide}.xml`]!).match(/<a:tc>[\s\S]*?<\/a:tc>/)![0];
    expect(firstCell(1)).toMatch(/<a:lnL w="0"/);
    expect(firstCell(1)).toMatch(/<a:lnB w="38100"/);
    expect(firstCell(2)).toMatch(/<a:lnL w="0"/);
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
