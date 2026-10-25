import { optionalText, slideObject } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const cover = {
  family: "cover",
  variants,
  slide: slideObject("cover", variants, { author: optionalText }),
} as const;
