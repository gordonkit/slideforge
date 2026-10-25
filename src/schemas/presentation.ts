import { z } from "zod";
import { layoutFamily, layoutNames, layoutSlideSchemas, slideVariant, unknownLayoutMessage } from "../layouts/registry.js";
import { backgroundSourceSchema, contentBlockSchema, optionalText, text, xmlText } from "./fields.js";

export { backgroundSourceSchema, contentBlockSchema, imageSourceSchema } from "./fields.js";

export const slideSchema = z.discriminatedUnion("layout", layoutSlideSchemas, {
  error: (issue) => unknownLayoutMessage(issue.input),
});

/** A valid `layout` value: a family, or `family/variant`. */
export type LayoutName = z.infer<typeof slideSchema>["layout"];

const backgroundsSchema = z.object(Object.fromEntries(
  ["default", ...layoutNames].map((key) => [key, backgroundSourceSchema.optional()]),
) as Record<"default" | LayoutName, z.ZodOptional<typeof backgroundSourceSchema>>).strict();

export const presentationSchema = z.object({
  metadata: z.object({
    title: text.max(300),
    author: optionalText,
    subject: optionalText,
    lang: xmlText.regex(/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i, 'Use a language tag such as "en", "zh-Hant", or "ja"').default("en"),
  }).strict(),
  theme: z.enum(["light", "dark"]).default("light"),
  fontFamily: xmlText.trim().min(1).max(200)
    .regex(/^[\p{L}\p{N} ,'"\-]+$/u, "Use local font family names, not CSS declarations").optional(),
  backgrounds: backgroundsSchema.optional(),
  slides: z.array(slideSchema).min(1).max(200),
}).strict();

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Presentation = z.infer<typeof presentationSchema>;

export function parsePresentation(input: unknown): Presentation {
  return presentationSchema.parse(input);
}

/**
 * A slide's own background, else its `family/variant`'s, else its family's, else the presentation
 * default; `"none"` opts out. A bare family name is drawn as, and matches, `family/default`.
 */
export function slideBackground(presentation: Presentation, slide: Slide): string | undefined {
  const family = layoutFamily(slide.layout);
  const backgrounds: Partial<Record<string, string>> = presentation.backgrounds ?? {};
  const source = slide.background ?? backgrounds[`${family}/${slideVariant(slide)}`] ?? backgrounds[family] ?? backgrounds.default;
  return source === "none" ? undefined : source;
}
