import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { applyTextOutlines, type TextOutline } from '../../src/exporters/text-outline.js';

const fonts = (family: string) =>
  `<a:latin typeface="${family}" pitchFamily="34" charset="0"/><a:ea typeface="${family}" pitchFamily="34" charset="-122"/>`;
const run = (family: string, line = '') =>
  `<a:r><a:rPr lang="en-US" sz="4500" b="1" dirty="0">${line}<a:solidFill><a:srgbClr val="172033"/></a:solidFill>${fonts(family)}</a:rPr><a:t>Title</a:t></a:r>`;
const white: TextOutline = { family: 'Arial', width: 6, color: 'FFFFFF', alpha: 1 };

function apply(slide: string, outlines: TextOutline[]): string {
  const original = zipSync({ 'ppt/slides/slide1.xml': strToU8(slide) });
  return strFromU8(unzipSync(applyTextOutlines(original, outlines))['ppt/slides/slide1.xml']!);
}

const shade: TextOutline = { family: 'Arial', width: 0, color: '000000', alpha: 1, shadow: { x: 0, y: 8, blur: 24, color: '000000', alpha: 0.45 } };
const shadowXml = '<a:effectLst><a:outerShdw blurRad="152400" dist="50800" dir="5400000" algn="ctr" rotWithShape="0">'
  + '<a:srgbClr val="000000"><a:alpha val="45000"/></a:srgbClr></a:outerShdw></a:effectLst>';

describe('PowerPoint text outlines', () => {
  it('outlines marked runs and restores their font', () => {
    const line = '<a:ln w="38100"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln>';
    expect(apply(run('slideforge-outline-0') + run('Arial'), [white])).toBe(run('Arial', line) + run('Arial'));
  });

  it('writes translucent colors, XML-escapes fonts, and outlines end-of-paragraph properties', () => {
    const outline = { family: 'Noto & "Co"', width: 2, color: '0B1F3A', alpha: 0.5 };
    const end = `<a:endParaRPr lang="en-US">${fonts('slideforge-outline-0')}</a:endParaRPr>`;
    expect(apply(end, [outline])).toBe('<a:endParaRPr lang="en-US">'
      + '<a:ln w="12700"><a:solidFill><a:srgbClr val="0B1F3A"><a:alpha val="50000"/></a:srgbClr></a:solidFill></a:ln>'
      + `${fonts('Noto &amp; &quot;Co&quot;')}</a:endParaRPr>`);
  });

  it('replaces an outline the converter already wrote', () => {
    const old = '<a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>';
    expect(apply(run('slideforge-outline-0', old), [white])).not.toContain(old);
  });

  it('writes a soft text shadow after the fill and before the fonts, without an outline', () => {
    const shadowed = `<a:r><a:rPr lang="en-US" sz="4500" b="1" dirty="0"><a:solidFill><a:srgbClr val="172033"/></a:solidFill>${shadowXml}${fonts('Arial')}</a:rPr><a:t>Title</a:t></a:r>`;
    expect(apply(run('slideforge-outline-0'), [shade])).toBe(shadowed);
    expect(apply(run('slideforge-outline-0'), [shade])).not.toContain('<a:ln');
  });

  it('keeps an outline the converter wrote when only a shadow is marked, and writes both when asked', () => {
    const line = '<a:ln w="9525"><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>';
    expect(apply(run('slideforge-outline-0', line), [shade])).toContain(line);
    const both = apply(run('slideforge-outline-0'), [{ ...white, shadow: shade.shadow! }]);
    expect(both).toContain('<a:ln w="38100">');
    expect(both.indexOf('<a:ln')).toBeLessThan(both.indexOf('<a:effectLst>'));
    expect(both.indexOf('<a:effectLst>')).toBeLessThan(both.indexOf('<a:latin'));
  });

  it('leaves files without outlines untouched and fails on a placeholder it cannot resolve', () => {
    const data = zipSync({ 'ppt/slides/slide1.xml': strToU8(run('Arial')) });
    expect(applyTextOutlines(data, [])).toBe(data);
    expect(() => apply(run('slideforge-outline-1'), [white])).toThrow('Unknown text outline placeholder slideforge-outline-1');
    const stray = zipSync({ 'ppt/slides/slide1.xml': strToU8(run('Arial')), 'ppt/notes.xml': strToU8(fonts('slideforge-outline-0')) });
    expect(() => applyTextOutlines(stray, [white])).toThrow('A text outline placeholder font was left in ppt/notes.xml');
  });
});
