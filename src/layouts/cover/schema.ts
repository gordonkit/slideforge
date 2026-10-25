import { optionalText, slideObject } from "../../schemas/fields.js";

export const cover = {
  family: "cover",
  variants: ["default"],
  slide: slideObject("cover", { author: optionalText }),
} as const;
