import { z } from "zod";
import { slideObject, text } from "../../schemas/fields.js";

const variants = ["default"] as const;

// A task spans the periods from `start` to `end`, both one-based and inclusive.
export const gantt = {
  family: "gantt",
  variants,
  slide: slideObject("gantt", variants, {
    periods: z.array(text.max(40)).min(2).max(12),
    tasks: z.array(z.object({
      label: text.max(100),
      start: z.number().int().min(1),
      end: z.number().int().min(1),
      progress: z.number().finite().min(0).max(100).optional(),
    }).strict()).min(1).max(8),
  }).superRefine((slide, context) => {
    slide.tasks.forEach((task, index) => {
      if (task.end > slide.periods.length) {
        context.addIssue({ code: "custom", path: ["tasks", index, "end"], message: `end must not exceed the number of periods (${slide.periods.length})` });
      }
      if (task.start > task.end) {
        context.addIssue({ code: "custom", path: ["tasks", index, "start"], message: "start must not be after end" });
      }
    });
  }),
} as const;
