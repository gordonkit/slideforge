import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import { strFromU8, unzipSync } from 'fflate';
import { chromium, type Browser, type Page } from 'playwright';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { exportPresentation, presentPresentation, previewPresentation, renderPresentation } from '../../dist/index.js';

const exec = promisify(execFile);
const cli = resolve('dist/cli/index.js');
const deck = {
  metadata: { title: 'Present mode' },
  slides: [
    { layout: 'content', title: 'First', blocks: [{ type: 'paragraph', text: 'One' }], notes: 'Opening line\nSecond line' },
    { layout: 'content', title: 'Second', blocks: [{ type: 'paragraph', text: 'Two' }] },
    { layout: 'content', title: 'Third', blocks: [{ type: 'paragraph', text: 'Three' }], notes: '<b>not markup</b>' },
  ],
};

let directory: string;
let input: string;
let presentHtml: string;
let browser: Browser;
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), 'slideforge-present-'));
  input = join(directory, 'deck.json');
  presentHtml = join(directory, 'deck-present.html');
  await writeFile(input, JSON.stringify(deck));
  await exec(process.execPath, [cli, 'build', input, '--present', '--output', presentHtml]);
  browser = await chromium.launch();
}, 60_000);
afterAll(async () => {
  await browser?.close();
  await rm(directory, { recursive: true, force: true });
}, 60_000);

/** A page that looks like a person's browser: the scripts skip automated ones. */
async function personPage(): Promise<Page> {
  const page = await browser.newPage({ viewport: { width: 960, height: 720 } });
  await page.addInitScript(() => Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false }));
  return page;
}

const shown = (page: Page) => page.evaluate(() =>
  Array.from(document.querySelectorAll('.sf-slide'))
    .filter(slide => getComputedStyle(slide).display !== 'none')
    .map(slide => slide.querySelector('h1')?.textContent));
const hash = (page: Page) => page.evaluate(() => location.hash);
const notes = (page: Page) => page.evaluate(() => {
  const panel = document.querySelector<HTMLElement>('.sf-notes-panel');
  return panel && !panel.hidden ? panel.querySelector('p')!.textContent : null;
});

/** Slide texts and speaker notes of an exported deck, for comparing exports. */
function summary(data: Uint8Array) {
  const files = unzipSync(data);
  const texts = (pattern: RegExp) => Object.keys(files).filter(path => pattern.test(path))
    .sort((a, b) => a.localeCompare(b, 'en', { numeric: true }))
    .map(path => (strFromU8(files[path]!).match(/<a:t>[^<]*<\/a:t>/g) ?? []).join(''));
  return { slides: texts(/^ppt\/slides\/slide\d+\.xml$/), notes: texts(/^ppt\/notesSlides\/notesSlide\d+\.xml$/) };
}

describe('build --present', () => {
  it('leaves the default build without scripts', () => {
    const html = renderPresentation(deck);
    expect(html).toBe(renderPresentation(deck, { present: false }));
    expect(html).not.toContain('<script');
    expect(html).not.toContain('sf-presenting');
    expect(renderPresentation(deck, { present: true })).toContain('sf-presenting');
  });

  it('pages with the keyboard and keeps the slide in the hash', async () => {
    const page = await personPage();
    await page.goto(pathToFileURL(presentHtml).href);
    expect(await shown(page)).toEqual(['First']);
    expect(await hash(page)).toBe('#1');
    for (const [key, title, number] of [
      ['ArrowRight', 'Second', 2], ['PageDown', 'Third', 3], ['ArrowDown', 'Third', 3], ['ArrowLeft', 'Second', 2],
      ['PageUp', 'First', 1], ['ArrowUp', 'First', 1], ['Space', 'Second', 2], ['Shift+Space', 'First', 1],
      ['End', 'Third', 3], ['Home', 'First', 1],
    ] as const) {
      await page.keyboard.press(key);
      expect([key, await shown(page), await hash(page)]).toEqual([key, [title], `#${number}`]);
    }
    // Browser shortcuts and IME composition are left alone.
    await page.keyboard.press('Control+ArrowRight');
    await page.evaluate(() => dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', isComposing: true })));
    expect(await shown(page)).toEqual(['First']);

    await page.evaluate(() => { location.hash = '#3'; });
    await page.waitForFunction(() => document.querySelector('.sf-current h1')?.textContent === 'Third');
    for (const [value, number] of [['#99', 3], ['#0', 1], ['#abc', 1]] as const) {
      await page.goto(`${pathToFileURL(presentHtml).href}${value}`);
      await page.reload();
      expect([value, await hash(page)]).toEqual([value, `#${number}`]);
    }
    await page.goto(`${pathToFileURL(presentHtml).href}#2`);
    await page.reload();
    expect(await shown(page)).toEqual(['Second']);
    expect(await page.locator('.sf-present-status').textContent()).toBe('2. Second');
    await page.close();
  });

  it('scales the slide to the window without scrollbars and toggles fullscreen', async () => {
    const page = await personPage();
    await page.goto(pathToFileURL(presentHtml).href);
    const fit = () => page.evaluate(() => {
      const bounds = document.querySelector('.sf-current')!.getBoundingClientRect();
      return { width: Math.round(bounds.width), height: Math.round(bounds.height), left: Math.round(bounds.left),
        top: Math.round(bounds.top), scroll: document.documentElement.scrollHeight <= innerHeight };
    });
    // 960 × 720 letterboxes the 16:9 slide to 960 × 540.
    expect(await fit()).toEqual({ width: 960, height: 540, left: 0, top: 90, scroll: true });
    await page.setViewportSize({ width: 1600, height: 900 });
    // The resize event arrives after the viewport changes.
    await expect.poll(fit).toEqual({ width: 1600, height: 900, left: 0, top: 0, scroll: true });
    await page.keyboard.press('f');
    await page.waitForFunction(() => document.fullscreenElement === document.documentElement);
    await page.keyboard.press('f');
    await page.waitForFunction(() => document.fullscreenElement === null);
    await page.close();
  });

  it('shows the current slide notes as plain text with line breaks', async () => {
    const page = await personPage();
    await page.goto(pathToFileURL(presentHtml).href);
    expect(await notes(page)).toBeNull();
    await page.keyboard.press('n');
    expect(await notes(page)).toBe('Opening line\nSecond line');
    expect(await page.locator('.sf-notes-panel p').evaluate(element => getComputedStyle(element).whiteSpace)).toBe('pre-wrap');
    expect(await page.locator('.sf-notes-panel h2').textContent()).toBe('Notes · 1. First');
    await page.keyboard.press('ArrowRight');
    expect(await notes(page)).toBe('No notes');
    await page.keyboard.press('ArrowRight');
    expect(await notes(page)).toBe('<b>not markup</b>');
    expect(await page.locator('.sf-notes-panel b').count()).toBe(0);
    await page.keyboard.press('Escape');
    expect(await notes(page)).toBeNull();
    // The panel is outside every slide, and slides keep their notes in place.
    expect(await page.evaluate(() => document.querySelector('.sf-notes-panel')!.closest('.sf-slide, [data-pptx], .slide'))).toBeNull();
    expect(await page.locator('.sf-slide > aside[data-pptx-notes]').count()).toBe(2);
    await page.close();
  });

  it('prints every slide', async () => {
    const page = await personPage();
    await page.goto(pathToFileURL(presentHtml).href);
    await page.emulateMedia({ media: 'print' });
    expect(await shown(page)).toEqual(['First', 'Second', 'Third']);
    await page.close();
  });
});

describe('preview and present servers', () => {
  it('shows notes in the preview for the slide nearest the middle', async () => {
    const server = await previewPresentation(input, 0);
    const page = await personPage();
    try {
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Preview did not bind a TCP port');
      await page.goto(`http://127.0.0.1:${address.port}/`);
      expect(await page.evaluate(() => document.documentElement.classList.contains('sf-presenting'))).toBe(false);
      expect(await shown(page)).toEqual(['First', 'Second', 'Third']);
      await page.keyboard.press('n');
      expect(await notes(page)).toBe('Opening line\nSecond line');
      await page.locator('.sf-slide').nth(2).evaluate(slide => slide.scrollIntoView({ block: 'center' }));
      await page.waitForFunction(() => document.querySelector('.sf-notes-panel p')?.textContent === '<b>not markup</b>');
    } finally {
      await page.close();
      await server.close();
    }
  }, 60_000);

  it('serves present without a reload client and with presentation mode', async () => {
    const server = await presentPresentation(input, 0);
    const page = await personPage();
    try {
      const address = server.httpServer!.address();
      if (!address || typeof address === 'string') throw new Error('Present did not bind a TCP port');
      const url = `http://127.0.0.1:${address.port}/`;
      const html = await (await fetch(url)).text();
      expect(html).not.toContain('/@vite/client');
      expect(html).toContain('sf-presenting');
      await page.goto(url);
      expect(await shown(page)).toEqual(['First']);
      await page.keyboard.press('End');
      expect(await hash(page)).toBe('#3');
      await page.reload();
      expect(await shown(page)).toEqual(['Third']);
    } finally {
      await page.close();
      await server.close();
    }
  }, 60_000);

  it('refuses to present an invalid deck and rejects --present elsewhere', async () => {
    const invalid = join(directory, 'invalid.json');
    await writeFile(invalid, JSON.stringify({ metadata: { title: 'Invalid' }, slides: [] }));
    await expect(exec(process.execPath, [cli, 'present', invalid])).rejects.toMatchObject({ code: 1 });
    await expect(exec(process.execPath, [cli, 'preview', input, '--present'])).rejects.toMatchObject({ code: 2 });
    expect((await exec(process.execPath, [cli, '--help'])).stdout).toContain('slideforge present presentation.json [--port 5181]');
  }, 60_000);
});

describe('export of presentation-mode pages', () => {
  it('matches exporting the JSON for a --present file and the preview and present URLs', async () => {
    const reference = join(directory, 'reference.pptx');
    await exportPresentation(input, { output: reference });
    const expected = summary(await readFile(reference));
    expect(expected.slides).toHaveLength(3);
    expect(expected.notes.join('')).toContain('Opening line');

    const fromFile = join(directory, 'from-file.pptx');
    await exportPresentation(presentHtml, { output: fromFile });
    expect(summary(await readFile(fromFile))).toEqual(expected);

    for (const start of [previewPresentation, presentPresentation]) {
      const server = await start(input, 0);
      try {
        const address = server.httpServer!.address();
        if (!address || typeof address === 'string') throw new Error('Server did not bind a TCP port');
        const output = join(directory, `from-${start.name}.pptx`);
        await exportPresentation(`http://127.0.0.1:${address.port}/`, { output });
        expect([start.name, summary(await readFile(output))]).toEqual([start.name, expected]);
      } finally {
        await server.close();
      }
    }
  }, 300_000);
});
