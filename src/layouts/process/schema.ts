import { z } from "zod";
import { displayText, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

// default: steps in a row, joined by arrows; vertical: steps stacked, joined by down arrows.
const variants = ["default", "vertical"] as const;

export const processLayout = {
  family: "process",
  variants,
  slide: slideObject("process", variants, {
    steps: z.array(z.object({ title: displayText(text.max(100)), text: optionalText }).strict()).min(2).max(6),
  }),
} as const;
