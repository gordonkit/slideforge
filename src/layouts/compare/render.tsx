import type { LayoutProps } from "../types.js";

/** Two to four options side by side, each with a title, an optional label, and a list; one can be highlighted. */
export function CompareLayout({ slide }: LayoutProps<"compare">) {
  return <div className="sf-compare" data-count={slide.options.length}>{slide.options.map((option, index) => <section className={`sf-option${option.highlight ? " sf-option-highlight" : ""}`} key={index}>
    <header className="sf-option-head"><h2>{option.title}</h2>{option.label && <p className="sf-option-label">{option.label}</p>}</header>
    <ul className="sf-option-items">{option.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>
  </section>)}</div>;
}
