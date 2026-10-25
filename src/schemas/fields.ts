import { z } from "zod";
import { isTrustedStudioLink, looksLikeStudioLink, STUDIO_ORIGIN } from "./background.js";

// Field schemas shared by the presentation and every layout; kept apart so layouts can import them.
export const xmlText = z.string().regex(
  /^[\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]*$/u,
  "Text must contain only valid XML characters",
);
export const text = xmlText.trim().min(1);
export const optionalText = xmlText.max(10000).optional();

export const imageSourceSchema = xmlText.trim().min(1).max(2_000_000).refine((source) => {
  if (/[\u0000-\u0020\u007f\\]/u.test(source)) return false;
  if (/^https?:\/\//i.test(source)) {
    try {
      const url = new URL(source);
      return Boolean(url.hostname) && !url.username && !url.password;
    } catch {
      return false;
    }
  }
  if (/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/]+=*$/i.test(source)) return true;
  return !/^[a-z][a-z0-9+.-]*:/i.test(source) && !source.startsWith("//");
}, "Images must use HTTP(S), a base64 raster image, or a relative URL");

/** An image source, or a Math Background Studio share link that is rendered at export. */
export const backgroundSourceSchema = imageSourceSchema.refine(
  (source) => !looksLikeStudioLink(source) || isTrustedStudioLink(source),
  `Studio share links must come from ${STUDIO_ORIGIN} or a localhost development server`,
);

export const contentBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("paragraph"), text }).strict(),
  z.object({
    type: z.literal("bullets"),
    items: z.array(text).min(1).max(12),
    ordered: z.boolean().default(false),
  }).strict(),
  z.object({
    type: z.literal("image"),
    src: imageSourceSchema,
    alt: xmlText.max(1000),
    caption: optionalText,
  }).strict(),
], { error: 'Unknown block type. Use "paragraph", "bullets", or "image"' });

export const blocks = z.array(contentBlockSchema).min(1).max(12);

const commonSlideFields = {
  title: text.max(300),
  subtitle: optionalText,
  footer: optionalText,
  notes: optionalText,
  background: z.union([z.literal("none"), backgroundSourceSchema]).optional(),
};

/** `family` alone, or `family/variant` for each of its variants. */
export type LayoutName<F extends string, V extends string> = F | `${F}/${V}`;

/**
 * A strict slide schema for one layout family: the common slide fields plus the family's own.
 * `layout` accepts the bare family name or `family/variant` for each listed variant.
 */
export function slideObject<F extends string, const V extends readonly string[], S extends z.ZodRawShape>(
  family: F, variants: V, shape: S,
) {
  const names = [family, ...variants.map((variant) => `${family}/${variant}`)] as [F, ...`${F}/${V[number]}`[]];
  return z.object({ ...commonSlideFields, layout: z.enum(names), ...shape }).strict();
}
