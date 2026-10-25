import { z } from "zod";
import { layouts } from "../layouts/registry.js";
import { optionalText } from "../schemas/fields.js";
import { backgroundsSchema, fontFamilySchema } from "../schemas/presentation.js";
import { designTokens, SLIDE_SIZE, themeTokens, type DesignTokens } from "../themes/tokens.js";

const color = z.string().regex(/^#[0-9a-f]{6}$/i, 'Use a six-digit hex color such as "#2563eb"');
const paletteSchema = z.object(Object.fromEntries(
  Object.keys(themeTokens.light).map((key) => [key, color.optional()]),
) as Record<keyof typeof themeTokens.light, z.ZodOptional<typeof color>>).strict();

// Each group's numeric tokens can be overridden within these bounds; string tokens are fixed.
const tokenBounds = {
  layout: [0, SLIDE_SIZE.widthPx], spacing: [0, 480], type: [8, 240], border: [0, 120], chart: [0, SLIDE_SIZE.widthPx],
} as const satisfies Record<keyof typeof designTokens, readonly [number, number]>;

const tokensSchema = z.object(Object.fromEntries(Object.entries(designTokens).map(([group, tokens]) => {
  const [min, max] = tokenBounds[group as keyof typeof designTokens];
  const numeric = Object.entries(tokens).filter(([, value]) => typeof value === "number");
  return [group, z.object(Object.fromEntries(numeric.map(([name]) => [name, z.number().finite().min(min).max(max).optional()]))).strict().optional()];
})) as unknown as { [G in keyof typeof designTokens]: z.ZodOptional<z.ZodType<Partial<Record<string, number>>>> }).strict();

const variantsSchema = z.object(Object.fromEntries(layouts.map((layout) => [
  layout.family, z.enum(layout.variants as unknown as [string, ...string[]]).optional(),
])) as Record<(typeof layouts)[number]["family"], z.ZodOptional<z.ZodEnum<Record<string, string>>>>).strict();

/** Design tokens with a template's overrides applied over the built-in ones. */
export function mergeTokens(overrides: z.infer<typeof tokensSchema> = {}): DesignTokens {
  return Object.fromEntries(Object.entries(designTokens).map(([group, tokens]) => [
    group, { ...tokens, ...overrides[group as keyof typeof designTokens] },
  ])) as unknown as DesignTokens;
}

/**
 * A template: the look of a presentation, apart from its content. Every field is optional;
 * what a template leaves out keeps the built-in value.
 */
export const templateSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9-]{0,63}$/, "Use a lowercase name such as \"corporate\""),
  description: optionalText,
  palette: z.object({ light: paletteSchema.optional(), dark: paletteSchema.optional() }).strict().optional(),
  fontFamily: fontFamilySchema.optional(),
  tokens: tokensSchema.optional(),
  backgrounds: backgroundsSchema.optional(),
  variants: variantsSchema.optional(),
}).strict().superRefine((template, context) => {
  const { layout } = mergeTokens(template.tokens);
  const check = (ok: boolean, message: string) => {
    if (!ok) context.addIssue({ code: "custom", path: ["tokens", "layout"], message });
  };
  const height = SLIDE_SIZE.heightPx;
  const vertical = layout["padding-top"] + layout.header + layout.content + layout["padding-bottom"];
  check(vertical === height, `padding-top + header + content + padding-bottom must equal ${height} (got ${vertical})`);
  const cover = layout["padding-top"] + layout["cover-header"] + layout["cover-content"] + layout["padding-bottom"];
  check(cover <= height, `padding-top + cover-header + cover-content + padding-bottom must not exceed ${height} (got ${cover})`);
  check(layout["cover-top"] <= layout["cover-header"], "cover-top must not exceed cover-header");
  check(layout["footer-bottom"] + layout.footer <= layout["padding-bottom"], "footer-bottom + footer must not exceed padding-bottom");
  const split = 2 * layout["padding-x"] + layout["cover-panel"];
  check(split < SLIDE_SIZE.widthPx, `2 × padding-x + cover-panel must be less than ${SLIDE_SIZE.widthPx} (got ${split})`);
});

export type Template = z.infer<typeof templateSchema>;

export function parseTemplate(input: unknown): Template {
  return templateSchema.parse(input);
}
