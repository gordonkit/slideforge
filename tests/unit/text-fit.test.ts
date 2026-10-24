import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { widenTextBoxes } from '../../src/exporters/text-fit.js';

const textBox = (x: number, cx: number, align: string, fill = '<a:noFill/><a:ln/>') =>
  `<p:sp><p:spPr><a:xfrm><a:off x="${x}" y="100"/><a:ext cx="${cx}" cy="200"/></a:xfrm>${fill}</p:spPr>`
  + `<p:txBody><a:p><a:pPr algn="${align}"/><a:r><a:t>Text</a:t></a:r></a:p></p:txBody></p:sp>`;

function widen(shape: string): string {
  const original = zipSync({
    'ppt/presentation.xml': strToU8('<p:presentation><p:sldSz cx="12192000" cy="6858000"/></p:presentation>'),
    'ppt/slides/slide1.xml': strToU8(`<p:sld>${shape}</p:sld>`),
  });
  return strFromU8(unzipSync(widenTextBoxes(original))['ppt/slides/slide1.xml']!);
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
});
