import { z } from "zod";
import { optionalText, slideObject, text } from "../../schemas/fields.js";

// default: numbered cards; chapters: a large-number index of the top level only; outline: each
// chapter with its subsections listed under it (the other variants leave the subsections out).
const variants = ["default", "chapters", "outline"] as const;

/** The 1-based number of the slide an item links to. */
const target = z.number().int().min(1).max(200).optional();

export const agenda = {
  family: "agenda",
  variants,
  slide: slideObject("agenda", variants, {
    /** Omit it to list the presentation's `section` slides, each linking to its slide. */
    items: z.array(z.object({
      title: text.max(200),
      text: optionalText,
      slide: target,
      /** Subsections, drawn by `agenda/outline`. */
      items: z.array(z.object({ title: text.max(200), slide: target }).strict()).min(1).max(6).optional(),
    }).strict()).min(2).max(8).optional(),
    /** The 1-based item to mark as the current chapter; the others are muted. */
    current: z.number().int().min(1).max(8).optional(),
  }),
} as const;
