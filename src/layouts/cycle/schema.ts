import { z } from "zod";
import { displayText, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

// default: cards around a ring joined by arrows; ring: the steps as segments of one ring, nested by triangular tips.
const variants = ["default", "ring"] as const;

export const cycle = {
  family: "cycle",
  variants,
  slide: slideObject("cycle", variants, {
    /** An optional idea in the middle of the ring. */
    center: displayText(text.max(100)).optional(),
    /** Steps clockwise from the top; the last one leads back to the first. */
    steps: z.array(z.object({ title: displayText(text.max(100)), text: optionalText }).strict()).min(3).max(8),
  }),
} as const;
