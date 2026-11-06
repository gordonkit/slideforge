import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

/** A code listing in a monospaced font, with an optional language label. */
export function CodeLayout({ slide }: LayoutProps<"code">) {
  return <figure className="sf-code">
    {slide.language && <figcaption className="sf-code-language"><DisplayTextContent value={slide.language} size="caption" /></figcaption>}
    <pre className="sf-code-body"><code><DisplayTextContent value={slide.code} size={33} /></code></pre>
  </figure>;
}
