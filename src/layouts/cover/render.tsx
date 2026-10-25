import type { LayoutProps } from "../types.js";

export function CoverLayout({ slide, variant }: LayoutProps<"cover">) {
  return <>
    {variant === "split" && <div className="sf-cover-panel" aria-hidden="true" />}
    {slide.author && <p className="sf-author">{slide.author}</p>}
  </>;
}
