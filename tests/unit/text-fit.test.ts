import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { widenTextBoxes, type SlideTextLayout } from '../../src/exporters/text-fit.js';

const textBox = (x: number, cx: number, align: string, fill = '<a:noFill/><a:ln/>') =>
  `<p:sp><p:spPr><a:xfrm><a:off x="${x}" y="100"/><a:ext cx="${cx}" cy="200"/></a:xfrm>${fill}</p:spPr>`
  + `<p:txBody><a:p><a:pPr algn="${align}"/><a:r><a:t>Text</a:t></a:r></a:p></p:txBody></p:sp>`;

function widen(shape: string, layout?: SlideTextLayout): string {
  const original = zipSync({
    'ppt/presentation.xml': strToU8('<p:presentation><p:sldSz cx="12192000" cy="6858000"/></p:presentation>'),
    'ppt/slides/slide1.xml': strToU8(`<p:sld>${shape}</p:sld>`),
  });
  return strFromU8(unzipSync(widenTextBoxes(original, undefined, layout && [layout]))['ppt/slides/slide1.xml']!);
}

describe('PowerPoint text box slack', () => {
  it('grows boxes away from their alignment so text keeps its position', () => {
    expect(widen(textBox(1000000, 3000000, 'l'))).toContain('<a:off x="1000000" y="100"/><a:ext cx="3180000" cy="200"/>');
    expect(widen(textBox(1000000, 3000000, 'ctr'))).toContain('<a:off x="910000" y="100"/><a:ext cx="3180000" cy="200"/>');
    expect(widen(textBox(1000000, 3000000, 'r'))).toContain('<a:off x="820000" y="100"/><a:ext cx="3180000" cy="200"/>');
  });

  it('applies the minimum to small labels and the maximum to wide boxes', () => {
    expect(widen(textBox(11285785, 296614, 'l'))).toContain('<a:ext cx="388054" cy="200"/>');
    expect(widen(textBox(0, 10000000, 'l'))).toContain('<a:ext cx="10457200" cy="200"/>');
  });

  it('stays inside the slide and leaves visible shapes unchanged', () => {
    expect(widen(textBox(11150000, 1000000, 'l'))).toContain('<a:ext cx="1042000" cy="200"/>');
    expect(widen(textBox(12000000, 192000, 'l'))).toContain('<a:ext cx="192000" cy="200"/>');
    const card = textBox(1000000, 3000000, 'l', '<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln/>');
    expect(widen(card)).toBe(`<p:sld>${card}</p:sld>`);
    const outlined = textBox(1000000, 3000000, 'l', '<a:noFill/><a:ln><a:solidFill><a:srgbClr val="000000"/></a:solidFill></a:ln>');
    expect(widen(outlined)).toBe(`<p:sld>${outlined}</p:sld>`);
  });

  it('limits slack to the nearest containing clipping region', () => {
    const layout = { clips: [{ left: 900000, right: 4050000, top: 0, bottom: 1000000 }], lists: [] };
    expect(widen(textBox(1000000, 3000000, 'l'), layout)).toContain('<a:ext cx="3050000" cy="200"/>');
    expect(widen(textBox(1000000, 3000000, 'r'), layout)).toContain('<a:off x="900000" y="100"/>');
    expect(widen(textBox(1000000, 3000000, 'ctr'), layout)).toContain('<a:off x="950000" y="100"/><a:ext cx="3100000" cy="200"/>');
    const fractional = { clips: [{ left: 900000.25, right: 4050000.75, top: 0, bottom: 1000000 }], lists: [] };
    expect(widen(textBox(1000000, 3000000, 'l'), fractional)).toContain('<a:ext cx="3050000" cy="200"/>');
  });

  it('removes duplicate list indentation while preserving the bullet hanging indent', () => {
    const shape = textBox(1000000, 3000000, 'l')
      .replace('<p:txBody>', '<p:txBody><a:bodyPr lIns="200000"/>')
      .replace('<a:pPr algn="l"/>', '<a:pPr algn="l" marL="169333" indent="-169333"/>');
    const layout = { clips: [], lists: [{ x: 1000000, y: 100, width: 3000000 }] };
    expect(widen(shape, layout)).toContain('lIns="30667"');
    expect(widen(shape, layout)).toContain('marL="169333" indent="-169333"');
    expect(widen(shape)).toContain('lIns="200000"');
    expect(widen(shape.replace('algn="l"', 'algn="l" lvl="1"'), layout)).toContain('lIns="200000"');
  });

  it('gives top-aligned lists only the measured remaining vertical space', () => {
    const shape = textBox(1000000, 3000000, 'l').replace('<p:txBody>', '<p:txBody><a:bodyPr anchor="t"/>');
    const layout = { clips: [], lists: [{ x: 1000000, y: 100, width: 3000000, height: 400.75 }] };
    expect(widen(shape, layout)).toContain('cy="400"');
    expect(widen(shape.replace('anchor="t"', 'anchor="ctr"'), layout)).toContain('cy="200"');
  });
});
