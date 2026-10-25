import { blocks, slideObject } from "../../schemas/fields.js";

export const twoColumns = {
  family: "two-columns",
  variants: ["default"],
  slide: slideObject("two-columns", { left: blocks, right: blocks }),
} as const;
