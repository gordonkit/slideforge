import { z } from "zod";
import { blocks, slideObject, text } from "../../schemas/fields.js";

const variants = ["default"] as const;

export const cards = {
  family: "cards",
  variants,
  slide: slideObject("cards", variants, {
    cards: z.array(z.object({ title: text.max(200), blocks }).strict()).min(1).max(6),
  }),
} as const;
