import { z } from "zod";
import { colorScheme, displayText, hexColor, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

// default: steps in a row, joined by arrows; vertical: steps stacked, joined by down arrows.
const variants = ["default", "vertical"] as const;

export const processLayout = {
  family: "process",
  variants,
  slide: slideObject("process", variants, {
    steps: z.array(z.object({ title: displayText(text.max(100)), text: optionalText, color: hexColor.optional() }).strict()).min(2).max(6),
    colorScheme: colorScheme.optional(),
    /** The opacity of each card's fill, so a patterned background shows through evenly. */
    fillOpacity: z.number().min(0).max(1).optional(),
  }),
} as const;
