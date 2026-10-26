import { z } from "zod";
import { layoutFamily, layoutNames, layoutSlideSchemas, slideVariant, unknownLayoutMessage } from "../layouts/registry.js";
import { backgroundSourceSchema, contentBlockSchema, optionalText, text, xmlText } from "./fields.js";

export { backgroundSourceSchema, contentBlockSchema, imageSourceSchema } from "./fields.js";

export const slideSchema = z.discriminatedUnion("layout", layoutSlideSchemas, {
  error: (issue) => unknownLayoutMessage(issue.input),
});

/** A valid `layout` value: a family, or `family/variant`. */
export type LayoutName = z.infer<typeof slideSchema>["layout"];

/** Background sources keyed by `default`, a family, or `family/variant`. */
export const backgroundsSchema = z.object(Object.fromEntries(
  ["default", ...layoutNames].map((key) => [key, backgroundSourceSchema.optional()]),
) as Record<"default" | LayoutName, z.ZodOptional<typeof backgroundSourceSchema>>).strict();

/** A local font family list, not a CSS declaration or font URL. */
export const fontFamilySchema = xmlText.trim().min(1).max(200)
  .regex(/^[\p{L}\p{N} ,'"\-]+$/u, "Use local font family names, not CSS declarations");

/** A built-in template name, or a `./`/`../` path to a template directory or `.json` file. */
export const templateReferenceSchema = xmlText.max(1000).regex(
  /^(?:[a-z][a-z0-9-]{0,63}|\.\.?\/[^\\]+)$/,
  'Use a built-in template name such as "corporate", or a path starting with "./" or "../"',
);

export const presentationSchema = z.object({
  metadata: z.object({
    title: text.max(300),
    author: optionalText,
    subject: optionalText,
    lang: xmlText.regex(/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i, 'Use a language tag such as "en", "zh-Hant", or "ja"').default("en"),
  }).strict(),
  template: templateReferenceSchema.optional(),
  theme: z.enum(["light", "dark"]).default("light"),
  fontFamily: fontFamilySchema.optional(),
  backgrounds: backgroundsSchema.optional(),
  slides: z.array(slideSchema).min(1).max(200),
}).strict();

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Presentation = z.infer<typeof presentationSchema>;

export function parsePresentation(input: unknown): Presentation {
  return presentationSchema.parse(input);
}

/** The parts of a template that decide a slide's variant and background. */
export interface SlideDesign {
  backgrounds?: Partial<Record<string, string>> | undefined;
  variants?: Partial<Record<string, string>> | undefined;
}

/**
 * A slide's own background, else its `family/variant`'s, else its family's, else the default;
 * `"none"` opts out. The variant is the one the slide is drawn with, so a bare family name matches
 * `family/default` or the template's variant. A presentation's `backgrounds` entry replaces the
 * template's entry with the same key before this lookup.
 */
export function slideBackground(presentation: Presentation, slide: Slide, template: SlideDesign = {}): string | undefined {
  const family = layoutFamily(slide.layout);
  const backgrounds: Partial<Record<string, string>> = { ...template.backgrounds, ...presentation.backgrounds };
  const variant = slideVariant(slide, template.variants);
  const source = slide.background ?? backgrounds[`${family}/${variant}`] ?? backgrounds[family] ?? backgrounds.default;
  return source === "none" ? undefined : source;
}
