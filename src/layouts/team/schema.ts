import { z } from "zod";
import { displayText, imageSourceSchema, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const team = {
  family: "team",
  variants,
  slide: slideObject("team", variants, {
    members: z.array(z.object({
      name: displayText(text.max(100)),
      role: optionalText,
      text: optionalText,
      /** A portrait, drawn as a circle. Without one, the name's first letter is drawn in the circle. */
      image: imageSourceSchema.optional(),
    }).strict()).min(2).max(6),
  }),
} as const;
