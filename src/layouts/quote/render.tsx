import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

export function QuoteLayout({ slide }: LayoutProps<"quote">) {
  return <figure className="sf-quote">
    <blockquote><p><DisplayTextContent value={slide.quote} size="quote" /></p></blockquote>
    {slide.attribution && <figcaption><DisplayTextContent value={slide.attribution} size="author" /></figcaption>}
  </figure>;
}
