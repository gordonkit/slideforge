import { z } from "zod";
import { layoutFamilies, layoutSlideSchemas, quotedList, type LayoutFamily } from "../layouts/registry.js";
import { backgroundSourceSchema, contentBlockSchema, optionalText, text, xmlText } from "./fields.js";

export { backgroundSourceSchema, contentBlockSchema, imageSourceSchema } from "./fields.js";

export const slideSchema = z.discriminatedUnion("layout", layoutSlideSchemas, {
  error: `Unknown layout. Use ${quotedList(layoutFamilies)}`,
});

const backgroundsSchema = z.object(Object.fromEntries(
  ["default", ...layoutFamilies].map((key) => [key, backgroundSourceSchema.optional()]),
) as Record<"default" | LayoutFamily, z.ZodOptional<typeof backgroundSourceSchema>>).strict();

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

/** A slide's own background, else its layout's, else the presentation default; `"none"` opts out. */
export function slideBackground(presentation: Presentation, slide: Slide): string | undefined {
  const source = slide.background ?? presentation.backgrounds?.[slide.layout] ?? presentation.backgrounds?.default;
  return source === "none" ? undefined : source;
}
