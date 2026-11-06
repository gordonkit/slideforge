import { z } from "zod";
import { displayText, slideObject, text, xmlText } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const table = {
  family: "table",
  variants,
  slide: slideObject("table", variants, {
    columns: z.array(displayText(text.max(200))).min(1).max(8),
    columnWidths: z.array(z.number().positive().max(100)).min(1).max(8).optional(),
    rows: z.array(z.array(displayText(xmlText.max(2000))).min(1).max(8)).min(1).max(14),
  }).superRefine((slide, context) => {
    if (slide.columnWidths !== undefined) {
      if (slide.columnWidths.length !== slide.columns.length) {
        context.addIssue({
          code: "custom",
          path: ["columnWidths"],
          message: "Column widths must have one percentage per column",
        });
      }
      if (Math.abs(slide.columnWidths.reduce((sum, width) => sum + width, 0) - 100) > 0.000001) {
        context.addIssue({
          code: "custom",
          path: ["columnWidths"],
          message: "Column width percentages must sum to 100",
        });
      }
    }
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
