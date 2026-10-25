import { blocks, slideObject } from "../../schemas/fields.js";

export const content = {
  family: "content",
  variants: ["default"],
  slide: slideObject("content", { blocks }),
} as const;
