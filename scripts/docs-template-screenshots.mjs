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
