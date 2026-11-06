import { z } from "zod";
import { displayText, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const compare = {
  family: "compare",
  variants,
  slide: slideObject("compare", variants, {
    options: z.array(z.object({
      title: displayText(text.max(100)),
      /** A short figure or tag under the title, such as a price. */
      label: optionalText,
      items: z.array(displayText(text.max(200))).min(1).max(8),
      /** Draws the option in the accent color, to mark the recommended one. */
      highlight: z.boolean().optional(),
    }).strict()).min(2).max(4),
  }),
} as const;
