import { cards } from "./cards/schema.js";
import { chart } from "./chart/schema.js";
import { content } from "./content/schema.js";
import { cover } from "./cover/schema.js";
import { table } from "./table/schema.js";
import { twoColumns } from "./two-columns/schema.js";

/**
 * Every layout family, in documentation order. A family owns its schema (`slide`) and variants;
 * its folder also holds `render.tsx` and `<family>.css`. Adding a family means adding a folder
 * and listing it here and in the renderer table in `index.tsx`.
 */
export const layouts = [cover, content, twoColumns, cards, table, chart] as const;

export type LayoutFamily = (typeof layouts)[number]["family"];

export const layoutFamilies: readonly LayoutFamily[] = layouts.map((layout) => layout.family);

/** The slide schema of each family, as the tuple `z.discriminatedUnion` expects. */
type SlideSchemas<T extends readonly { slide: unknown }[]> = { -readonly [K in keyof T]: T[K]["slide"] };
export const layoutSlideSchemas = layouts.map((layout) => layout.slide) as unknown as SlideSchemas<typeof layouts>;

/** `"a", "b", or "c"`, for error messages that name the valid values. */
export function quotedList(values: readonly string[]): string {
  const quoted = values.map((value) => `"${value}"`);
  if (quoted.length < 3) return quoted.join(" or ");
  return `${quoted.slice(0, -1).join(", ")}, or ${quoted.at(-1)}`;
}
