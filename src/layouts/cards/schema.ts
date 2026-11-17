import { z } from "zod";
import { blocks, colorScheme, displayText, hexColor, slideObject, text } from "../../schemas/fields.js";

const variants = ["default", "rounded", "badge", "circle", "hexagon", "pentagon", "honeycomb"] as const;

export const cards = {
  family: "cards",
  variants,
  slide: slideObject("cards", variants, {
    /** A card without `blocks` shows only its title, for example a list of topic names. */
    cards: z.array(z.object({ title: displayText(text.max(200)), blocks: blocks.optional(), color: hexColor.optional() }).strict()).min(1).max(6),
    colorScheme: colorScheme.optional(),
    /** The opacity of each card's fill (or shape), so a patterned background shows through evenly. */
    fillOpacity: z.number().min(0).max(1).optional(),
  }),
} as const;
