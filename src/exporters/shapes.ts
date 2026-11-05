import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Page } from 'playwright';
import { SLIDE_SIZE } from '../themes/tokens.js';

/** Attribute that carries a polygon's soft shadow from the page to the exported SVG. */
const SHADOW_ATTRIBUTE = 'data-sf-shadow';

const EMU_PER_PX = SLIDE_SIZE.widthInches * 914400 / SLIDE_SIZE.widthPx;

/**
 * The converter writes an SVG as a picture, and a CSS `filter` would turn it into a bitmap. Read each
 * card polygon's `drop-shadow` into an attribute of its SVG and switch the filter off, so
 * `applyPolygonShapes` can write the shadow as a native PowerPoint effect.
 */
export async function markPolygonShadows(page: Page, selector: string): Promise<void> {
  await page.locator(selector).evaluateAll((slides, attribute) => {
    const context = document.createElement('canvas').getContext('2d')!;
    for (const slide of slides as HTMLElement[]) {
      for (const svg of slide.querySelectorAll<SVGElement>('svg.sf-card-shape')) {
        // `drop-shadow(rgba(0, 0, 0, 0.3) 0px 8px 8px)`; the radius is a standard deviation, so the
        // matching blur radius is twice it.
        const parts = getComputedStyle(svg).filter.match(/drop-shadow\((rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px\s+(-?[\d.]+)px\)/i);
        if (!parts) continue;
        context.fillStyle = '#000000';
        context.fillStyle = parts[1]!;
        const normalized = String(context.fillStyle);
        const rgba = normalized.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
        const alpha = rgba ? Number(rgba[4]) : 1;
        const hex = rgba
          ? rgba.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('')
          : normalized.slice(1);
        if (alpha > 0) svg.setAttribute(attribute, `${parts[2]} ${parts[3]} ${Number(parts[4]) * 2} ${hex.toUpperCase()} ${alpha}`);
        svg.style.setProperty('filter', 'none', 'important');
      }
    }
  }, SHADOW_ATTRIBUTE);
}

function shadowXml(value: string): string {
  const [x = 0, y = 0, blur = 0, color = '000000', alpha = 1] = value.split(' ').map((part, index) => index === 3 ? part : Number(part)) as [number, number, number, string, number];
  const direction = Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360 * 60000);
  const opacity = alpha < 1 ? `<a:alpha val="${Math.round(alpha * 100000)}"/>` : '';
  return `<a:effectLst><a:outerShdw blurRad="${Math.round(blur * EMU_PER_PX)}" dist="${Math.round(Math.hypot(x, y) * EMU_PER_PX)}" dir="${direction}" algn="ctr" rotWithShape="0"><a:srgbClr val="${color}">${opacity}</a:srgbClr></a:outerShdw></a:effectLst>`;
}

/** The freeform shape for a card polygon's SVG, or `undefined` when it is some other picture. */
function polygonShape(svg: string, id: string, name: string, transform: string): string | undefined {
  if (!svg.includes('sf-card-shape')) return undefined;
  const points = svg.match(/<polygon\b[^>]*\bpoints="([^"]+)"/)?.[1];
  const viewBox = svg.match(/viewBox="([\d.\s-]+)"/)?.[1]?.trim().split(/\s+/).map(Number);
  const fill = svg.match(/<polygon\b[^>]*fill:\s*rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!points || viewBox?.length !== 4 || !fill) return undefined;
  const color = fill.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('').toUpperCase();
  const [, , width, height] = viewBox as [number, number, number, number];
  const scale = 1000;
  const path = points.trim().split(/\s+/).map((point, index) => {
    const [x = 0, y = 0] = point.split(',').map(Number);
    return `<a:${index ? 'lnTo' : 'moveTo'}><a:pt x="${Math.round(x * scale)}" y="${Math.round(y * scale)}"/></a:${index ? 'lnTo' : 'moveTo'}>`;
  }).join('');
  const shadow = svg.match(new RegExp(`${SHADOW_ATTRIBUTE}="([^"]*)"`))?.[1];
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr/><p:nvPr/></p:nvSpPr><p:spPr>${transform}`
    + `<a:custGeom><a:avLst/><a:gdLst/><a:ahLst/><a:cxnLst/><a:rect l="0" t="0" r="r" b="b"/><a:pathLst><a:path w="${Math.round(width * scale)}" h="${Math.round(height * scale)}">${path}<a:close/></a:path></a:pathLst></a:custGeom>`
    + `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill><a:ln><a:noFill/></a:ln>${shadow ? shadowXml(shadow) : ''}</p:spPr></p:sp>`;
}

/**
 * Replace the SVG pictures of hexagon and pentagon cards with native freeform shapes: they stay
 * editable, and keep the soft shadow `markPolygonShadows` read. Other pictures are untouched.
 */
export function applyPolygonShapes(data: Uint8Array): Uint8Array {
  const files = unzipSync(data);
  let changed = false;
  for (const path of Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))) {
    const relationshipsPath = path.replace('slides/', 'slides/_rels/') + '.rels';
    const relationshipsFile = files[relationshipsPath];
    if (!relationshipsFile) continue;
    let relationships = strFromU8(relationshipsFile);
    const targets = new Map([...relationships.matchAll(/<Relationship\b[^>]*\bId="([^"]+)"[^>]*\bTarget="([^"]+)"/g)].map(match => [match[1]!, match[2]!]));
    const removed: string[] = [];
    const slide = strFromU8(files[path]!).replace(/<p:pic>[\s\S]*?<\/p:pic>/g, (picture: string) => {
      const svgId = picture.match(/<asvg:svgBlip\b[^>]*\br:embed="([^"]+)"/)?.[1];
      const target = svgId ? targets.get(svgId) : undefined;
      const media = target ? files[`ppt/${target.replace(/^\.\.\//, '')}`] : undefined;
      if (!media) return picture;
      const id = picture.match(/<p:cNvPr\b[^>]*\bid="(\d+)"/)?.[1] ?? '0';
      const transform = picture.match(/<a:xfrm>[\s\S]*?<\/a:xfrm>/)?.[0] ?? '';
      const shape = polygonShape(strFromU8(media), id, 'Card shape', transform);
      if (!shape) return picture;
      removed.push(...[...picture.matchAll(/\br:embed="([^"]+)"/g)].map(match => match[1]!));
      return shape;
    });
    if (!removed.length) continue;
    changed = true;
    files[path] = strToU8(slide);
    // The pictures are gone: drop their relationships and media, which only they used.
    for (const id of removed) {
      const target = targets.get(id);
      relationships = relationships.replace(new RegExp(`<Relationship\\b[^>]*\\bId="${id}"[^>]*/>`), '');
      if (target) delete files[`ppt/${target.replace(/^\.\.\//, '')}`];
    }
    files[relationshipsPath] = strToU8(relationships);
  }
  return changed ? zipSync(files) : data;
}
