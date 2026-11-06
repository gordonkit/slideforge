import type { ReactNode } from "react";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

type Target = { slide?: number | undefined };

/** A link to a slide when the item has a target, else a plain box. */
function Row({ item, className, children }: { item: Target; className: string; children: ReactNode }) {
  return item.slide === undefined
    ? <div className={className}>{children}</div>
    : <a className={className} href={`#slide-${item.slide}`} data-sf-link={item.slide}>{children}</a>;
}

/** An agenda: numbered rows, each optionally a link that jumps to another slide; `outline` lists the subsections under each. */
export function AgendaLayout({ slide, variant }: LayoutProps<"agenda">) {
  const items = slide.items ?? [];
  const outline = variant === "outline";
  return <ol className="sf-agenda" data-count={items.length} data-current={slide.current}>{items.map((item, index) => {
    const number = <span className="sf-agenda-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>;
    const body = <span className="sf-agenda-body"><span className="sf-agenda-title"><DisplayTextContent value={item.title} size={outline ? 34 : variant === "chapters" ? 42 : "card-title"} /></span>{item.text && !outline && <span className="sf-agenda-text"><DisplayTextContent value={item.text} size="card-body" /></span>}</span>;
    const go = item.slide === undefined ? null : <span className="sf-agenda-go" aria-hidden="true">→</span>;
    const current = slide.current === index + 1 ? " sf-agenda-current" : "";
    return <li key={index} className={outline ? `sf-agenda-chapter${current}` : undefined}>
      <Row item={item} className={outline ? "sf-agenda-head" : `sf-agenda-item${current}`}>{number}{body}{go}</Row>
      {outline && item.items && <ul className="sf-agenda-subs">{item.items.map((sub, subIndex) =>
        <li key={subIndex}><Row item={sub} className="sf-agenda-sub"><span className="sf-agenda-sub-title"><DisplayTextContent value={sub.title} size={30} /></span>{sub.slide !== undefined && <span className="sf-agenda-go" aria-hidden="true">→</span>}</Row></li>)}</ul>}
    </li>;
  })}</ol>;
}
