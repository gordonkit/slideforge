import { optionalText, slideObject, text } from "../../schemas/fields.js";

// default: left-aligned beside an accent bar; centered: centered, without the bar.
const variants = ["default", "centered"] as const;

export const quote = {
  family: "quote",
  variants,
  slide: slideObject("quote", variants, { quote: text.max(1000), attribution: optionalText }),
} as const;
