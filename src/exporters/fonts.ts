import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

/** Traditional Chinese font shipped with Windows and Microsoft Office. */
export const DEFAULT_EAST_ASIAN_FONT = 'Microsoft JhengHei';

function xml(value: string): string {
  return value.replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}

/**
 * The converter copies the first CSS family into every script slot, so CJK text is
 * assigned a Latin-only font and PowerPoint substitutes its own. Assign an explicit
 * East Asian font wherever the converter copied the Latin one; explicit choices stay.
 */
export function applyEastAsianFont(data: Uint8Array, font: string = DEFAULT_EAST_ASIAN_FONT): Uint8Array {
  const files = unzipSync(data);
  const typeface = xml(font);
  for (const path of Object.keys(files).filter(path => /^ppt\/slides\/slide\d+\.xml$/.test(path))) {
    const slide = strFromU8(files[path]!);
    files[path] = strToU8(slide.replace(
      /(<a:latin typeface="([^"]*)"[^>]*\/>\s*<a:ea typeface=")\2"/g,
      (_, prefix: string) => `${prefix}${typeface}"`,
    ));
  }
  return zipSync(files);
}
