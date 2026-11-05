import { z } from "zod";
import { contentBlockSchema, slideObject, text, xmlText } from "../../schemas/fields.js";

// default: horizontal bars; columns: vertical columns; donut: a ring of shares with a legend.
const variants = ["default", "columns", "donut"] as const;

export const chart = {
  family: "chart",
  variants,
  slide: slideObject("chart", variants, {
    data: z.array(z.object({
      label: text.max(100),
      value: z.number().finite().nonnegative(),
    }).strict()).min(1).max(10),
    unit: xmlText.max(40).optional(),
    blocks: z.array(contentBlockSchema).max(4).default([]),
  }),
} as const;
