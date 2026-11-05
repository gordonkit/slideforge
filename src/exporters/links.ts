import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Page } from 'playwright';
import { SLIDE_SIZE } from '../themes/tokens.js';

/** A link to another slide: the area it covers on its own slide, in EMU. */
export interface SlideLink {
  /** 1-based number of the slide that holds the link. */
  from: number;
  /** 1-based number of the slide it jumps to. */
  to: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

const EMU_PER_PX = SLIDE_SIZE.widthInches * 914400 / SLIDE_SIZE.widthPx;
/** Converted shapes may differ from the browser's box by a rounding step. */
const TOLERANCE = 12700;
const SLIDE_RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide';

/**
 * Find every `a[data-sf-link]` and record the area it covers. The converter would treat its `href`
 * as an external link, so the attribute is removed; `applyLinks` writes PowerPoint's own jump.
 */
export async function markLinks(page: Page, selector: string): Promise<SlideLink[]> {
  const links = await page.locator(selector).evaluateAll((slides, emuPerPixel) => (slides as HTMLElement[]).flatMap((slide, index) => {
    const origin = slide.getBoundingClientRect();
    return [...slide.querySelectorAll<HTMLElement>('a[data-sf-link]')].map(link => {
      const box = link.getBoundingClientRect();
      link.removeAttribute('href');
      return {
        from: index + 1, to: Number(link.getAttribute('data-sf-link')),
        x: Math.round((box.left - origin.left) * emuPerPixel), y: Math.round((box.top - origin.top) * emuPerPixel),
        width: Math.round(box.width * emuPerPixel), height: Math.round(box.height * emuPerPixel),
      };
    });
  }), EMU_PER_PX);
  return links;
}

/**
 * Make every shape inside a link's area a PowerPoint "go to slide" button: the row's box, number, and
 * text all jump to the target in slide show. Fails when a target slide is missing.
 */
export function applyLinks(data: Uint8Array, links: readonly SlideLink[]): Uint8Array {
  if (!links.length) return data;
  const files = unzipSync(data);
  const slides = Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path)).length;
  for (const from of new Set(links.map(link => link.from))) {
    const path = `ppt/slides/slide${from}.xml`;
    const relationships = `ppt/slides/_rels/slide${from}.xml.rels`;
    if (!files[path] || !files[relationships]) throw new Error(`Slide ${from} is missing from the export`);
    let slide = strFromU8(files[path]!);
    let rels = strFromU8(files[relationships]!);
    let next = 1 + Math.max(0, ...[...rels.matchAll(/Id="rId(\d+)"/g)].map(match => Number(match[1])));
    for (const link of links.filter(candidate => candidate.from === from)) {
      if (link.to > slides) throw new Error(`Slide ${from} links to slide ${link.to}, which was not exported`);
      const id = `rId${next++}`;
      rels = rels.replace('</Relationships>', `<Relationship Id="${id}" Type="${SLIDE_RELATIONSHIP}" Target="slide${link.to}.xml"/></Relationships>`);
      const action = `<a:hlinkClick r:id="${id}" action="ppaction://hlinksldjump"/>`;
      slide = slide.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, (shape: string) => {
        const box = shape.match(/<a:off x="(-?\d+)" y="(-?\d+)"\/><a:ext cx="(\d+)" cy="(\d+)"\/>/);
        if (!box || shape.includes('<a:hlinkClick')) return shape;
        const [x, y, width, height] = box.slice(1).map(Number) as [number, number, number, number];
        const inside = x >= link.x - TOLERANCE && y >= link.y - TOLERANCE
          && x + width <= link.x + link.width + TOLERANCE && y + height <= link.y + link.height + TOLERANCE;
        if (!inside) return shape;
        return shape.replace(/<p:cNvPr\b([^>]*?)(\/)?>/, (_, attributes: string, selfClosing?: string) =>
          selfClosing ? `<p:cNvPr${attributes}>${action}</p:cNvPr>` : `<p:cNvPr${attributes}>${action}`);
      });
    }
    files[path] = strToU8(slide);
    files[relationships] = strToU8(rels);
  }
  return zipSync(files);
}
