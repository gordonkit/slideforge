import type { Slide } from "../schemas/presentation.js";
import type { LayoutFamily } from "./registry.js";

/** Props of a family's renderer: the parsed slide, narrowed to that family. */
export interface LayoutProps<F extends LayoutFamily> {
  slide: Extract<Slide, { layout: F }>;
}
