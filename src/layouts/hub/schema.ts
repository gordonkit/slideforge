import { z } from "zod";
import { displayText, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const hub = {
  family: "hub",
  variants,
  slide: slideObject("hub", variants, {
    /** The idea at the center. */
    center: displayText(text.max(100)),
    /** Items around it: the first half on the left, the rest on the right. */
    items: z.array(z.object({ title: displayText(text.max(100)), text: optionalText }).strict()).min(3).max(6),
  }),
} as const;
