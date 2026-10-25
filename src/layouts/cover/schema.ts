import { optionalText, slideObject } from "../../schemas/fields.js";

// default: left-aligned title; centered: centered text; split: accent panel on the right third;
// band: full-bleed accent block behind the title.
const variants = ["default", "centered", "split", "band"] as const;

export const cover = {
  family: "cover",
  variants,
  slide: slideObject("cover", variants, { author: optionalText }),
} as const;
