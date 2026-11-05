import { z } from "zod";
import { optionalText, slideObject, text } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const agenda = {
  family: "agenda",
  variants,
  slide: slideObject("agenda", variants, {
    items: z.array(z.object({
      title: text.max(200),
      text: optionalText,
      /** The 1-based number of the slide this item links to. */
      slide: z.number().int().min(1).max(200).optional(),
    }).strict()).min(2).max(8),
  }),
} as const;
