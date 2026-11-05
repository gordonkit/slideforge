import { slideObject } from "../../schemas/fields.js";

// default: left-aligned with an accent rail; centered: centered text; band: full-bleed accent slide.
const variants = ["default", "centered", "band"] as const;

/** A divider that opens a chapter of a long presentation. It has only the common fields: `title` is the chapter's name and `subtitle` its one-line summary. */
export const section = {
  family: "section",
  variants,
  slide: slideObject("section", variants, {}),
} as const;
