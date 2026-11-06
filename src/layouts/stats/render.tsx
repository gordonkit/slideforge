import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

/** Key figures: a large number, its label, and an optional line of text. */
export function StatsLayout({ slide }: LayoutProps<"stats">) {
  return <ul className="sf-stats" data-count={slide.stats.length}>{slide.stats.map((stat, index) => <li className="sf-stat" key={index} data-highlight={stat.highlight || undefined}>
    <span className="sf-stat-value"><DisplayTextContent value={stat.value} size={slide.stats.length >= 4 ? 84 : 120} /></span>
    <span className="sf-stat-label"><DisplayTextContent value={stat.label} size="card-title" /></span>
    {stat.labelDetail && <span className="sf-stat-label-detail"><DisplayTextContent value={stat.labelDetail} size="card-body" /></span>}
    {stat.text && <span className="sf-stat-text"><DisplayTextContent value={stat.text} size="card-body" /></span>}
  </li>)}</ul>;
}
