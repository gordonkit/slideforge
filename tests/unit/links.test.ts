import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { applyLinks, type SlideLink } from '../../src/exporters/links.js';

const shape = (id: number, x: number, y: number, cx: number, cy: number) =>
  `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Shape ${id}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm></p:spPr></p:sp>`;
const rels = '<Relationships><Relationship Id="rId1" Type="layout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>';

function build(): Uint8Array {
  return zipSync({
    'ppt/slides/slide1.xml': strToU8(`<p:spTree>${shape(2, 0, 0, 9000000, 5000000)}${shape(3, 1000000, 1000000, 6000000, 800000)}${shape(4, 1200000, 1100000, 500000, 500000)}${shape(5, 1000000, 3000000, 6000000, 800000)}</p:spTree>`),
    'ppt/slides/_rels/slide1.xml.rels': strToU8(rels),
    'ppt/slides/slide2.xml': strToU8('<p:spTree/>'),
    'ppt/slides/_rels/slide2.xml.rels': strToU8(rels),
  });
}
const link: SlideLink = { from: 1, to: 2, x: 1000000, y: 1000000, width: 6000000, height: 800000 };

describe('slide links', () => {
  it('makes the shapes inside a link area jump to the target slide', () => {
    const files = unzipSync(applyLinks(build(), [link]));
    const slide = strFromU8(files['ppt/slides/slide1.xml']!);
    const jump = '<a:hlinkClick r:id="rId2" action="ppaction://hlinksldjump"/>';
    // The row box and the shape inside it; not the full-slide shape, and not the row below.
    expect(slide.split(jump)).toHaveLength(3);
    expect(slide).toContain(`<p:cNvPr id="3" name="Shape 3">${jump}</p:cNvPr>`);
    expect(slide).toContain(`<p:cNvPr id="4" name="Shape 4">${jump}</p:cNvPr>`);
    expect(slide).toContain('<p:cNvPr id="2" name="Shape 2"/>');
    expect(slide).toContain('<p:cNvPr id="5" name="Shape 5"/>');
    expect(strFromU8(files['ppt/slides/_rels/slide1.xml.rels']!)).toContain(
      '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slide2.xml"/>');
  });

  it('gives each link its own relationship, and leaves a deck without links untouched', () => {
    const files = unzipSync(applyLinks(build(), [link, { ...link, y: 3000000 }]));
    const relationships = strFromU8(files['ppt/slides/_rels/slide1.xml.rels']!);
    expect(relationships).toContain('Id="rId2"');
    expect(relationships).toContain('Id="rId3"');
    expect(strFromU8(files['ppt/slides/slide1.xml']!)).toContain('<p:cNvPr id="5" name="Shape 5"><a:hlinkClick r:id="rId3"');
    const data = build();
    expect(applyLinks(data, [])).toBe(data);
  });

  it('fails when the target slide was not exported', () => {
    expect(() => applyLinks(build(), [{ ...link, to: 3 }])).toThrow('links to slide 3, which was not exported');
  });
});
