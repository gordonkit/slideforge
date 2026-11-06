import { z } from "zod";
import { displayText, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

// default: large accent numbers over a rule; cards: the same in centered surface cards.
const variants = ["default", "cards"] as const;

export const stats = {
  family: "stats",
  variants,
  slide: slideObject("stats", variants, {
    stats: z.array(z.object({
      /** The figure itself, such as "98%" or "$4.2M". Keep it short. */
      value: displayText(text.max(30)),
      label: displayText(text.max(100)),
      labelDetail: displayText(text.max(100)).optional(),
      highlight: z.boolean().optional(),
      text: optionalText,
    }).strict()).min(2).max(6),
  }),
} as const;
