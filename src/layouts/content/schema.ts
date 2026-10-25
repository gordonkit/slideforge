import { blocks, slideObject } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const content = {
  family: "content",
  variants,
  slide: slideObject("content", variants, { blocks }),
} as const;
