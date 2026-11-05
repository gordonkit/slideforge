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
  // Panels split by lines, with colored panels, and the gradient tokens on cards and panels.
  {
    const panel = (title, text, color) => ({ title, blocks: [{ type: 'paragraph', text }], ...(color === undefined ? {} : { color }) });
    const plain = [panel('Plan', 'Define scope and goals.'), panel('Build', 'Ship the first version.'), panel('Learn', 'Measure and adjust.')];
    const colored = [panel('Plan', 'Define scope.', '#2563eb'), panel('Build', 'Ship v1.', '#0d9488'), panel('Learn', 'Measure.', '#d97706'), panel('Grow', 'Scale up.', '#7c3aed')];
    const gradient = { name: 'gradient', tokens: { gradient: { card: 40, panel: 30 } } };
    const samples = [
      ['panels', { layout: 'panels', title: 'Three steps', footer: 'panels', panels: plain }, undefined],
      ['panels-rows', { layout: 'panels/rows', title: 'Three steps', footer: 'panels/rows', panels: plain }, undefined],
      ['panels-colored', { layout: 'panels', title: 'Each panel has its color', footer: 'panels', panels: colored }, undefined],
      ['panels-gradient', { layout: 'panels', title: 'With a gradient', footer: 'gradient.panel: 30', panels: colored }, gradient],
      ['cards-gradient', { layout: 'cards', title: 'Cards with a gradient', footer: 'gradient.card: 40', cards }, gradient],
    ];
    for (const [name, slide, template] of samples) {
      const html = renderPresentation({ metadata: { title: name }, theme: 'light', slides: [slide] }, template === undefined ? {} : { template });
      const file = join(work, name + '.html');
      await writeFile(file, html);
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await (await page.$('[data-pptx="slide"]')).screenshot({ path: join(output, 'layout-' + name + '.png') });
      console.log('Saved layout-' + name + '.png');
    }
  }
  // The layouts added for stats, media, matrices, comparisons, teams, flows, code, charts, and endings.
  {
    // A sample picture, drawn here so no image file is needed.
    await page.setViewportSize({ width: 1200, height: 800 });
    await page.setContent('<body style="margin:0"><div id="art" style="width:1200px;height:800px;background:linear-gradient(135deg,#0ea5e9,#6366f1,#ec4899)"><div style="position:absolute;left:760px;top:140px;width:300px;height:300px;border-radius:50%;background:#fde68a"></div></div></body>');
    const image = 'data:image/png;base64,' + (await (await page.$('#art')).screenshot({ type: 'png' })).toString('base64');
    await page.setViewportSize({ width: 1920, height: 1080 });
    const para = text => [{ type: 'paragraph', text }];
    const stat = (value, label, text) => ({ value, label, ...(text === undefined ? {} : { text }) });
    const quadrants = ['Quick wins', 'Big bets', 'Fill-ins', 'Avoid'].map(title => ({ title, blocks: para('A short note.') }));
    const swot = ['Strengths', 'Weaknesses', 'Opportunities', 'Threats'].map(title => ({ title, blocks: para('A short note.') }));
    const steps = [{ title: 'Write', text: 'JSON content' }, { title: 'Build', text: 'HTML slides' }, { title: 'Export', text: 'PPTX file' }, { title: 'Present' }];
    const progress = [{ label: 'Plan', value: 100 }, { label: 'Build', value: 80 }, { label: 'Review', value: 60 }, { label: 'Launch', value: 35 }];
    const share = [{ label: 'Plan', value: 40 }, { label: 'Build', value: 30 }, { label: 'Review', value: 20 }, { label: 'Launch', value: 10 }];
    const samples = [
      ['stats', { layout: 'stats', title: 'Results', subtitle: 'Four numbers to remember', stats: [stat('98%', 'Satisfaction', 'Up 6 points'), stat('$4.2M', 'Revenue'), stat('12k', 'Users', 'Monthly'), stat('3.1x', 'Growth')] }],
      ['stats-cards', { layout: 'stats/cards', title: 'Results', stats: [stat('98%', 'Satisfaction'), stat('$4.2M', 'Revenue'), stat('12k', 'Users'), stat('3.1x', 'Growth'), stat('24', 'Markets')] }],
      ['media', { layout: 'media', title: 'The product', image, alt: 'A sample picture', caption: 'Figure 1', blocks: [...para('A short explanation beside the picture.'), { type: 'bullets', items: ['First point', 'Second point', 'Third point'] }] }],
      ['media-right', { layout: 'media/right', title: 'The product', image, alt: 'A sample picture', blocks: para('The image on the right.') }],
      ['media-full', { layout: 'media/full', title: 'The product', image, alt: 'A sample picture', blocks: para('A caption under the full-width image.') }],
      ['matrix', { layout: 'matrix', title: 'Priorities', xAxis: 'Impact', yAxis: 'Effort', quadrants }],
      ['matrix-lines', { layout: 'matrix/lines', title: 'SWOT', quadrants: swot }],
      ['compare', { layout: 'compare', title: 'Plans', options: [{ title: 'Basic', label: '$9', items: ['One user', 'Email support'] }, { title: 'Pro', label: '$29', highlight: true, items: ['Five users', 'Priority support', 'Exports'] }, { title: 'Team', label: '$79', items: ['Unlimited users', 'SSO', 'Audit log'] }] }],
      ['team', { layout: 'team', title: 'The team', members: [{ name: 'Ada Lin', role: 'Design', text: 'Systems and layout.' }, { name: 'Wang Ming', role: 'Engineering', text: 'Front end and export.' }, { name: 'Sam Roe', role: 'Product' }, { name: 'Mia Cho', role: 'Data', image }] }],
      ['process', { layout: 'process', title: 'How it works', steps }],
      ['process-vertical', { layout: 'process/vertical', title: 'How it works', steps: steps.slice(0, 3) }],
      ['hub', { layout: 'hub', title: 'The platform', center: 'SlideForge', items: [{ title: 'Layouts', text: 'Many families' }, { title: 'Templates', text: 'Data only' }, { title: 'Export', text: 'Editable PPTX' }, { title: 'Present', text: 'Browser mode' }, { title: 'Docs' }] }],
      ['code', { layout: 'code', title: 'Usage', language: 'bash', code: 'npm install slideforge\nslideforge init my-deck\nslideforge build my-deck/presentation.json\nslideforge export my-deck/presentation.json' }],
      ['code-dark', { layout: 'code/dark', title: 'Usage', language: 'TypeScript', code: 'import { renderPresentation } from "slideforge";\n\nconst html = renderPresentation(deck);\nconsole.log(html.length);' }],
      ['chart-columns', { layout: 'chart/columns', title: 'Progress', unit: '%', data: progress }],
      ['chart-donut', { layout: 'chart/donut', title: 'Share of effort', data: share }],
      ['closing', { layout: 'closing', title: 'Thank you', subtitle: 'Questions welcome', contacts: [{ label: 'Email', value: 'hello@example.com' }, { label: 'Web', value: 'slideforge.gordonkit.com' }] }],
      ['closing-centered', { layout: 'closing/centered', title: 'Thank you', subtitle: 'Questions welcome', contacts: [{ label: 'Email', value: 'hello@example.com' }] }],
      ['closing-band', { layout: 'closing/band', title: 'Thank you', subtitle: 'Questions welcome', contacts: [{ label: 'Email', value: 'hello@example.com' }] }],
    ];
    for (const [name, slide] of samples) {
      const html = renderPresentation({ metadata: { title: name }, theme: 'light', slides: [{ ...slide, footer: slide.layout }] });
      const file = join(work, name + '.html');
      await writeFile(file, html);
      await page.goto(pathToFileURL(file).href, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await (await page.$('[data-pptx="slide"]')).screenshot({ path: join(output, 'layout-' + name + '.png') });
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
