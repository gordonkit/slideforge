import type { LayoutProps } from "../types.js";

/** A code listing in a monospaced font, with an optional language label. */
export function CodeLayout({ slide }: LayoutProps<"code">) {
  return <figure className="sf-code">
    {slide.language && <figcaption className="sf-code-language">{slide.language}</figcaption>}
    <pre className="sf-code-body"><code>{slide.code}</code></pre>
  </figure>;
}
