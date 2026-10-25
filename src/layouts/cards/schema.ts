import { z } from "zod";
import { blocks, slideObject, text } from "../../schemas/fields.js";

export const cards = {
  family: "cards",
  variants: ["default"],
  slide: slideObject("cards", {
    cards: z.array(z.object({ title: text.max(200), blocks }).strict()).min(1).max(6),
  }),
} as const;
