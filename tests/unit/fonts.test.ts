import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { applyEastAsianFont } from '../../src/exporters/fonts.js';

const run = (latin: string, ea: string) =>
  `<a:rPr lang="en-US"><a:latin typeface="${latin}" pitchFamily="34" charset="0"/>`
  + `<a:ea typeface="${ea}" pitchFamily="34" charset="-122"/></a:rPr>`;

function apply(slide: string, font?: string): string {
  const original = zipSync({ 'ppt/slides/slide1.xml': strToU8(slide), 'ppt/slides/_rels/slide1.xml.rels': strToU8(run('Arial', 'Arial')) });
  const files = unzipSync(applyEastAsianFont(original, font));
  expect(strFromU8(files['ppt/slides/_rels/slide1.xml.rels']!)).toBe(run('Arial', 'Arial'));
  return strFromU8(files['ppt/slides/slide1.xml']!);
}

describe('PowerPoint East Asian font', () => {
  it('replaces East Asian fonts copied from the Latin font', () => {
    expect(apply(run('Arial', 'Arial'))).toBe(run('Arial', 'Microsoft JhengHei'));
    expect(apply(run('Arial', 'Arial'), 'Noto Sans TC & "Co"')).toBe(run('Arial', 'Noto Sans TC &amp; &quot;Co&quot;'));
  });

  it('keeps explicit East Asian fonts', () => {
    expect(apply(run('Arial', 'PMingLiU'))).toBe(run('Arial', 'PMingLiU'));
  });
});
