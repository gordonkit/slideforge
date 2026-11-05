#!/usr/bin/env node
// Regenerates the built-in template, cards variant, and soft shadow screenshots in site/public/screenshots/: npm run docs:template-screenshots
// Run `npm run build` first. Needs no network access; the pixels depend on the installed fonts.
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';
import { builtInTemplates, loadTemplate, renderPresentation } from '../dist/index.js';

const output = fileURLToPath(new URL('../site/public/screenshots/', import.meta.url));

/** One slide that shows the background, text, muted text, surface, border, and accent colors together. */
const slide = {
  layout: 'chart', title: 'Quarterly progress', footer: 'chart', unit: '%',
  data: [{ label: 'Planning', value: 100 }, { label: 'Production', value: 80 }, { label: 'Review', value: 60 }, { label: 'Launch', value: 35 }],
  blocks: [{ type: 'paragraph', text: 'Same content, restyled by the template and the theme.' }],
};

await mkdir(output, { recursive: true });
const work = await mkdtemp(join(tmpdir(), 'slideforge-template-screenshots-'));
const browser = await chromium.launch();
try {
  // Slides are drawn at 1920 × 1080 and saved at half size.
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 0.5 });
  for (const name of (await builtInTemplates()).filter(name => name !== 'default')) {
    const loaded = await loadTemplate(name, process.cwd());
    for (const theme of ['light', 'dark']) {
      const html = renderPresentation({ metadata: { title: name }, theme, slides: [slide] }, {
        template: loaded.template, templateBaseUrl: pathToFileURL(`${loaded.directory}/`).href,
      });
      const file = join(work, `${name}-${theme}.html`);
      await writeFile(file, html);
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await (await page.$('[data-pptx="slide"]')).screenshot({ path: join(output, `template-${name}-${theme}.png`) });
      console.log(`Saved template-${name}-${theme}.png`);
    }
  }
  // The cards variants that change the card shape, three cards each.
  const card = (title, text) => ({ title, blocks: [{ type: 'paragraph', text }] });
  const cards = [card('Clarity', 'One idea at a time.'), card('Consistency', 'Shared layouts and tokens.'), card('Editability', 'Text stays editable.')];
  for (const variant of ['rounded', 'badge', 'circle', 'hexagon', 'pentagon']) {
    const html = renderPresentation({ metadata: { title: variant }, theme: 'light', slides: [{ layout: `cards/${variant}`, title: 'Three principles', footer: `cards/${variant}`, cards }] });
    const file = join(work, `cards-${variant}.html`);
    await writeFile(file, html);
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await (await page.$('[data-pptx="slide"]')).screenshot({ path: join(output, `layout-cards-${variant}.png`) });
    console.log(`Saved layout-cards-${variant}.png`);
  }
  // A subtitle as the one-line takeaway under the title.
  {
    const html = renderPresentation({ metadata: { title: 'subtitle' }, theme: 'light', slides: [{ layout: 'cards', title: 'Three principles', subtitle: 'One design system keeps every slide consistent and editable', footer: 'cards', cards }] });
    const file = join(work, 'subtitle.html');
    await writeFile(file, html);
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await (await page.$('[data-pptx="slide"]')).screenshot({ path: join(output, 'layout-subtitle.png') });
    console.log('Saved layout-subtitle.png');
  }
  // An agenda whose items link to later slides.
  {
    const stub = title => ({ layout: 'content', title, blocks: [{ type: 'paragraph', text: title }] });
    const html = renderPresentation({ metadata: { title: 'agenda' }, theme: 'light', slides: [
      { layout: 'agenda', title: 'Agenda', subtitle: 'Four topics, each a click away', footer: 'agenda', items: [
        { title: 'Results', text: 'Revenue and growth', slide: 2 },
        { title: 'Roadmap', text: 'What ships next', slide: 3 },
        { title: 'Risks', text: 'What could slow us down', slide: 4 },
        { title: 'Questions', text: 'Open discussion' },
      ] },
      stub('Results'), stub('Roadmap'), stub('Risks'),
    ] });
    const file = join(work, 'agenda.html');
    await writeFile(file, html);
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await (await page.$('[data-pptx="slide"]')).screenshot({ path: join(output, 'layout-agenda.png') });
    console.log('Saved layout-agenda.png');
  }
  // Agenda variants with chapters and subsections, and the section divider variants.
  {
    const stub = title => ({ layout: 'content', title, blocks: [{ type: 'paragraph', text: title }] });
    const items = [
      { title: 'Results', text: 'Revenue and growth', slide: 6, items: [{ title: 'Revenue', slide: 7 }, { title: 'Margin', slide: 7 }, { title: 'Customers' }] },
      { title: 'Roadmap', text: 'What ships next', slide: 8, items: [{ title: 'Q1 launch', slide: 9 }, { title: 'Q2 scale', slide: 9 }] },
      { title: 'Risks', text: 'What could slow us down', slide: 10, items: [{ title: 'Supply' }, { title: 'Hiring' }, { title: 'Budget' }] },
      { title: 'Questions', text: 'Open discussion' },
    ];
    // Each sample sits at the index of the slide it replaces in a ten-slide deck with three sections.
    const samples = [
      ['agenda-chapters', 0, { layout: 'agenda/chapters', title: 'Agenda', subtitle: 'Chapters only, with the current one marked', items, current: 2 }],
      ['agenda-outline', 0, { layout: 'agenda/outline', title: 'Agenda', subtitle: 'Chapters with their subsections', items, current: 2 }],
      ['section', 5, { layout: 'section', title: 'Results', subtitle: 'Revenue and growth', footer: 'section' }],
      ['section-centered', 7, { layout: 'section/centered', title: 'Roadmap', subtitle: 'What ships next', footer: 'section/centered' }],
      ['section-band', 9, { layout: 'section/band', title: 'Risks', subtitle: 'What could slow us down', footer: 'section/band' }],
    ];
    for (const [name, index, sample] of samples) {
      const slides = [{ layout: 'agenda', title: 'Agenda', items }, stub('b'), stub('c'), stub('d'), stub('e'),
        { layout: 'section', title: 'Results' }, stub('f'), { layout: 'section', title: 'Roadmap' }, stub('g'), { layout: 'section', title: 'Risks' }];
      slides[index] = sample;
      const html = renderPresentation({ metadata: { title: name }, theme: 'light', slides });
      const file = join(work, name + '.html');
      await writeFile(file, html);
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await (await page.$$('[data-pptx="slide"]'))[index].screenshot({ path: join(output, 'layout-' + name + '.png') });
      console.log('Saved layout-' + name + '.png');
    }
  }
  // Soft shadows from the shadow tokens.
  const soft = { name: 'soft', tokens: { shadow: { card: 24, text: 8 } } };
  for (const [name, layout] of [['cards', 'cards'], ['hexagon', 'cards/hexagon']]) {
    const html = renderPresentation({ metadata: { title: name }, theme: 'light', slides: [{ layout, title: 'Soft shadows', footer: layout, cards }] }, { template: soft });
    const file = join(work, `shadow-${name}.html`);
    await writeFile(file, html);
    await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
    await page.evaluate(() => document.fonts.ready);
    await (await page.$('[data-pptx="slide"]')).screenshot({ path: join(output, `layout-shadow-${name}.png`) });
    console.log(`Saved layout-shadow-${name}.png`);
  }
} finally {
  await browser.close();
  await rm(work, { recursive: true, force: true });
}
