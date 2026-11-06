import { z } from "zod";
import { contentBlockSchema, imageSourceSchema, optionalDisplayText as optionalText, slideObject, xmlText } from "../../schemas/fields.js";

// default: the image on the left, the text on the right; right: the reverse; full: the image across the slide, the text below it.
const variants = ["default", "right", "full"] as const;

export const media = {
  family: "media",
  variants,
  slide: slideObject("media", variants, {
    image: imageSourceSchema,
    alt: xmlText.max(1000),
    caption: optionalText,
    /** Text beside (or, for `full`, below) the image. */
    blocks: z.array(contentBlockSchema).max(6).default([]),
  }),
} as const;
