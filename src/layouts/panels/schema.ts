import { z } from "zod";
import { blocks, displayText, hexColor, slideObject, text } from "../../schemas/fields.js";

// default: side-by-side columns split by vertical lines; rows: stacked rows split by horizontal lines.
const variants = ["default", "rows"] as const;

export const panels = {
  family: "panels",
  variants,
  slide: slideObject("panels", variants, {
    numbered: z.boolean().optional(),
    panels: z.array(z.object({
      title: displayText(text.max(200)),
      blocks,
      /** Fills the panel with this color (a gradient with the `gradient.panel` token); the text color follows it. */
      color: hexColor.optional(),
    }).strict()).min(2).max(7),
  }),
} as const;
