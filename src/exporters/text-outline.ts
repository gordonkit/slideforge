import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Page } from 'playwright';
import { SLIDE_SIZE } from '../themes/tokens.js';

/** A `-webkit-text-stroke` to write as a PowerPoint text outline. */
export interface TextOutline {
  /** The first font family, as the converter would have written it without the marker. */
  family: string;
  /** Stroke width in CSS pixels. */
  width: number;
  /** Six-digit hex color without `#`. */
  color: string;
  /** Opacity from 0 to 1. */
  alpha: number;
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
 * The converter ignores `-webkit-text-stroke` but copies the first font family of every text
 * run into the PowerPoint XML. Prefix stroked elements' fonts with a placeholder family naming
 * their outline; the browser skips the unknown family, so rendering and measurement stay the
 * same. Returns the outlines by placeholder index for `applyTextOutlines`.
 */
export async function markTextOutlines(page: Page, selector: string): Promise<TextOutline[]> {
  return page.locator(selector).evaluateAll((slides, prefix) => {
    const context = document.createElement('canvas').getContext('2d')!;
    const outlines: Array<{ family: string; width: number; color: string; alpha: number }> = [];
    const indexes = new Map<string, number>();
    const elements = (slides as HTMLElement[]).flatMap(slide => [slide, ...slide.querySelectorAll<HTMLElement>('*')]);
    // Read every style before writing any, since a marked font is inherited.
    const styles = elements.map(element => {
      const style = getComputedStyle(element);
      const width = parseFloat(style.webkitTextStrokeWidth) || 0;
      if (width <= 0) return { family: style.fontFamily };
      // The canvas normalizes any CSS color to `#rrggbb`, or `rgba(...)` when translucent.
      context.fillStyle = '#000000';
      context.fillStyle = style.webkitTextStrokeColor;
      const normalized = String(context.fillStyle);
      const rgba = normalized.match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
      const alpha = rgba ? Number(rgba[4]) : 1;
      if (alpha <= 0) return { family: style.fontFamily };
      const hex = rgba
        ? rgba.slice(1, 4).map(channel => Number(channel).toString(16).padStart(2, '0')).join('')
        : normalized.slice(1);
      return {
        family: style.fontFamily,
        outline: { family: style.fontFamily.split(',')[0]!.trim().replace(/['"]/g, ''), width, color: hex.toUpperCase(), alpha },
      };
    });
    const stroked = new Set(elements.filter((_, index) => styles[index]!.outline));
    elements.forEach((element, index) => {
      const { family, outline } = styles[index]!;
      if (!outline) {
        // An unstroked element inside a stroked one would inherit the placeholder.
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

function outlineXml({ width, color, alpha }: TextOutline): string {
  const opacity = alpha < 1 ? `<a:alpha val="${Math.round(alpha * 100000)}"/>` : '';
  const fill = opacity ? `<a:srgbClr val="${color}">${opacity}</a:srgbClr>` : `<a:srgbClr val="${color}"/>`;
  return `<a:ln w="${Math.round(width * EMU_PER_PX)}"><a:solidFill>${fill}</a:solidFill></a:ln>`;
}

/**
 * Give runs that carry an outline placeholder a PowerPoint text outline (`<a:ln>`, the first
 * child of the run properties) and restore their font family. Fails if a placeholder is left.
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
        const restored = children
          .replace(marker, (_, other: string) => `typeface="${xml(outlines[Number(other)]?.family ?? '')}"`)
          .replace(/<a:ln\b[\s\S]*?(?:\/>|<\/a:ln>)/, '');
        return `<a:${tag}${attributes}>${outlineXml(outline)}${restored}</a:${tag}>`;
      },
    ));
  }
  const left = Object.keys(files).find(path => strFromU8(files[path]!, true).includes(OUTLINE_FONT_PREFIX));
  if (left) throw new Error(`A text outline placeholder font was left in ${left}`);
  return zipSync(files);
}
