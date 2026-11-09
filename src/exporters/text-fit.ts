import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Page } from 'playwright';
import { SLIDE_SIZE } from '../themes/tokens.js';

interface TextRegion {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

export interface SlideTextLayout {
  clips: TextRegion[];
  lists: Array<{ x: number; y: number; width: number; height?: number }>;
}

const EMU_PER_PX = SLIDE_SIZE.widthInches * 914400 / SLIDE_SIZE.widthPx;

/** Keep export slack within the browser's clipping regions and identify ordinary native lists. */
export async function measureTextLayout(page: Page, selector: string): Promise<SlideTextLayout[]> {
  return page.locator(selector).evaluateAll((slides, scale) => slides.map(slide => {
    const origin = slide.getBoundingClientRect();
    const clips: TextRegion[] = [];
    const lists: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (const element of slide.querySelectorAll<HTMLElement>('*')) {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      if (box.width <= 0 || box.height <= 0) continue;
      if (['hidden', 'clip'].includes(style.overflowX)) {
        clips.push({
          left: (box.left - origin.left) * scale, right: (box.right - origin.left) * scale,
          top: (box.top - origin.top) * scale, bottom: (box.bottom - origin.top) * scale,
        });
      }
      if (!element.matches('ul, ol')) continue;
      if (element.querySelector('ul, ol') || element.parentElement?.closest('li')) continue;
      const items = [...element.children].filter(child => child.tagName === 'LI');
      const padding = parseFloat(style.paddingLeft);
      // Custom/nested indentation belongs to the converter; only correct standard list padding.
      if (!items.length || items.some(item => {
        const itemStyle = getComputedStyle(item);
        return Math.abs(item.getBoundingClientRect().left - box.left - padding) > 1
          || parseFloat(itemStyle.paddingLeft) !== 0
          || itemStyle.listStylePosition !== 'outside';
      })) continue;
      let bottom = element.nextElementSibling?.getBoundingClientRect().top ?? origin.bottom;
      for (let parent = element.parentElement; parent && parent !== slide; parent = parent.parentElement) {
        if (['hidden', 'clip'].includes(getComputedStyle(parent).overflowY)) {
          bottom = Math.min(bottom, parent.getBoundingClientRect().bottom);
        }
      }
      lists.push({
        x: (box.left - origin.left) * scale, y: (box.top - origin.top) * scale,
        width: box.width * scale, height: Math.max(box.height, bottom - box.top) * scale,
      });
    }
    return { clips, lists };
  }), EMU_PER_PX);
}

/** Extra width per text box: `ratio` of its width, bounded to [`min`, `max`] EMU (914400 per inch). */
export interface TextSlack {
  ratio: number;
  min: number;
  max: number;
}

export const DEFAULT_TEXT_SLACK: Readonly<TextSlack> = Object.freeze({ ratio: 0.06, min: 91440, max: 457200 });

const xfrmPattern = /<a:off x="(-?\d+)" y="(-?\d+)"\/>(\s*)<a:ext cx="(\d+)" cy="(\d+)"\/>/;

/**
 * The converter sizes text boxes to browser-measured text. PowerPoint's font metrics and
 * fallback differ slightly, so tight boxes wrap a trailing word or punctuation mark. Widen
 * unfilled text boxes, growing away from the paragraph alignment so text keeps its position.
 */
export function widenTextBoxes(data: Uint8Array, slack: TextSlack = DEFAULT_TEXT_SLACK, layout?: readonly SlideTextLayout[]): Uint8Array {
  const files = unzipSync(data);
  const presentation = files['ppt/presentation.xml'];
  const slideWidth = Number(presentation && strFromU8(presentation).match(/<p:sldSz\b[^>]*\bcx="(\d+)"/)?.[1]) || Infinity;
  for (const path of Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))) {
    const xml = strFromU8(files[path]!);
    const slideLayout = layout?.[Number(path.match(/slide(\d+)/)?.[1]) - 1];
    files[path] = strToU8(xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, shape => widenShape(shape, slack, slideWidth, slideLayout)));
  }
  return zipSync(files);
}

function widenShape(shape: string, slack: TextSlack, slideWidth: number, layout?: SlideTextLayout): string {
  const properties = shape.match(/<p:spPr>([\s\S]*?)<\/p:spPr>/)?.[1];
  if (!properties || !shape.includes('<p:txBody>')) return shape;
  // Only invisible text frames: widening a filled or outlined shape would change its appearance.
  const fill = properties.replace(/<a:ln\b[\s\S]*?(?:\/>|<\/a:ln>)/, '');
  const line = properties.match(/<a:ln\b[\s\S]*?(?:\/>|<\/a:ln>)/)?.[0] ?? '';
  if (!fill.includes('<a:noFill/>') || /<a:(?:solid|grad|blip|patt)Fill\b/.test(line)) return shape;
  const xfrm = properties.match(xfrmPattern);
  if (!xfrm) return shape;
  const [, xText, y, space, cxText, cy] = xfrm;
  const x = Number(xText);
  const cx = Number(cxText);
  const top = Number(y);
  const height = Number(cy);
  let fittedHeight = height;
  const ordinaryList = layout?.lists.find(list => Math.abs(list.x - x) <= EMU_PER_PX
    && Math.abs(list.y - top) <= EMU_PER_PX && Math.abs(list.width - cx) <= EMU_PER_PX);
  if (ordinaryList) {
    // Upstream adds a hanging indent on top of CSS list padding, shifting text twice.
    const paragraphs = [...shape.matchAll(/<a:pPr\b[^>]*>/g)].map(match => match[0]);
    const margins = paragraphs.map(paragraph => Number(paragraph.match(/\bmarL="(\d+)"/)?.[1]));
    const margin = margins[0];
    if (margin !== undefined && Number.isFinite(margin) && margins.every(value => value === margin)
      && paragraphs.every(paragraph => !/\blvl="[1-8]"/.test(paragraph) && /\bindent="-\d+"/.test(paragraph))) {
      shape = shape.replace(/(<a:bodyPr\b[^>]*\blIns=")(\d+)"/, (match, prefix: string, inset: string) =>
        Number(inset) >= margin ? `${prefix}${Number(inset) - margin}"` : match);
    }
    // Leave room for Office's line metrics, but never grow past the next block or clipping edge.
    if (ordinaryList.height !== undefined && ordinaryList.height > height && /<a:bodyPr\b[^>]*\banchor="t"/.test(shape)) {
      fittedHeight = Math.floor(ordinaryList.height);
    }
  }
  const alignments = Array.from(shape.matchAll(/<a:pPr\b[^>]*\balgn="(\w+)"/g), match => match[1]);
  const align = alignments.length && alignments.every(value => value === alignments[0]) ? alignments[0] : 'l';
  const clips = layout?.clips.filter(clip => x >= clip.left - EMU_PER_PX
    && x + cx <= clip.right + EMU_PER_PX
    && top >= clip.top - EMU_PER_PX && top + height <= clip.bottom + EMU_PER_PX) ?? [];
  const leftLimit = Math.ceil(Math.max(0, ...clips.map(clip => clip.left)));
  const rightLimit = Math.floor(Math.min(slideWidth, ...clips.map(clip => clip.right)));
  const leftRoom = Math.max(0, x - leftLimit);
  const rightRoom = Math.max(0, rightLimit - x - cx);
  const wanted = Math.round(Math.min(Math.max(cx * slack.ratio, slack.min), slack.max));
  const extra = align === 'ctr' ? Math.min(wanted, 2 * Math.min(leftRoom, rightRoom))
    : align === 'r' ? Math.min(wanted, leftRoom)
      : Math.min(wanted, rightRoom);
  const offset = align === 'ctr' ? Math.round(extra / 2) : align === 'r' ? extra : 0;
  const replaced = properties.replace(xfrmPattern,
    `<a:off x="${x - offset}" y="${y}"/>${space}<a:ext cx="${cx + extra}" cy="${fittedHeight}"/>`);
  return shape.replace(properties, () => replaced);
}
