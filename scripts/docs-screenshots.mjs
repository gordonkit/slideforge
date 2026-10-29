#!/usr/bin/env node
// Regenerates the documentation screenshots in site/public/screenshots/: npm run docs:screenshots
// Run `npm run build` first. The studio pages and studio backgrounds need network access to
// bg.gordonkit.com, and the pixels depend on the installed fonts and the studio's version.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { renderPresentation } from '../dist/index.js';

const output = fileURLToPath(new URL('../site/public/screenshots/', import.meta.url));
const assets = new URL('../examples/basic/', import.meta.url).href;
const studio = 'https://bg.gordonkit.com/studio';

// Share links copied from the studio's Share button: the Wave pattern's matching series (Aurora palette).
const series = {
  cover: `${studio}#d=1RczBCsIwEATQf5nzHhIPYvc3-gVLXWsQmrCJrVjy72U91NPMwPB2CHiH1KJT85buYMQrDyC80uKrmFZt6AT9lGxtTF_16xMcwy0QNnAcLqF3wnQa8rZs8ldMH078eBDm87jJqiCsajXlBRw7oXoc`,
  content: `${studio}#d=1RcxbCsIwEIXhvZznoSRCi51tuIJQpxqUJE5605K9S3yob-fAz7fDgXe4nGSY6vJXMGzHPQgPH-pLKlkmFIJsKep08R-p6R1szdkQVrDtT6YUwnAYbtao7q-ojJX48SDcjnB1i4CwiGYfA9gWQgSbpiOkWo0qr1nC8AbbpiU8fZAMbgsh1_wL`,
  quote: `${studio}#d=1RcxLDsIwDEXRvbyxVSUMKPE2WEFUXIhASXD6AarsHYVBmdnSfWeDB2_wJcswtStcwLBHdiDcQ2xfVikyoRLklZNO5_CRlt7A1pwMYQVbdzC1Eobd8LMm9X9FZWzEjwfhuoerXwSERbSEFMG2EhLYdD0ht2pUec4ShzfYdsYZR3iEKAXcV0Jpiy8`,
  closing: `${studio}#d=1RcxBCsIwEIXhu7z1IElBMXMNTxDqqEFJwqS2xZK7y7ioq3kDP9-GCN4QW5VxspWuYPgTBxCeKdtXVZpM6ARZa9Hpkj5i6QPs3dkRFrAPg-udMO5GfGvR-FdUbkb8eBDue7jEWUCYRVsqGew7oYDdIRwJ1bJXytLAfugEu_0L`,
};

const paragraph = text => [{ type: 'paragraph', text }];
const card = (title, text) => ({ title, blocks: paragraph(text) });
const cardSets = {
  2: [card('Before', 'Manual formatting on every slide.'), card('After', 'Structured content, one design system.')],
  3: [card('Clarity', 'One idea at a time.'), card('Consistency', 'Shared layouts and tokens.'), card('Editability', 'Text stays editable in PowerPoint.')],
  4: [card('Plan', 'Outline one idea per slide.'), card('Write', 'Fill in schema-valid JSON.'), card('Review', 'Read the layout checks.'), card('Export', 'Write an editable PPTX.')],
  5: [card('Schema', 'Strict fields.'), card('Layouts', 'Fixed families.'), card('Tokens', 'Shared sizes.'), card('Preview', 'Reloads on save.'), card('Export', 'Editable text and shapes.')],
  6: [card('JSON', 'Validated content.'), card('React', 'Static markup.'), card('CSS', 'Shared tokens.'), card('Chromium', 'Real layout.'), card('Checks', 'Layout and package.'), card('PPTX', 'Editable output.')],
};

/** One deck per screenshot set; each slide is saved as `<name>.png`. */
const sets = [
  {
    theme: 'light',
    slides: [
      ['layout-cover', { layout: 'cover', title: 'Ideas into slides', subtitle: 'Structured, editable presentations', author: 'SlideForge', footer: 'cover' }],
      ['layout-cover-centered', { layout: 'cover/centered', title: 'Ideas into slides', subtitle: 'Structured, editable presentations', author: 'SlideForge', footer: 'cover/centered' }],
      ['layout-cover-split', { layout: 'cover/split', title: 'Ideas into slides', subtitle: 'Structured, editable presentations', author: 'SlideForge', footer: 'cover/split' }],
      ['layout-cover-band', { layout: 'cover/band', title: 'Ideas into slides', subtitle: 'Structured, editable presentations', author: 'SlideForge', footer: 'cover/band' }],
      ['layout-content', { layout: 'content', title: 'A simple content model', subtitle: 'Paragraphs, lists, and images', footer: 'content', blocks: [
        { type: 'paragraph', text: 'Create presentations from validated JSON, with editable text and shapes.' },
        { type: 'bullets', items: ['Consistent layouts', 'Local assets are supported'] },
        { type: 'image', src: 'assets/diagram.svg', alt: 'JSON to HTML to PowerPoint flow', caption: 'One source, reusable output' },
      ] }],
      ['layout-two-columns', { layout: 'two-columns', title: 'Before and after', footer: 'two-columns',
        left: [{ type: 'paragraph', text: 'Before' }, { type: 'bullets', items: ['Manual formatting', 'Repeated layout fixes', 'Inconsistent results'] }],
        right: [{ type: 'paragraph', text: 'After' }, { type: 'bullets', items: ['Structured content', 'One design system', 'Repeatable exports'] }] }],
      ...Object.entries(cardSets).map(([count, cards]) => [`layout-cards-${count}`, { layout: 'cards', title: `${count} cards`, footer: 'cards', cards }]),
      ['layout-timeline', { layout: 'timeline', title: 'From idea to deck', footer: 'timeline', events: [
        { date: 'Step 1', title: 'Outline', text: 'One idea per slide.' },
        { date: 'Step 2', title: 'Write JSON', text: 'Pick a layout for each slide.' },
        { date: 'Step 3', title: 'Preview', text: 'Review the layout checks.' },
        { date: 'Step 4', title: 'Export', text: 'An editable PowerPoint file.' },
      ] }],
      ['layout-gantt', { layout: 'gantt', title: 'Project schedule', footer: 'gantt',
        periods: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'],
        tasks: [
          { label: 'Research', start: 1, end: 2, progress: 100 },
          { label: 'Design', start: 2, end: 4, progress: 75 },
          { label: 'Build', start: 3, end: 6, progress: 40 },
          { label: 'Testing', start: 5, end: 7, progress: 10 },
          { label: 'Launch', start: 8, end: 8 },
        ] }],
      ['layout-table', { layout: 'table', title: 'Delivery plan', footer: 'table', columns: ['Milestone', 'Scope', 'Status'],
        rows: [['Foundation', 'Data model and themes', 'Ready'], ['Rendering', 'Layouts and variants', 'Ready'], ['Export', 'PowerPoint', 'Ready']] }],
      ['layout-chart', { layout: 'chart', title: 'Illustrative progress', footer: 'chart', unit: '%',
        data: [{ label: 'Planning', value: 100 }, { label: 'Production', value: 80 }, { label: 'Review', value: 60 }],
        blocks: paragraph('Planning is complete; production is ahead of review.') }],
      ['layout-quote', { layout: 'quote', title: 'One more thing', footer: 'quote', quote: 'Keep content and design apart, and both stay easy to change.', attribution: 'SlideForge design principle' }],
      ['layout-quote-centered', { layout: 'quote/centered', title: 'One more thing', footer: 'quote/centered', quote: 'Keep content and design apart, and both stay easy to change.', attribution: 'SlideForge design principle' }],
      ['layout-blank', { layout: 'blank', title: 'Closing', background: series.closing }],
    ],
  },
  // The saturated cover and closing designs suit the dark theme's light text; the calmer content and
  // quote designs suit the light theme's dark text.
  {
    theme: 'dark',
    backgrounds: { cover: series.cover, blank: series.closing },
    slides: [
      ['studio-slide-cover', { layout: 'cover', title: 'Math backgrounds', subtitle: 'From Math Background Studio', author: 'backgrounds.cover' }],
      ['studio-slide-blank', { layout: 'blank', title: 'Closing' }],
    ],
  },
  {
    theme: 'light',
    backgrounds: { content: series.content, quote: series.quote },
    slides: [
      ['studio-slide-content', { layout: 'content', title: 'Readable on the content design', footer: 'backgrounds.content', blocks: [
        { type: 'paragraph', text: 'The series gives each layout a matching, quieter variant.' },
        { type: 'bullets', items: ['Cover: the full pattern', 'Content: a calmer version for text', 'Closing: a background-only slide'] },
      ] }],
      ['studio-slide-quote', { layout: 'quote', title: 'Quote', footer: 'backgrounds.quote', quote: 'One design, a whole deck of matching backgrounds.', attribution: 'Matching series' }],
    ],
  },
];

/**
 * Waits for a slide's studio frames to draw, as export does, so the screenshot never shows an empty
 * frame. Chromium pauses animation frames in cross-origin frames that are out of view.
 */
async function studioFramesReady(slide) {
  await slide.scrollIntoViewIfNeeded();
  for (const element of await slide.$$(':scope > [data-pptx-background] iframe')) {
    const frame = await element.contentFrame();
    await frame.waitForFunction(() => 'bgRender' in window);
    await frame.evaluate(() => window.bgRender.ready);
  }
}

await mkdir(output, { recursive: true });
const work = await mkdtemp(join(tmpdir(), 'slideforge-screenshots-'));
const browser = await chromium.launch();
try {
  // Slides are drawn at 1920 × 1080 and saved at half size.
  const slides = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
  for (const [index, set] of sets.entries()) {
    const presentation = {
      metadata: { title: 'Screenshots' }, theme: set.theme,
      ...(set.backgrounds ? { backgrounds: set.backgrounds } : {}),
      slides: set.slides.map(([, slide]) => slide),
    };
    const file = join(work, `set-${index}.html`);
    await writeFile(file, renderPresentation(presentation, { baseUrl: assets }));
    await slides.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await slides.evaluate(() => document.fonts.ready);
    const elements = await slides.$$('[data-pptx="slide"]');
    for (const [position, [name]] of set.slides.entries()) {
      await studioFramesReady(elements[position]);
      await elements[position].screenshot({ path: join(output, `${name}.png`) });
      console.log(`Saved ${name}.png`);
    }
  }

  // The studio in English, showing the series cover design.
  const editor = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'en-US', colorScheme: 'light' });
  await editor.goto(series.cover, { waitUntil: 'networkidle' });
  // Dismiss the "Someone shared this design with you" notice.
  await editor.getByText('Someone shared this design').locator('..').getByRole('button').click();
  await editor.waitForTimeout(3000);
  await editor.screenshot({ path: join(output, 'studio-editor.png') });
  await editor.screenshot({ path: join(output, 'studio-series.png'), clip: { x: 1232, y: 56, width: 208, height: 720 } });
  await editor.getByRole('button', { name: 'Share / import' }).click();
  await editor.getByRole('dialog').getByRole('button', { name: 'Copy' }).waitFor();
  await editor.waitForTimeout(500);
  await editor.screenshot({ path: join(output, 'studio-share.png'), clip: { x: 420, y: 250, width: 600, height: 400 } });
  console.log('Saved studio-editor.png, studio-series.png, studio-share.png');
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
