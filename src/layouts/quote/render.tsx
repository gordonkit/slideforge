import type { LayoutProps } from "../types.js";

export function QuoteLayout({ slide }: LayoutProps<"quote">) {
  return <figure className="sf-quote">
    <blockquote><p>{slide.quote}</p></blockquote>
    {slide.attribution && <figcaption>{slide.attribution}</figcaption>}
  </figure>;
}
