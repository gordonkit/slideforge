import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { exportPresentation, renderPresentation } from '../../dist/index.js';

it('keeps native list text inside its column, aligns wrapped lines, and reserves safe vertical room', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-text-layout-'));
  const browser = await chromium.launch();
  try {
    const deck = {
      metadata: { title: 'Native list layout' },
      slides: [{
        layout: 'panels', title: 'Columns', numbered: false,
        panels: [
          { title: 'Left', blocks: [
            { type: 'bullets', items: ['First long item that wraps over several words in this column without crossing the separator.', 'Second item'] },
            { type: 'paragraph', text: 'Following block' },
          ] },
          { title: 'Right', blocks: [{ type: 'paragraph', text: 'Other column' }] },
        ],
      }],
    };
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.setContent(renderPresentation(deck));
    const bounds = await page.locator('.sf-panel:first-child').evaluate(panel => {
      const origin = panel.closest('.sf-slide')!.getBoundingClientRect();
      const list = panel.querySelector('ul')!;
      const box = list.getBoundingClientRect();
      const item = list.querySelector('li')!.getBoundingClientRect();
      const next = list.nextElementSibling!.getBoundingClientRect();
      return { x: box.left - origin.left, right: box.right - origin.left, itemX: item.left - origin.left, bottom: next.top - origin.top };
    });
    const input = join(directory, 'deck.json');
    await writeFile(input, JSON.stringify(deck));
    for (const textSlack of [undefined, false] as const) {
      const output = join(directory, `deck-${textSlack}.pptx`);
      await exportPresentation(input, { output, textSlack });
      const xml = strFromU8(unzipSync(await readFile(output))['ppt/slides/slide1.xml']!);
      const shape = xml.match(/<p:sp>[\s\S]*?<\/p:sp>/g)!.find(shape => shape.includes('<a:t>Second item</a:t>'))!;
      const box = shape.match(/<a:off x="(\d+)" y="(\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/)!;
      const [x, y, width, height] = box.slice(1).map(Number);
      const inset = Number(shape.match(/\blIns="(\d+)"/)![1]);
      const margin = Number(shape.match(/\bmarL="(\d+)"/)![1]);
      expect((x! + width!) / 6350).toBeLessThanOrEqual(bounds.right + 1);
      expect((x! + inset + margin) / 6350).toBeCloseTo(bounds.itemX, 0);
      expect((y! + height!) / 6350).toBeCloseTo(bounds.bottom, 0);
      expect(shape).toContain('indent="-');
      expect(shape).toContain('<a:buChar char="•"/>');
    }
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
