import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { parsePresentation, presentationSchema, slideBackground } from '../../src/schemas/presentation.js';
import { studioRenderUrl } from '../../src/schemas/background.js';
import { renderPresentation } from '../../src/renderers/html.js';
import { applyBackgrounds } from '../../src/exporters/backgrounds.js';

const share = 'https://bg.gordonkit.com/studio#d=1PYoxCoAwEMD-EtdDFHG531';
const deck = (extra: object, slides: object[] = [{ layout: 'cover', title: 'Hello' }]) =>
  ({ metadata: { title: 'Demo' }, slides, ...extra });

describe('background schema', () => {
  it('resolves the slide, then its layout, then the default; "none" opts out', () => {
    const presentation = parsePresentation(deck({ backgrounds: { default: 'default.png', cover: 'cover.svg' } }, [
      { layout: 'cover', title: 'Cover' },
      { layout: 'content', title: 'Content', blocks: [{ type: 'paragraph', text: 'Body' }] },
      { layout: 'content', title: 'Own', background: share, blocks: [{ type: 'paragraph', text: 'Body' }] },
      { layout: 'cover', title: 'Plain', background: 'none' },
    ]));
    expect(presentation.slides.map(slide => slideBackground(presentation, slide)))
      .toEqual(['cover.svg', 'default.png', share, undefined]);
    expect(slideBackground(parsePresentation(deck({})), parsePresentation(deck({})).slides[0]!)).toBeUndefined();
  });

  it.each([
    share,
    'https://bg.gordonkit.com/render#d=1abc',
    'http://localhost:5173/studio#d=1abc',
    'http://127.0.0.1:5199/studio/#x=1&d=1abc',
  ])('accepts the trusted studio link %s', source => {
    expect(presentationSchema.safeParse(deck({ backgrounds: { default: source } })).success).toBe(true);
  });

  it.each([
    ['another host', 'https://studio.example.com/studio#d=1abc'],
    ['plain HTTP for the hosted studio', 'http://bg.gordonkit.com/studio#d=1abc'],
    ['an unsafe image source', 'javascript:alert(1)'],
  ])('rejects %s', (_name, source) => {
    expect(presentationSchema.safeParse(deck({ backgrounds: { default: source } })).success).toBe(false);
    expect(presentationSchema.safeParse(deck({}, [{ layout: 'cover', title: 'X', background: source }])).success).toBe(false);
  });

  it('rejects unknown background keys', () => {
    expect(presentationSchema.safeParse(deck({ backgrounds: { gallery: 'a.png' } })).success).toBe(false);
  });

  it('maps a share link to the render page and leaves other sources alone', () => {
    expect(studioRenderUrl(`${share}`)).toBe('https://bg.gordonkit.com/render#d=1PYoxCoAwEMD-EtdDFHG531');
    expect(studioRenderUrl('http://localhost:5199/studio?g=wave#d=1abc')).toBe('http://localhost:5199/render#d=1abc');
    expect(studioRenderUrl('https://bg.gordonkit.com/studio?g=wave')).toBeUndefined();
    expect(studioRenderUrl('https://example.com/a.png')).toBeUndefined();
  });
});

describe('background rendering', () => {
  it('puts an image or a studio frame first in the slide, and nothing without a background', () => {
    const html = renderPresentation(deck({ backgrounds: { cover: 'cover.svg' } }, [
      { layout: 'cover', title: 'Image' },
      { layout: 'cover', title: 'Studio', background: share },
      { layout: 'cover', title: 'None', background: 'none' },
    ]));
    const slides = html.split('<section').slice(1);
    expect(slides[0]).toMatch(/^[^>]*>\s*<div class="sf-background" data-pptx-background="" aria-hidden="true"><img src="cover.svg" alt=""\/>/);
    expect(slides[1]).toContain('<iframe src="https://bg.gordonkit.com/render#d=1PYoxCoAwEMD-EtdDFHG531" title="Background" tabindex="-1">');
    expect(slides[2]).not.toContain('data-pptx-background');
  });
});

describe('PowerPoint slide backgrounds', () => {
  const slide = (n: number) => `<?xml version="1.0"?><p:sld xmlns:a="a" xmlns:p="p" xmlns:r="r"><p:cSld name="${n}"><p:bg><p:bgPr><a:solidFill/></p:bgPr></p:bg><p:spTree/></p:cSld></p:sld>`;
  const pptx = () => zipSync({
    '[Content_Types].xml': strToU8('<Types xmlns="t"><Default Extension="xml" ContentType="application/xml"/></Types>'),
    'ppt/presentation.xml': strToU8('<p:presentation><p:sldIdLst><p:sldId id="256" r:id="rId3"/><p:sldId id="257" r:id="rId2"/><p:sldId id="258" r:id="rId4"/></p:sldIdLst></p:presentation>'),
    'ppt/_rels/presentation.xml.rels': strToU8('<Relationships><Relationship Id="rId2" Target="slides/slide2.xml"/><Relationship Id="rId3" Target="slides/slide1.xml"/><Relationship Id="rId4" Target="slides/slide3.xml"/></Relationships>'),
    'ppt/slides/slide1.xml': strToU8(slide(1)),
    'ppt/slides/slide2.xml': strToU8(slide(2)),
    'ppt/slides/slide3.xml': strToU8(slide(3)),
    'ppt/slides/_rels/slide1.xml.rels': strToU8('<Relationships xmlns="r"><Relationship Id="rId1" Type="layout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>'),
  });

  it('replaces the slide background in presentation order and stores each image once', () => {
    const image = new Uint8Array([1, 2, 3]);
    const files = unzipSync(applyBackgrounds(pptx(), [image, undefined, image]));
    const media = Object.keys(files).filter(path => path.startsWith('ppt/media/'));
    expect(media).toHaveLength(1);
    // The first slide in order is slide1.xml (rId3); the second, slide2.xml, keeps its own background.
    for (const path of ['ppt/slides/slide1.xml', 'ppt/slides/slide3.xml']) {
      const xml = strFromU8(files[path]!);
      expect(xml).toContain('<p:cSld name="');
      expect(xml.match(/<p:bg>/g)).toHaveLength(1);
      expect(xml).toMatch(/<p:cSld name="\d"><p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="rIdSlideForgeBackground"\/>/);
    }
    expect(strFromU8(files['ppt/slides/slide2.xml']!)).toBe(slide(2));
    expect(strFromU8(files['ppt/slides/_rels/slide1.xml.rels']!))
      .toContain(`<Relationship Id="rIdSlideForgeBackground" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../${media[0]!.slice(4)}"/>`);
    expect(strFromU8(files['ppt/slides/_rels/slide1.xml.rels']!)).toContain('rId1');
    expect(strFromU8(files['ppt/slides/_rels/slide3.xml.rels']!)).toContain('rIdSlideForgeBackground');
    expect(strFromU8(files['[Content_Types].xml']!)).toContain('<Default Extension="png" ContentType="image/png"/>');
  });

  it('leaves the package untouched when no slide has a background', () => {
    const original = pptx();
    expect(applyBackgrounds(original, [undefined, undefined, undefined])).toBe(original);
  });

  it('refuses a background list that does not match the slides', () => {
    expect(() => applyBackgrounds(pptx(), [new Uint8Array([1])])).toThrow('Expected 3 slide backgrounds, got 1');
  });
});
