import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportPresentation, loadTemplate, renderPresentation, validateLayout } from '../../dist/index.js';

let browser: Browser;
beforeAll(async () => { browser = await chromium.launch(); });
afterAll(async () => { await browser?.close(); });

async function imageAlphaEndpoints(page: Page, bytes: Uint8Array): Promise<number[]> {
  return page.evaluate(async source => {
    const image = new Image();
    image.src = source;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d')!;
    context.drawImage(image, 0, 0);
    const x = Math.floor(image.width / 2);
    return [0, image.height - 1].map(y => context.getImageData(x, y, 1, 1).data[3]!);
  }, `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`);
}

describe('panel fill transparency', () => {
  it('keeps gradient endpoint alpha in exported pictures and leaves text editable', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'slideforge-panel-alpha-'));
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    try {
      const deck = {
        metadata: { title: 'Transparent panels' },
        slides: ['panels', 'panels/rows'].map(layout => ({
          layout, title: 'Fills', numbered: false,
          panels: [ { from: 0.8, to: 0.6 }, 0.5, { from: 0, to: 1 } ].map((fillOpacity, index) => ({
            title: `Panel ${index + 1}`, color: '#18234a', fillOpacity,
            blocks: [{ type: 'paragraph', text: 'Editable summary' }],
          })),
        })),
      };
      const template = { name: 'alpha', tokens: { gradient: { panel: 30 } } };
      await page.setContent(renderPresentation(deck, { template }));
      const styles = await page.locator('.sf-panel').evaluateAll(panels => panels.map(panel => ({
        fill: getComputedStyle(panel).backgroundImage,
        opacity: getComputedStyle(panel).opacity,
        textOpacity: getComputedStyle(panel.querySelector('.sf-blocks')!).opacity,
      })));
      for (const offset of [0, 3]) {
        expect(styles[offset]!.fill).toBe('linear-gradient(rgba(24, 35, 74, 0.8), rgba(17, 25, 52, 0.6))');
        expect(styles[offset + 1]!.fill).toBe('linear-gradient(rgba(24, 35, 74, 0.5), rgba(17, 25, 52, 0.5))');
      }
      expect(styles.every(style => style.opacity === '1' && style.textOpacity === '1')).toBe(true);

      const input = join(directory, 'panels.json');
      const output = join(directory, 'panels.pptx');
      await writeFile(join(directory, 'template.json'), JSON.stringify(template));
      await writeFile(input, JSON.stringify({ ...deck, template: './template.json' }));
      await exportPresentation(input, { output });
      const files = unzipSync(await readFile(output));
      for (const index of [1, 2]) {
        const xml = strFromU8(files[`ppt/slides/slide${index}.xml`]!);
        expect(xml).toContain('<a:t>Panel 1</a:t>');
        expect(xml).toContain('<a:t>Editable summary</a:t>');
      }
      const alphas: number[][] = [];
      for (const [name, bytes] of Object.entries(files)) {
        if (!name.startsWith('ppt/media/') || !name.endsWith('.png')) continue;
        alphas.push(await imageAlphaEndpoints(page, bytes));
      }
      for (const [top, bottom] of [[204, 153], [128, 128], [0, 255]]) {
        expect(alphas.some(alpha => Math.abs(alpha[0]! - top!) <= 1 && Math.abs(alpha[1]! - bottom!) <= 1)).toBe(true);
      }
    } finally {
      await page.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 60_000);

  it('uses a built-in template with presentation properties instead of a separate custom template file', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'slideforge-presentation-styles-'));
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    try {
      const gradient = { panel: 30 };
      const colorSchemes = { harmony: ['#4cc3ff', '#63c9b8', '#d6b77c'] };
      const steps = ['Alpha', 'Beta', 'Gamma'].map(title => ({ title }));
      const deck = {
        metadata: { title: 'Native style properties' }, template: 'sapphire-sky', theme: 'dark',
        gradient, colorSchemes,
        slides: [
          {
            layout: 'panels', title: 'Transparent panels', numbered: false,
            panels: ['Left', 'Right'].map(title => ({
              title, color: '#18234a', fillOpacity: { from: 0.9, to: 0.2 },
              blocks: [{ type: 'paragraph', text: 'Editable summary' }],
            })),
          },
          { layout: 'cards/honeycomb', title: 'Colored cards', colorScheme: 'harmony', fillOpacity: 0.8, cards: steps },
          { layout: 'cycle/ring', title: 'Colored cycle', colorScheme: 'harmony', center: 'SDLC', steps },
        ],
      };
      const { template } = await loadTemplate('sapphire-sky', directory);
      const html = renderPresentation(deck, { template });
      const { gradient: _gradient, colorSchemes: _colorSchemes, ...legacy } = deck;
      const legacyHtml = renderPresentation(legacy, {
        template: { ...template, tokens: { ...template.tokens, gradient }, colorSchemes },
      });
      expect(html).toBe(legacyHtml);
      await page.setContent(html);
      await page.evaluate(() => document.fonts.ready);
      const slides = page.locator('.sf-slide');
      const currentPixels = await slides.nth(0).screenshot();
      expect(await page.locator('.sf-panel').first().evaluate(panel => getComputedStyle(panel).backgroundImage))
        .toBe('linear-gradient(rgba(24, 35, 74, 0.9), rgba(17, 25, 52, 0.2))');
      expect(await page.locator('#slide-2 polygon').evaluateAll(elements => elements.map(element => getComputedStyle(element).fill)))
        .toEqual(['rgba(76, 195, 255, 0.8)', 'rgba(99, 201, 184, 0.8)', 'rgba(214, 183, 124, 0.8)']);
      expect(await page.locator('#slide-3 .sf-cycle-arrows path').evaluateAll(elements => elements.map(element => getComputedStyle(element).fill)))
        .toEqual(['rgb(76, 195, 255)', 'rgb(99, 201, 184)', 'rgb(214, 183, 124)']);
      expect((await validateLayout(page)).filter(issue => issue.severity === 'error')).toEqual([]);
      await page.setContent(legacyHtml);
      await page.evaluate(() => document.fonts.ready);
      expect(await page.locator('.sf-slide').first().screenshot()).toEqual(currentPixels);

      const input = join(directory, 'presentation.json');
      const output = join(directory, 'presentation.pptx');
      await writeFile(input, JSON.stringify(deck));
      await exportPresentation(input, { output });
      const files = unzipSync(await readFile(output));
      expect(strFromU8(files['ppt/slides/slide1.xml']!)).toContain('<a:t>Editable summary</a:t>');
      const cards = strFromU8(files['ppt/slides/slide2.xml']!);
      for (const color of ['4CC3FF', '63C9B8', 'D6B77C']) expect(cards).toContain(`<a:srgbClr val="${color}">`);
      expect(cards).toContain('<a:alpha val="80000"/>');
      const cycle = strFromU8(files['ppt/slides/slide3.xml']!);
      for (const title of ['Alpha', 'Beta', 'Gamma', 'SDLC']) expect(cycle).toContain(`<a:t>${title}</a:t>`);
      const alphas: number[][] = [];
      for (const [name, bytes] of Object.entries(files)) {
        if (name.startsWith('ppt/media/') && name.endsWith('.png')) alphas.push(await imageAlphaEndpoints(page, bytes));
      }
      expect(alphas.some(([top, bottom]) => Math.abs(top! - 230) <= 1 && Math.abs(bottom! - 51) <= 1)).toBe(true);
    } finally {
      await page.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 60_000);
});

describe('panel divider styles', () => {
  it('exports solid divider fills and preserves patterned divider pixels', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'slideforge-panel-dividers-'));
    const page = await browser.newPage();
    try {
      const input = join(directory, 'panels.json');
      const output = join(directory, 'panels.pptx');
      await writeFile(input, JSON.stringify({
        metadata: { title: 'Divider export' },
        slides: ['panels', 'panels/rows'].map(layout => ({
          layout, title: 'Dividers', numbered: false,
          divider: { color: '#123456', width: 6, opacity: 0.5 },
          panels: ['A', 'B', 'C', 'D'].map((title, index) => ({
            title, blocks: [{ type: 'paragraph', text: 'Summary' }],
            ...(index >= 2 ? { divider: { style: index === 2 ? 'dashed' : 'dotted' } } : {}),
          })),
        })),
      }));
      await exportPresentation(input, { output });
      const files = unzipSync(await readFile(output));
      for (const index of [1, 2]) {
        const xml = strFromU8(files[`ppt/slides/slide${index}.xml`]!);
        const fills = (xml.match(/<p:sp\b[\s\S]*?<\/p:sp>/g) ?? []).filter(shape => shape.includes('123456'));
        expect(fills).toHaveLength(1);
        expect(fills[0]).toContain('<a:alpha val="50000"/>');
        expect(fills[0]).toContain(index === 1 ? 'cx="38100"' : 'cy="38100"');
      }
      const patterns = [];
      for (const [name, bytes] of Object.entries(files)) {
        if (!name.startsWith('ppt/media/') || !name.endsWith('.png')) continue;
        const pattern = await page.evaluate(async source => {
          const image = new Image();
          image.src = source;
          await image.decode();
          if (Math.min(image.width, image.height) !== 6) return null;
          const canvas = document.createElement('canvas');
          canvas.width = image.width;
          canvas.height = image.height;
          const context = canvas.getContext('2d')!;
          context.drawImage(image, 0, 0);
          const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
          const vertical = image.width === 6;
          const alphas = Array.from({ length: vertical ? image.height : image.width }, (_, index) =>
            pixels[((vertical ? index * image.width + 3 : 3 * image.width + index) * 4) + 3]!);
          const color = Array.from({ length: pixels.length / 4 }, (_, index) => index * 4).find(index => pixels[index + 3] === 128);
          return {
            vertical,
            gaps: alphas.filter(alpha => alpha === 0).length,
            filled: alphas.filter(alpha => alpha === 128).length,
            color: color === undefined ? [] : Array.from(pixels.slice(color, color + 4)),
          };
        }, `data:image/png;base64,${Buffer.from(bytes).toString('base64')}`);
        if (pattern !== null) patterns.push(pattern);
      }
      expect(patterns).toHaveLength(4);
      for (const pattern of patterns) {
        expect(pattern.color).toEqual([18, 52, 86, 128]);
        expect(pattern.gaps).toBeGreaterThan(0);
        expect(pattern.filled).toBeGreaterThan(0);
      }
      for (const vertical of [true, false]) {
        const pair = patterns.filter(pattern => pattern.vertical === vertical);
        expect(pair).toHaveLength(2);
        expect(pair[0]!.filled).not.toBe(pair[1]!.filled);
      }
    } finally {
      await page.close();
      await rm(directory, { recursive: true, force: true });
    }
  }, 60_000);

  for (const layout of ['panels', 'panels/rows']) {
    it(`inherits template defaults and applies slide and individual overrides in ${layout}`, async () => {
      const page = await browser.newPage();
      try {
        const panels = ['A', 'B', 'C'].map(title => ({
          title, blocks: [{ type: 'paragraph', text: 'Summary' }],
        }));
        await page.setContent(renderPresentation({
          metadata: { title: 'Dividers' },
          slides: [
            { layout, title: 'Inherited', panels },
            {
              layout, title: 'Overrides',
              divider: { color: '#123456', width: 6, opacity: 0.5, style: 'dashed' },
              panels: [panels[0], panels[1], { ...panels[2], divider: { style: 'dotted', opacity: 0 } }],
            },
            { layout, title: 'Hidden', divider: { width: 0 }, panels },
            { layout, title: 'Unchanged', panels },
            { layout, title: 'Template pattern', panels: [panels[0], { ...panels[1], divider: { style: 'dotted' } }, panels[2]] },
          ],
        }, { template: { name: 'dividers', palette: { light: { border: '#abcdef' } }, tokens: { border: { width: 4 } } } }));
        const lines = await page.locator('.sf-panel-line').evaluateAll(elements => elements.map(element => {
          const style = getComputedStyle(element);
          const rows = element.closest('.sf-variant-rows') !== null;
          const line = element.querySelector('line');
          const rect = element.getBoundingClientRect();
          return {
            color: line === null ? style.backgroundColor : getComputedStyle(line).stroke,
            opacity: line === null ? undefined : getComputedStyle(line).strokeOpacity,
            width: rows ? rect.height : rect.width,
            style: element.getAttribute('data-style') ?? 'solid',
          };
        }));
        const inherited = { color: 'rgb(171, 205, 239)', width: 4, style: 'solid' };
        expect(lines.slice(0, 2)).toEqual([inherited, inherited]);
        expect(lines[2]).toEqual({ color: 'rgb(18, 52, 86)', width: 6, style: 'dashed', opacity: '0.5' });
        expect(lines[3]).toEqual({ color: 'rgb(18, 52, 86)', width: 6, style: 'dotted', opacity: '0' });
        expect(lines.slice(4, 6).map(line => line.width)).toEqual([0, 0]);
        expect(lines.slice(6, 8)).toEqual([inherited, inherited]);
        expect(lines[8]).toEqual({ color: 'rgb(171, 205, 239)', width: 4, style: 'dotted', opacity: '1' });
        expect(lines[9]).toEqual(inherited);
      } finally {
        await page.close();
      }
    });
  }
});

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
