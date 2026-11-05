import type { LayoutProps } from "../types.js";

/** An agenda: numbered rows, each optionally a link that jumps to another slide. */
export function AgendaLayout({ slide }: LayoutProps<"agenda">) {
  return <ol className="sf-agenda" data-count={slide.items.length}>{slide.items.map((item, index) => {
    const content = <>
      <span className="sf-agenda-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <span className="sf-agenda-body"><span className="sf-agenda-title">{item.title}</span>{item.text && <span className="sf-agenda-text">{item.text}</span>}</span>
    </>;
    return <li key={index}>{item.slide === undefined
      ? <div className="sf-agenda-item">{content}</div>
      : <a className="sf-agenda-item" href={`#slide-${item.slide}`} data-sf-link={item.slide}>{content}<span className="sf-agenda-go" aria-hidden="true">→</span></a>}</li>;
  })}</ol>;
}
