import { z } from "zod";
import { slideObject } from "../../schemas/fields.js";

const variants = ["default"] as const;
const notDrawn = (field: string) => z.never({ error: `A blank slide draws only its background; remove ${field}` }).optional();

// Only the background is drawn; the title still names the slide, and notes become speaker notes.
export const blank = {
  family: "blank",
  variants,
  slide: slideObject("blank", variants, { subtitle: notDrawn("subtitle"), footer: notDrawn("footer") }),
} as const;
