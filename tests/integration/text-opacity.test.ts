import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { strFromU8, unzipSync } from 'fflate';
import { chromium } from 'playwright';
import { expect, it } from 'vitest';
import { exportPresentation, renderPresentation } from '../../dist/index.js';
import { presentationSchema } from '../../src/schemas/presentation.js';
import { validatePptx } from '../../src/validators/pptx.js';

const slide = {
  layout: 'panels',
  title: { text: 'Title opacity', opacity: 0.7, fontSize: 56 },
  subtitle: 'Unchanged subtitle',
  numbered: false,
  panels: [{
    title: 'Panel title',
    blocks: [
      { type: 'paragraph', text: { text: 'Intro opacity', opacity: 0.9876 } },
      { type: 'bullets', items: [{ text: 'Bullet opacity', opacity: 0.93 }, 'Normal bullet'] },
      { type: 'paragraph', text: { text: 'Invisible editable', opacity: 0 } },
    ],
  }, { title: 'Other panel', blocks: [{ type: 'paragraph', text: 'Other text' }] }],
};
const deck = { metadata: { title: 'Text opacity' }, slides: [slide] };
const template = { name: 'opacity-test', tokens: { border: { 'title-outline': 2 }, shadow: { text: 8 } } };

it('validates opacity independently of font size and preserves existing text formats', () => {
  for (const opacity of [0, 0.93, 1]) {
    expect(presentationSchema.safeParse({ ...deck, slides: [{ ...slide, title: { text: 'Title', opacity } }] }).success).toBe(true);
  }
  for (const opacity of [-0.01, 1.01, '0.5', null]) {
    expect(presentationSchema.safeParse({ ...deck, slides: [{ ...slide, title: { text: 'Title', opacity } }] }).success).toBe(false);
  }
  expect(presentationSchema.safeParse({ ...deck, slides: [{ ...slide, title: { text: 'Title', opacity: 0.5, unknown: true } }] }).success).toBe(false);
  expect(presentationSchema.safeParse({ ...deck, slides: [{ ...slide, title: 'Plain title' }] }).success).toBe(true);
});

it('renders individual text opacity and exports editable runs at the same opacity', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-opacity-'));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
    await page.setContent(renderPresentation(deck, { template }));
    const opacity = async (selector: string) => page.locator(selector).evaluate(element => getComputedStyle(element).opacity);
    expect(await opacity('h1 span')).toBe('0.7');
    expect(await page.locator('h1 span').evaluate(element => getComputedStyle(element).fontSize)).toBe('56px');
    expect(await opacity('.sf-panel p:first-child span')).toBe('0.9876');
    expect(await opacity('.sf-panel li:first-child span')).toBe('0.93');
    expect(await opacity('.sf-panel li:nth-child(2)')).toBe('1');
    expect(await opacity('.sf-panel p:last-child span')).toBe('0');

    const input = join(directory, 'deck.json');
    const templateFile = join(directory, 'template.json');
    const output = join(directory, 'deck.pptx');
    await writeFile(templateFile, JSON.stringify(template));
    await writeFile(input, JSON.stringify({ ...deck, template: './template.json' }));
    await exportPresentation(input, { output });
    const data = await readFile(output);
    expect(validatePptx(data).valid).toBe(true);
    const xml = strFromU8(unzipSync(data)['ppt/slides/slide1.xml']!);
    const run = (text: string) => xml.match(/<a:r>[\s\S]*?<\/a:r>/g)?.find(value => value.includes(`<a:t>${text}</a:t>`));
    for (const [text, alpha] of [
      ['Title opacity', 70000], ['Intro opacity', 98760], ['Bullet opacity', 93000], ['Invisible editable', 0],
    ] as const) {
      expect(run(text), text).toContain(`<a:alpha val="${alpha}"/>`);
    }
    expect(run('Normal bullet')).toBeDefined();
    expect(run('Normal bullet')).not.toContain('<a:alpha');
    expect(run('Title opacity')).toContain('<a:ln ');
    expect(run('Title opacity')).toContain('<a:alpha val="31500"/>');
  } finally {
    await browser.close();
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);

it('preserves opacity in table cells, charts, stats, code, and linked agenda text', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'slideforge-opacity-layouts-'));
  try {
    const styled = (text: string) => ({ text, opacity: 0.93 });
    const slides = [
      { layout: 'table', title: 'Table', columns: [styled('Table heading')], rows: [[styled('Table cell')]] },
      { layout: 'stats', title: 'Stats', stats: [{ value: styled('10'), label: styled('Stats label') }, { value: '20', label: 'Other' }] },
      { layout: 'chart', title: 'Chart', data: [{ label: styled('Chart label'), value: 10 }], unit: styled('units') },
      { layout: 'code', title: 'Code', code: styled('const x = 1;'), language: styled('JavaScript') },
      { layout: 'agenda', title: 'Agenda', items: [{ title: styled('Agenda link'), slide: 1 }, { title: 'Other', slide: 2 }] },
    ];
    const input = join(directory, 'deck.json');
    const output = join(directory, 'deck.pptx');
    await writeFile(input, JSON.stringify({ metadata: { title: 'Opacity layouts' }, slides }));
    await exportPresentation(input, { output });
    const files = unzipSync(await readFile(output));
    for (const [index, texts] of [
      ['Table heading', 'Table cell'], ['10', 'Stats label'], ['Chart label', 'units'],
      ['const x = 1;', 'JavaScript'], ['Agenda link'],
    ].entries()) {
      const xml = strFromU8(files[`ppt/slides/slide${index + 1}.xml`]!);
      const runs = xml.match(/<a:r>[\s\S]*?<\/a:r>/g) ?? [];
      for (const text of texts) {
        expect(runs.find(run => run.includes(`<a:t>${text}</a:t>`)), text).toContain('<a:alpha val="93000"/>');
      }
    }
    const agenda = strFromU8(files['ppt/slides/slide5.xml']!);
    expect(agenda).toContain('ppaction://hlinksldjump');
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}, 60_000);
