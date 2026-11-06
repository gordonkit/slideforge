import { z } from "zod";
import { displayText, optionalDisplayText as optionalText, slideObject, text } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const timeline = {
  family: "timeline",
  variants,
  slide: slideObject("timeline", variants, {
    events: z.array(z.object({ date: displayText(text.max(100)), title: displayText(text.max(200)), text: optionalText }).strict()).min(2).max(6),
  }),
} as const;
