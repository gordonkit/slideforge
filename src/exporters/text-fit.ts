import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

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
export function widenTextBoxes(data: Uint8Array, slack: TextSlack = DEFAULT_TEXT_SLACK): Uint8Array {
  const files = unzipSync(data);
  const presentation = files['ppt/presentation.xml'];
  const slideWidth = Number(presentation && strFromU8(presentation).match(/<p:sldSz\b[^>]*\bcx="(\d+)"/)?.[1]) || Infinity;
  for (const path of Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))) {
    const xml = strFromU8(files[path]!);
    files[path] = strToU8(xml.replace(/<p:sp>[\s\S]*?<\/p:sp>/g, shape => widenShape(shape, slack, slideWidth)));
  }
  return zipSync(files);
}

function widenShape(shape: string, slack: TextSlack, slideWidth: number): string {
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
  const alignments = Array.from(shape.matchAll(/<a:pPr\b[^>]*\balgn="(\w+)"/g), match => match[1]);
  const align = alignments.length && alignments.every(value => value === alignments[0]) ? alignments[0] : 'l';
  const leftRoom = Math.max(0, x);
  const rightRoom = Math.max(0, slideWidth - x - cx);
  const wanted = Math.round(Math.min(Math.max(cx * slack.ratio, slack.min), slack.max));
  const extra = align === 'ctr' ? Math.min(wanted, 2 * Math.min(leftRoom, rightRoom))
    : align === 'r' ? Math.min(wanted, leftRoom)
      : Math.min(wanted, rightRoom);
  if (extra <= 0) return shape;
  const offset = align === 'ctr' ? Math.round(extra / 2) : align === 'r' ? extra : 0;
  const replaced = properties.replace(xfrmPattern, `<a:off x="${x - offset}" y="${y}"/>${space}<a:ext cx="${cx + extra}" cy="${cy}"/>`);
  return shape.replace(properties, () => replaced);
}
