import type { LayoutProps } from "../types.js";

type Item = LayoutProps<"hub">["slide"]["items"][number];

function HubItem({ item, side }: { item: Item; side: "left" | "right" }) {
  const body = <div className="sf-hub-item"><span className="sf-hub-title">{item.title}</span>{item.text && <span className="sf-hub-text">{item.text}</span>}</div>;
  const line = <span className="sf-hub-line" aria-hidden="true" />;
  return <li className={`sf-hub-row sf-hub-${side}`}>{side === "left" ? <>{body}{line}</> : <>{line}{body}</>}</li>;
}

/** A central idea with items on both sides, each joined to the center by a line. */
export function HubLayout({ slide }: LayoutProps<"hub">) {
  const half = Math.ceil(slide.items.length / 2);
  return <div className="sf-hub">
    <ul className="sf-hub-side">{slide.items.slice(0, half).map((item, index) => <HubItem item={item} side="left" key={index} />)}</ul>
    <div className="sf-hub-center"><span>{slide.center}</span></div>
    <ul className="sf-hub-side">{slide.items.slice(half).map((item, index) => <HubItem item={item} side="right" key={index} />)}</ul>
  </div>;
}
