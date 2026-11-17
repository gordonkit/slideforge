import { z } from "zod";
import { blocks, displayText, hexColor, slideObject, text } from "../../schemas/fields.js";

// default: side-by-side columns split by vertical lines; rows: stacked rows split by horizontal lines.
const variants = ["default", "rows"] as const;

const divider = z.object({
  color: hexColor.optional(),
  width: z.number().finite().min(0).max(120).optional(),
  opacity: z.number().finite().min(0).max(1).optional(),
  style: z.enum(["solid", "dashed", "dotted"]).optional(),
}).strict();

const opacity = z.number().finite().min(0).max(1);
const fillOpacity = z.union([
  opacity,
  z.object({ from: opacity, to: opacity }).strict(),
]);

export const panels = {
  family: "panels",
  variants,
  slide: slideObject("panels", variants, {
    numbered: z.boolean().optional(),
    divider: divider.optional(),
    panels: z.array(z.object({
      title: displayText(text.max(200)),
      blocks,
      /** Fills the panel with this color (a gradient with the `gradient.panel` token); the text color follows it. */
      color: hexColor.optional(),
      fillOpacity: fillOpacity.optional(),
      divider: divider.optional(),
    }).strict().refine(panel => panel.fillOpacity === undefined || panel.color !== undefined, {
      path: ["fillOpacity"],
      message: "fillOpacity requires a panel color",
    })).min(2).max(7),
  }).superRefine((slide, context) => {
    if (slide.panels[0]?.divider !== undefined) {
      context.addIssue({ code: "custom", path: ["panels", 0, "divider"], message: "The first panel has no preceding divider" });
    }
  }),
} as const;
