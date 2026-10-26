import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { describePresentationError, readPresentationFile } from '../../src/schemas/input.js';
import { parsePresentation } from '../../src/schemas/presentation.js';

function schemaError(input: unknown): string {
  try {
    parsePresentation(input);
  } catch (error) {
    return describePresentationError(error);
  }
  throw new Error('Expected the presentation to be invalid');
}

describe('readable presentation errors', () => {
  let directory: string;
  beforeAll(async () => { directory = await mkdtemp(join(tmpdir(), 'slideforge-errors-')); });
  afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

  it('lists each schema problem with its path and one-based slide number', () => {
    const message = schemaError({
      metadata: { title: 'Deck' },
      slides: [
        { layout: 'cover', title: 'Fine' },
        { layout: 'table', title: 'Table', columns: ['A', 'B'], rows: [['1', '2'], ['3']], color: 'red' },
      ],
    });
    expect(message).toBe([
      'The presentation does not match the schema (2 problems):',
      '  - slides[1] (slide 2): Unrecognized key: "color"',
      '  - slides[1].rows[1] (slide 2): Every row must have one cell per column',
    ].join('\n'));
  });

  it('names the valid layouts and block types instead of discriminator jargon', () => {
    expect(schemaError({ metadata: { title: 'Deck' }, slides: [{ layout: 'timeline', title: 'x' }] }))
      .toContain('slides[0].layout (slide 1): Unknown layout. Use "cover", "content", "two-columns", "cards", "table", "chart", or "quote"');
    expect(schemaError({ metadata: { title: 'Deck' }, slides: [{ layout: 'content', title: 'x', blocks: [{ type: 'quote', text: 'y' }] }] }))
      .toContain('slides[0].blocks[0].type (slide 1): Unknown block type. Use "paragraph", "bullets", or "image"');
  });

  it('describes presentation-level problems and language tags plainly', () => {
    expect(schemaError({ metadata: { title: 'Deck', lang: 'Traditional Chinese' }, slides: [{ layout: 'cover', title: 'x' }] }))
      .toBe('The presentation does not match the schema (1 problem):\n  - metadata.lang: Use a language tag such as "en", "zh-Hant", or "ja"');
    expect(schemaError('not an object')).toMatch(/^The presentation does not match the schema \(1 problem\):\n {2}- presentation: /);
  });

  it('keeps other errors unchanged', () => {
    expect(describePresentationError(new Error('Plain failure'))).toBe('Plain failure');
    expect(describePresentationError('text')).toBe('text');
  });

  it('names the file in malformed JSON errors', async () => {
    const file = join(directory, 'broken.json');
    await writeFile(file, '{ "metadata": ');
    await expect(readPresentationFile(file)).rejects.toThrow(`Invalid JSON in ${file}: `);
    await writeFile(file, '{ "metadata": { "title": "Deck" }, "slides": [] }');
    expect(await readPresentationFile(file)).toEqual({ metadata: { title: 'Deck' }, slides: [] });
  });
});
