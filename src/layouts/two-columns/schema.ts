import { blocks, slideObject } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const twoColumns = {
  family: "two-columns",
  variants,
  slide: slideObject("two-columns", variants, { left: blocks, right: blocks }),
} as const;
