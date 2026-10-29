import { blank } from "./blank/schema.js";
import { cards } from "./cards/schema.js";
import { chart } from "./chart/schema.js";
import { content } from "./content/schema.js";
import { cover } from "./cover/schema.js";
import { gantt } from "./gantt/schema.js";
import { quote } from "./quote/schema.js";
import { table } from "./table/schema.js";
import { timeline } from "./timeline/schema.js";
import { twoColumns } from "./two-columns/schema.js";

/**
 * Every layout family, in documentation order. A family owns its schema (`slide`) and variants;
 * its folder also holds `render.tsx` and `<family>.css`. Adding a family means adding a folder
 * and listing it here and in the renderer table in `index.tsx`.
 */
export const layouts = [cover, content, twoColumns, cards, timeline, gantt, table, chart, quote, blank] as const;

export type LayoutFamily = (typeof layouts)[number]["family"];

export const layoutFamilies: readonly LayoutFamily[] = layouts.map((layout) => layout.family);

/** Every valid `layout` value: each family, then `family/variant` for each of its variants. */
export const layoutNames: readonly string[] = layouts.flatMap((layout) => [
  layout.family, ...layout.variants.map((variant) => `${layout.family}/${variant}`),
]);

/** The slide schema of each family, as the tuple `z.discriminatedUnion` expects. */
type SlideSchemas<T extends readonly { slide: unknown }[]> = { -readonly [K in keyof T]: T[K]["slide"] };
export const layoutSlideSchemas = layouts.map((layout) => layout.slide) as unknown as SlideSchemas<typeof layouts>;

/** The family of a valid layout name: `cover/split` → `cover`. */
export function layoutFamily(name: string): LayoutFamily {
  return name.split("/", 1)[0] as LayoutFamily;
}

/** The variant a layout name states, or `undefined` for a bare family name. */
export function layoutVariant(name: string): string | undefined {
  const slash = name.indexOf("/");
  return slash < 0 ? undefined : name.slice(slash + 1);
}

/**
 * The variant a slide is drawn with: the one its layout names, else the family's entry in
 * `defaults` (a template's `variants`), else `default`.
 */
export function slideVariant(slide: { layout: string }, defaults?: Partial<Record<string, string>>): string {
  return layoutVariant(slide.layout) ?? defaults?.[layoutFamily(slide.layout)] ?? "default";
}

/** `"a", "b", or "c"`, for error messages that name the valid values. */
export function quotedList(values: readonly string[]): string {
  const quoted = values.map((value) => `"${value}"`);
  if (quoted.length < 3) return quoted.join(" or ");
  return `${quoted.slice(0, -1).join(", ")}, or ${quoted.at(-1)}`;
}

/** Names the valid variants when the family is known, else the valid families. */
export function unknownLayoutMessage(slide: unknown): string {
  const name = typeof slide === "object" && slide !== null ? (slide as { layout?: unknown }).layout : undefined;
  const family = typeof name === "string" ? layouts.find((layout) => layout.family === layoutFamily(name)) : undefined;
  if (family) {
    const names = [family.family, ...family.variants.map((variant) => `${family.family}/${variant}`)];
    return `Unknown ${family.family} variant. Use ${quotedList(names)}`;
  }
  return `Unknown layout. Use ${quotedList(layoutFamilies)}`;
}
