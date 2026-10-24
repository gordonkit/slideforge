import { z } from "zod";

const xmlText = z.string().regex(
  /^[\u0009\u000a\u000d\u0020-\ud7ff\ue000-\ufffd\u{10000}-\u{10ffff}]*$/u,
  "Text must contain only valid XML characters",
);
const text = xmlText.trim().min(1);
const optionalText = xmlText.max(10000).optional();

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
]);

const blocks = z.array(contentBlockSchema).min(1).max(12);
const common = {
  title: text.max(300),
  subtitle: optionalText,
  footer: optionalText,
  notes: optionalText,
};
const tableFields = {
  columns: z.array(text.max(200)).min(1).max(8),
  rows: z.array(z.array(xmlText.max(2000)).min(1).max(8)).min(1).max(14),
};

export const slideSchema = z.discriminatedUnion("layout", [
  z.object({ ...common, layout: z.literal("cover"), author: optionalText }).strict(),
  z.object({ ...common, layout: z.literal("content"), blocks }).strict(),
  z.object({ ...common, layout: z.literal("two-columns"), left: blocks, right: blocks }).strict(),
  z.object({
    ...common,
    layout: z.literal("cards"),
    cards: z.array(z.object({ title: text.max(200), blocks }).strict()).min(1).max(6),
  }).strict(),
  z.object({ ...common, layout: z.literal("table"), ...tableFields }).strict(),
  z.object({
    ...common,
    layout: z.literal("chart"),
    data: z.array(z.object({
      label: text.max(100),
      value: z.number().finite().nonnegative(),
    }).strict()).min(1).max(10),
    unit: xmlText.max(40).optional(),
    blocks: z.array(contentBlockSchema).max(4).default([]),
  }).strict(),
]).superRefine((slide, context) => {
  if (slide.layout === "table") {
    slide.rows.forEach((row, index) => {
      if (row.length !== slide.columns.length) {
        context.addIssue({
          code: "custom",
          path: ["rows", index],
          message: "Every row must have one cell per column",
        });
      }
    });
  }
});

export const presentationSchema = z.object({
  metadata: z.object({
    title: text.max(300),
    author: optionalText,
    subject: optionalText,
    lang: xmlText.regex(/^[a-z]{2,8}(?:-[a-z0-9]{1,8})*$/i).default("en"),
  }).strict(),
  theme: z.enum(["light", "dark"]).default("light"),
  fontFamily: xmlText.trim().min(1).max(200)
    .regex(/^[\p{L}\p{N} ,'"\-]+$/u, "Use local font family names, not CSS declarations").optional(),
  slides: z.array(slideSchema).min(1).max(200),
}).strict();

export type ContentBlock = z.infer<typeof contentBlockSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Presentation = z.infer<typeof presentationSchema>;

export function parsePresentation(input: unknown): Presentation {
  return presentationSchema.parse(input);
}
