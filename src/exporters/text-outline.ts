import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Page } from 'playwright';
import { SLIDE_SIZE } from '../themes/tokens.js';

/** A soft `text-shadow` to write as a PowerPoint text shadow. */
export interface TextShadow {
  /** Offset in CSS pixels. */
  x: number;
  y: number;
  /** Blur radius in CSS pixels; the shadow fades out smoothly over it. */
  blur: number;
  /** Six-digit hex color without `#`. */
  color: string;
  /** Opacity from 0 to 1. */
  alpha: number;
}

/**
 * A `-webkit-text-stroke` to write as a PowerPoint text outline, and/or a `text-shadow` to write as a
 * PowerPoint text shadow. An element with only a shadow has an outline `width` of 0.
 */
export interface TextOutline {
  /** The first font family, as the converter would have written it without the marker. */
  family: string;
  /** Stroke width in CSS pixels. */
  width: number;
  /** Six-digit hex color without `#`. */
  color: string;
  /** Opacity from 0 to 1. */
  alpha: number;
  shadow?: TextShadow;
  fill?: { color: string; alpha: number };
}

/** Prefix of the placeholder font family that carries an outline through the converter. */
export const OUTLINE_FONT_PREFIX = 'slideforge-outline-';

const EMU_PER_PX = SLIDE_SIZE.widthInches * 914400 / SLIDE_SIZE.widthPx;

function xml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}

/**
 * The converter ignores `-webkit-text-stroke` and rounds text opacity, but copies the first font family of every text
 * run into the PowerPoint XML. Prefix stroked and shadowed elements' fonts with a placeholder family naming
 * their effects; the browser skips the unknown family, so rendering and measurement stay the
 * same. Returns the outlines by placeholder index for `applyTextOutlines`.
 */
export async function markTextOutlines(page: Page, selector: string): Promise<TextOutline[]> {
  return page.locator(selector).evaluateAll((slides, prefix) => {
    const context = document.createElement('canvas').getContext('2d')!;
    const outlines: Array<{
      family: string; width: number; color: string; alpha: number;
      shadow?: { x: number; y: number; blur: number; color: string; alpha: number };
      fill?: { color: string; alpha: number };
    }> = [];
    const indexes = new Map<string, number>();
    const elements = (slides as HTMLElement[]).flatMap(slide => [slide, ...slide.querySelectorAll<HTMLElement>('*')]);
    // The canvas normalizes any CSS color to `#rrggbb`, or `rgba(...)` when translucent.
    const colorOf = (css: string) => {
      context.fillStyle = '#000000';
      context.fillStyle = css;
      const normalized = String(context.fillStyle);
      const rgba = normalized.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
      const alpha = rgba ? Number(rgba[4]) : 1;
      const hex = rgba
        ? rgba.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('')
        : normalized.slice(1);
      return { color: hex.toUpperCase(), alpha };
    };
    // Read every style before writing any, since a marked font is inherited.
    const styles = elements.map(element => {
      const style = getComputedStyle(element);
      const family = style.fontFamily;
      const authoredOpacity = element.dataset.sfTextOpacity;
      let effectiveOpacity = 1;
      if (authoredOpacity !== undefined) {
        for (let ancestor: HTMLElement | null = element; ancestor; ancestor = ancestor.parentElement) {
          effectiveOpacity *= ancestor.dataset.sfTextOpacity === '0' ? 0 : Number(getComputedStyle(ancestor).opacity);
        }
      }
      const width = parseFloat(style.webkitTextStrokeWidth) || 0;
      const stroke = width > 0 ? colorOf(style.webkitTextStrokeColor) : undefined;
      // The first shadow only: `rgba(0, 0, 0, 0.45) 0px 10px 30px`.
      const parts = style.textShadow.match(/^(rgba?\([^)]*\)|#[0-9a-f]+|[a-z]+)\s+(-?[\d.]+)px\s+(-?[\d.]+)px(?:\s+(-?[\d.]+)px)?/i);
      const shade = parts ? colorOf(parts[1]!) : undefined;
      const shadow = parts && shade && shade.alpha > 0
        ? { x: Number(parts[2]), y: Number(parts[3]), blur: Number(parts[4] ?? 0), ...shade }
        : undefined;
      const stroked = stroke !== undefined && stroke.alpha > 0;
      if (!stroked && !shadow && authoredOpacity === undefined) return { family };
      const fill = authoredOpacity === undefined ? undefined : colorOf(style.color);
      return {
        family,
        outline: {
          family: family.split(',')[0]!.trim().replace(/['"]/g, ''),
          width: stroked ? width : 0, color: stroked ? stroke.color : '000000', alpha: stroked ? stroke.alpha * effectiveOpacity : 1,
          ...(shadow ? { shadow: { ...shadow, alpha: shadow.alpha * effectiveOpacity } } : {}),
          ...(fill ? { fill: { ...fill, alpha: fill.alpha * effectiveOpacity } } : {}),
        },
      };
    });
    const stroked = new Set(elements.filter((_, index) => styles[index]!.outline));
    elements.forEach((element, index) => {
      const { family, outline } = styles[index]!;
      if (!outline) {
        // An unmarked element inside a marked one would inherit the placeholder.
        if (element.parentElement && stroked.has(element.parentElement)) {
          element.style.setProperty('font-family', family, 'important');
        }
        return;
      }
      const key = JSON.stringify(outline);
      let marker = indexes.get(key);
      if (marker === undefined) {
        marker = outlines.push(outline) - 1;
        indexes.set(key, marker);
      }
      element.style.setProperty('font-family', `"${prefix}${marker}", ${family}`, 'important');
    });
    return outlines;
  }, OUTLINE_FONT_PREFIX);
}

/** A soft outer shadow: the blur radius fades the shadow out, as in CSS. */
function shadowXml({ x, y, blur, color, alpha }: TextShadow): string {
  const direction = Math.round(((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360 * 60000);
  const opacity = alpha < 1 ? `<a:alpha val="${Math.round(alpha * 100000)}"/>` : '';
  return `<a:effectLst><a:outerShdw blurRad="${Math.round(blur * EMU_PER_PX)}" dist="${Math.round(Math.hypot(x, y) * EMU_PER_PX)}" dir="${direction}" algn="ctr" rotWithShape="0"><a:srgbClr val="${color}">${opacity}</a:srgbClr></a:outerShdw></a:effectLst>`;
}

/** Run properties list the effects after the fill and before the highlight, underline, and fonts. */
const AFTER_EFFECTS = /<a:(highlight|uLnTx|uLn|uFillTx|uFill|latin|ea|cs|sym|hlinkClick|hlinkMouseOver|rtl|extLst)\b/;

function outlineXml({ width, color, alpha }: TextOutline): string {
  const opacity = alpha < 1 ? `<a:alpha val="${Math.round(alpha * 100000)}"/>` : '';
  const fill = opacity ? `<a:srgbClr val="${color}">${opacity}</a:srgbClr>` : `<a:srgbClr val="${color}"/>`;
  return `<a:ln w="${Math.round(width * EMU_PER_PX)}"><a:solidFill>${fill}</a:solidFill></a:ln>`;
}

function applyFill(children: string, fill: NonNullable<TextOutline['fill']>): string {
  const opacity = fill.alpha < 1 ? `<a:alpha val="${Math.round(fill.alpha * 100000)}"/>` : '';
  const color = opacity ? `<a:srgbClr val="${fill.color}">${opacity}</a:srgbClr>` : `<a:srgbClr val="${fill.color}"/>`;
  const replacement = `<a:solidFill>${color}</a:solidFill>`;
  const line = children.match(/^<a:ln\b(?:[^>]*\/>|[\s\S]*?<\/a:ln>)/)?.[0] ?? '';
  const rest = children.slice(line.length);
  const existing = /<a:solidFill>[\s\S]*?<\/a:solidFill>/;
  if (existing.test(rest)) return line + rest.replace(existing, replacement);
  return line + replacement + rest;
}

/**
 * Give runs that carry an outline placeholder a PowerPoint text outline (`<a:ln>`, the first
 * child of the run properties) and/or text shadow (`<a:effectLst>`, after the fill) and restore their
 * font family. Fails if a placeholder is left.
 */
export function applyTextOutlines(data: Uint8Array, outlines: readonly TextOutline[]): Uint8Array {
  if (!outlines.length) return data;
  const files = unzipSync(data);
  const marker = new RegExp(`typeface="${OUTLINE_FONT_PREFIX}(\\d+)"`, 'g');
  for (const path of Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))) {
    const slide = strFromU8(files[path]!);
    files[path] = strToU8(slide.replace(
      /<a:(rPr|endParaRPr|defRPr)\b([^>]*[^/>])?>([\s\S]*?)<\/a:\1>/g,
      (properties: string, tag: string, attributes = '', children: string) => {
        const index = children.match(new RegExp(marker.source))?.[1];
        if (index === undefined) return properties;
        const outline = outlines[Number(index)];
        if (!outline) throw new Error(`Unknown text outline placeholder ${OUTLINE_FONT_PREFIX}${index}`);
        const named = children
          .replace(marker, (_, other: string) => `typeface="${xml(outlines[Number(other)]?.family ?? '')}"`);
        const withoutLine = outline.width > 0 ? named.replace(/<a:ln\b[\s\S]*?(?:\/>|<\/a:ln>)/, '') : named;
        const restored = outline.fill ? applyFill(withoutLine, outline.fill) : withoutLine;
        const effect = outline.shadow ? shadowXml(outline.shadow) : '';
        const anchor = restored.search(AFTER_EFFECTS);
        const body = anchor < 0 ? restored + effect : restored.slice(0, anchor) + effect + restored.slice(anchor);
        return `<a:${tag}${attributes}>${outline.width > 0 ? outlineXml(outline) : ''}${body}</a:${tag}>`;
      },
    ));
  }
  const left = Object.keys(files).find(path => strFromU8(files[path]!, true).includes(OUTLINE_FONT_PREFIX));
  if (left) throw new Error(`A text outline placeholder font was left in ${left}`);
  return zipSync(files);
}
