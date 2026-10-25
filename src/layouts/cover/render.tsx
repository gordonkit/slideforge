import type { LayoutProps } from "../types.js";

export function CoverLayout({ slide }: LayoutProps<"cover">) {
  return slide.author ? <p className="sf-author">{slide.author}</p> : null;
}
