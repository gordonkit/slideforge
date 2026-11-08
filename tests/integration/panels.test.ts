import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium, type Browser } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportPresentation, loadTemplate, renderPresentation } from '../../dist/index.js';

let browser: Browser;
beforeAll(async () => { browser = await chromium.launch(); });
afterAll(async () => { await browser?.close(); });

describe('panels/rows alignment', () => {
  for (const count of [2, 5, 6, 7]) {
    for (const filled of [false, true]) {
      it(`aligns every column across ${count} ${filled ? 'filled' : 'plain'} rows`, async () => {
        const page = await browser.newPage();
        try {
          const template = await loadTemplate('corporate', process.cwd());
          await page.setContent(renderPresentation({
            metadata: { title: 'Row alignment' },
            slides: [{
              layout: 'panels/rows',
              title: 'Documents',
              panels: Array.from({ length: count }, (_, index) => ({
                title: `Document ${index + 1}`,
                ...(filled ? { color: '#F1F5F9' } : {}),
                blocks: [{ type: 'paragraph', text: 'A short summary.' }],
              })),
            }],
          }, { template: template.template }));
          await page.evaluate(() => document.fonts.ready);
          const positions = await page.locator('.sf-panel').evaluateAll(panels =>
            panels.map(panel => ['.sf-panel-number', 'h2', '.sf-blocks'].map(selector =>
              panel.querySelector(selector)!.getBoundingClientRect().left)));
          for (let column = 0; column < 3; column++) {
            const lefts = positions.map(position => position[column]!);
            expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);
          }
        } finally {
          await page.close();
        }
      });

    }
  }
});

describe('narrow panel columns', () => {
  for (const filled of [false, true]) {
    it(`preserves ${filled ? 'filled' : 'plain'} column padding`, async () => {
      const page = await browser.newPage();
      try {
        await page.setContent(renderPresentation({
          metadata: { title: 'Column padding' },
          slides: [6, 7].map(count => ({
            layout: 'panels',
            title: 'Columns',
            panels: Array.from({ length: count }, (_, index) => ({
              title: `Panel ${index + 1}`,
              ...(filled ? { color: '#F1F5F9' } : {}),
              blocks: [{ type: 'paragraph', text: 'Summary' }],
            })),
          })),
        }));
        for (const slide of await page.locator('.sf-slide').all()) {
          const padding = await slide.locator('.sf-panel').evaluateAll(panels =>
            panels.map(panel => {
              const style = getComputedStyle(panel);
              return [style.paddingLeft, style.paddingRight];
            }));
          expect(padding[0]).toEqual(['0px', '18px']);
          expect(padding.at(-1)).toEqual(['18px', '0px']);
          for (const value of padding.slice(1, -1)) expect(value).toEqual(['18px', '18px']);
        }
      } finally {
        await page.close();
      }
    });

  }
});

describe('unnumbered panels', () => {
      it('exports titles without number labels while preserving default numbered slides', async () => {
        const directory = await mkdtemp(join(tmpdir(), 'slideforge-panel-numbering-'));
        try {
          const input = join(directory, 'panels.json');
          const output = join(directory, 'panels.pptx');
          await writeFile(input, JSON.stringify({
            metadata: { title: 'Panel numbering' },
            slides: [
              { layout: 'panels' },
              { layout: 'panels', numbered: false },
              { layout: 'panels/rows', numbered: false },
            ].map(slide => ({
              ...slide,
              title: 'Topics',
              panels: ['Background', 'Scope'].map(title => ({
                title, blocks: [{ type: 'paragraph', text: 'Summary' }],
              })),
            })),
          }));
          await exportPresentation(input, { output });
          const files = unzipSync(await readFile(output));
          for (const index of [1, 2, 3]) {
            const xml = strFromU8(files[`ppt/slides/slide${index}.xml`]!);
            expect(xml).toContain('<a:t>Background</a:t>');
            expect(xml).toContain('<a:t>Scope</a:t>');
            expect(xml.includes('<a:t>01</a:t>')).toBe(index === 1);
            expect(xml.includes('<a:t>02</a:t>')).toBe(index === 1);
          }
        } finally {
          await rm(directory, { recursive: true, force: true });
        }
      }, 60_000);

      for (const layout of ['panels', 'panels/rows']) {
        for (const filled of [false, true]) {
          it(`uses title-first ${filled ? 'filled' : 'plain'} ${layout} without empty number space`, async () => {
            const page = await browser.newPage();
            try {
              await page.setContent(renderPresentation({
                metadata: { title: 'Title-first panels' },
                slides: [2, 6, 7].map(count => ({
                  layout,
                  title: 'Topics',
                  numbered: false,
                  panels: Array.from({ length: count }, (_, index) => ({
                    title: `Topic ${index + 1}`,
                    ...(filled ? { color: '#F1F5F9' } : {}),
                    blocks: [{ type: 'paragraph', text: 'Summary' }],
                  })),
                })),
              }));
              await page.evaluate(() => document.fonts.ready);
              expect(await page.locator('.sf-panel-number').count()).toBe(0);
              for (const slide of await page.locator('.sf-slide').all()) {
                const positions = await slide.locator('.sf-panel').evaluateAll(panels =>
                  panels.map(panel => {
                    const title = panel.querySelector('h2')!;
                    const blocks = panel.querySelector('.sf-blocks')!;
                    const padding = getComputedStyle(panel);
                    const rect = panel.getBoundingClientRect();
                    return {
                      titleLeft: title.getBoundingClientRect().left,
                      titleTop: title.getBoundingClientRect().top,
                      contentLeft: blocks.getBoundingClientRect().left,
                      contentTop: blocks.getBoundingClientRect().top,
                      innerLeft: rect.left + parseFloat(padding.paddingLeft),
                      innerTop: rect.top + parseFloat(padding.paddingTop),
                      overflow: blocks.scrollHeight > blocks.clientHeight + 1,
                    };
                  }));
                for (const position of positions) {
                  expect(position.titleLeft).toBeCloseTo(position.innerLeft, 0);
                  expect(position.overflow).toBe(false);
                  if (layout === 'panels') {
                    expect(position.titleTop).toBeCloseTo(position.innerTop, 0);
                    expect(position.contentTop).toBeGreaterThan(position.titleTop);
                  } else {
                    expect(position.contentLeft - position.titleLeft).toBe(550);
                  }
                }
                if (layout === 'panels/rows') {
                  expect(new Set(positions.map(position => position.titleLeft)).size).toBe(1);
                  expect(new Set(positions.map(position => position.contentLeft)).size).toBe(1);
                }
              }
            } finally {
              await page.close();
            }
          });
        }
      }
});
