import { z } from "zod";
import { displayText, slideObject, text } from "../../schemas/fields.js";

// default: left-aligned beside an accent rail; centered: centered text; band: the whole slide in the accent color.
const variants = ["default", "centered", "band"] as const;

export const closing = {
  family: "closing",
  variants,
  slide: slideObject("closing", variants, {
    /** Ways to reach the speaker: a label and a value, such as "Email" and an address. */
    contacts: z.array(z.object({ label: displayText(text.max(60)), value: displayText(text.max(200)) }).strict()).max(4).optional(),
  }),
} as const;
