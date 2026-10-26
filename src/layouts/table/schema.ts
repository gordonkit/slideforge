import { z } from "zod";
import { slideObject, text, xmlText } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const table = {
  family: "table",
  variants,
  slide: slideObject("table", variants, {
    columns: z.array(text.max(200)).min(1).max(8),
    rows: z.array(z.array(xmlText.max(2000)).min(1).max(8)).min(1).max(14),
  }).superRefine((slide, context) => {
    slide.rows.forEach((row, index) => {
      if (row.length !== slide.columns.length) {
        context.addIssue({
          code: "custom",
          path: ["rows", index],
          message: "Every row must have one cell per column",
        });
      }
    });
  }),
} as const;
