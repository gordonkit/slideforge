import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { applyPolygonShapes } from '../../src/exporters/shapes.js';

const hexagon = (shadow = '') => `<svg class="sf-card-shape" viewBox="0 0 100 86.6" ${shadow} width="556" height="481.5" xmlns="http://www.w3.org/2000/svg">`
  + '<polygon points="25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3" style="fill: rgb(37, 99, 235); stroke-width: 1px;"/></svg>';
const picture = (png: string, svg: string) => '<p:pic><p:nvPicPr><p:cNvPr id="4" name="Picture 8" descr="__type_image"/><p:cNvPicPr/><p:nvPr/></p:nvPicPr>'
  + `<p:blipFill><a:blip r:embed="${png}"><a:extLst><a:ext><asvg:svgBlip r:embed="${svg}"/></a:ext></a:extLst></a:blip></p:blipFill>`
  + '<p:spPr><a:xfrm><a:off x="609600" y="2452688"/><a:ext cx="3530600" cy="3057525"/></a:xfrm><a:prstGeom prst="rect"/></p:spPr></p:pic>';
const relationships = (...entries: Array<[string, string]>) => '<Relationships>'
  + entries.map(([id, target]) => `<Relationship Id="${id}" Type="image" Target="../media/${target}"/>`).join('') + '</Relationships>';

function apply(files: Record<string, string>): Record<string, string> {
  const out = unzipSync(applyPolygonShapes(zipSync(Object.fromEntries(Object.entries(files).map(([path, text]) => [path, strToU8(text)])))));
  return Object.fromEntries(Object.entries(out).map(([path, bytes]) => [path, strFromU8(bytes)]));
}

describe('native card polygons', () => {
  const base = (svg: string) => ({
    'ppt/slides/slide1.xml': `<p:spTree>${picture('rId1', 'rId2')}</p:spTree>`,
    'ppt/slides/_rels/slide1.xml.rels': relationships(['rId1', 'a.png'], ['rId2', 'a.svg']),
    'ppt/media/a.png': 'png', 'ppt/media/a.svg': svg,
  });

  it('replaces a card polygon picture with a freeform shape at the same place, in the same color', () => {
    const out = apply(base(hexagon()));
    const slide = out['ppt/slides/slide1.xml']!;
    expect(slide).not.toContain('<p:pic>');
    expect(slide).toContain('<p:cNvPr id="4" name="Card shape"/>');
    expect(slide).toContain('<a:off x="609600" y="2452688"/><a:ext cx="3530600" cy="3057525"/>');
    expect(slide).toContain('<a:path w="100000" h="86600"><a:moveTo><a:pt x="25000" y="0"/></a:moveTo><a:lnTo><a:pt x="75000" y="0"/></a:lnTo>');
    expect(slide).toContain('<a:srgbClr val="2563EB"/></a:solidFill><a:ln><a:noFill/></a:ln></p:spPr>');
    expect(slide).not.toContain('effectLst');
  });

  it('writes the soft shadow as an outer shadow with a blur radius, and drops the unused media', () => {
    const out = apply(base(hexagon('data-sf-shadow="0 8 16 000000 0.3"')));
    expect(out['ppt/slides/slide1.xml']).toContain('<a:effectLst><a:outerShdw blurRad="101600" dist="50800" dir="5400000" algn="ctr" rotWithShape="0">'
      + '<a:srgbClr val="000000"><a:alpha val="30000"/></a:srgbClr></a:outerShdw></a:effectLst>');
    expect(out['ppt/slides/_rels/slide1.xml.rels']).toBe('<Relationships></Relationships>');
    expect(Object.keys(out).filter(path => path.startsWith('ppt/media/'))).toEqual([]);
  });

  it('leaves other pictures, and files without pictures, untouched', () => {
    const data = zipSync({ 'ppt/slides/slide1.xml': strToU8('<p:spTree/>') });
    expect(applyPolygonShapes(data)).toBe(data);
    const other = base('<svg viewBox="0 0 10 10"><rect width="10" height="10"/></svg>');
    const out = apply(other);
    expect(out['ppt/slides/slide1.xml']).toBe(other['ppt/slides/slide1.xml']);
    expect(out['ppt/media/a.svg']).toBe(other['ppt/media/a.svg']);
  });
});
