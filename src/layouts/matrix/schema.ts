import { z } from "zod";
import { blocks, slideObject, text } from "../../schemas/fields.js";

// default: four surface cells; lines: four open cells split by a cross.
const variants = ["default", "lines"] as const;

export const matrix = {
  family: "matrix",
  variants,
  slide: slideObject("matrix", variants, {
    /** Top left, top right, bottom left, bottom right. */
    quadrants: z.array(z.object({ title: text.max(200), blocks }).strict()).length(4),
    /** Names the vertical axis, drawn above the grid with an up arrow. */
    yAxis: text.max(80).optional(),
    /** Names the horizontal axis, drawn below the grid with a right arrow. */
    xAxis: text.max(80).optional(),
  }),
} as const;
