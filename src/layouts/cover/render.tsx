import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

export function CoverLayout({ slide, variant }: LayoutProps<"cover">) {
  return <>
    {variant === "split" && <div className="sf-cover-panel" aria-hidden="true" />}
    {slide.author && <p className="sf-author"><DisplayTextContent value={slide.author} size="author" /></p>}
  </>;
}
