import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import type { Page } from 'playwright';

/**
 * Per slide, per table in document order, the opacity of each cell's fill in row order: a number
 * for a translucent fill to restore, `null` for a cell to leave alone. A slide or table without
 * translucent fills has an empty list.
 */
export type TableFills = (number | null)[][][];

/**
 * The converter flattens a translucent table cell fill onto the colors behind it, so the
 * slide background no longer shows through. Give each translucent cell of a `fillOpacity` table its
 * opaque color for the conversion, and return the opacities for `applyTableFills`.
 */
export async function markTableFills(page: Page, selector: string): Promise<TableFills> {
  return page.locator(selector).evaluateAll((slides) => {
    const context = document.createElement('canvas').getContext('2d')!;
    return (slides as HTMLElement[]).map(slide => [...slide.querySelectorAll('table')].map(table => {
      if (!table.classList.contains('sf-table-filled')) return [];
      return [...table.querySelectorAll('tr')].flatMap(row => [...row.children]
        .filter((cell): cell is HTMLElement => cell.tagName === 'TD' || cell.tagName === 'TH')
        .map(cell => {
          context.fillStyle = '#000000';
          context.fillStyle = getComputedStyle(cell).backgroundColor;
          const rgba = String(context.fillStyle).match(/^rgba\((\d+), (\d+), (\d+), ([\d.]+)\)$/);
          const alpha = rgba ? Number(rgba[4]) : 1;
          if (!rgba || alpha <= 0) return null;
          cell.style.setProperty('background', `rgb(${rgba[1]}, ${rgba[2]}, ${rgba[3]})`, 'important');
          return alpha;
        }));
    }));
  });
}

function withAlpha(cell: string, alpha: number): string {
  const properties = cell.match(/<a:tcPr\b[^>]*>[\s\S]*?<\/a:tcPr>/)?.[0];
  if (!properties) return cell;
  // The cell's own fill follows its border lines.
  const lines = [...properties.matchAll(/<a:ln\w*\b[^>]*\/>|<\/a:ln\w*>/g)];
  const start = lines.length ? lines.at(-1)!.index! + lines.at(-1)![0].length : 0;
  const tail = properties.slice(start);
  const fill = tail.match(/<a:solidFill><a:srgbClr val="([0-9A-Fa-f]{6})"\s*\/><\/a:solidFill>/);
  if (!fill) return cell;
  const color = fill[1]!;
  const restored = tail.replace(fill[0], `<a:solidFill><a:srgbClr val="${color}"><a:alpha val="${Math.round(alpha * 100000)}"/></a:srgbClr></a:solidFill>`);
  const result = cell.replace(properties, properties.slice(0, start) + restored);
  // The converter also copies a table-cell background into an opaque text highlight.
  return result.replace(
    /<a:highlight><a:srgbClr val="([0-9A-Fa-f]{6})"\s*\/><\/a:highlight>/g,
    (highlight: string, background: string) => background.toLowerCase() === color.toLowerCase() ? '' : highlight,
  );
}

/**
 * Restore the opacity `markTableFills` recorded on each translucent cell's fill. A table whose cell
 * count differs from the record (merged cells) keeps the opaque fills.
 */
export function applyTableFills(data: Uint8Array, fills: TableFills): Uint8Array {
  if (!fills.some(slide => slide.some(table => table.some(alpha => alpha !== null)))) return data;
  const files = unzipSync(data);
  fills.forEach((tables, index) => {
    const path = `ppt/slides/slide${index + 1}.xml`;
    if (!files[path] || !tables.some(table => table.length)) return;
    let tableIndex = 0;
    const slide = strFromU8(files[path]!).replace(/<a:tbl>[\s\S]*?<\/a:tbl>/g, (table: string) => {
      const alphas = tables[tableIndex++] ?? [];
      const cells = table.match(/<a:tc\b[\s\S]*?<\/a:tc>/g) ?? [];
      if (!alphas.length || cells.length !== alphas.length) return table;
      let cell = 0;
      return table.replace(/<a:tc\b[\s\S]*?<\/a:tc>/g, (content: string) => {
        const alpha = alphas[cell++];
        if (alpha === null || alpha === undefined || alpha >= 1) return content;
        return withAlpha(content, alpha);
      });
    });
    files[path] = strToU8(slide);
  });
  return zipSync(files);
}
