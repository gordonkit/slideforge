import { slideObject, xmlText } from "../../schemas/fields.js";

// default: code on a light surface; dark: code on a dark panel.
const variants = ["default", "dark"] as const;

const MAX_LINES = 18;

export const code = {
  family: "code",
  variants,
  slide: slideObject("code", variants, {
    /** The code, kept as written: line breaks and indentation are preserved. */
    code: xmlText.min(1).max(3000),
    /** A label for the language or file, such as "TypeScript" or "src/index.ts". */
    language: xmlText.max(60).optional(),
  }).superRefine((slide, context) => {
    const lines = slide.code.split("\n").length;
    if (lines > MAX_LINES) {
      context.addIssue({ code: "custom", path: ["code"], message: `Code has ${lines} lines; the slide fits ${MAX_LINES}` });
    }
  }),
} as const;
