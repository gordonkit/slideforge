import type { LayoutProps } from "../types.js";

/** Draws nothing: `Slide` leaves out the title, content region, and footer of a blank slide. */
export function BlankLayout(_props: LayoutProps<"blank">) {
  return null;
}
