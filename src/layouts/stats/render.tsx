import type { LayoutProps } from "../types.js";

/** Key figures: a large number, its label, and an optional line of text. */
export function StatsLayout({ slide }: LayoutProps<"stats">) {
  return <ul className="sf-stats" data-count={slide.stats.length}>{slide.stats.map((stat, index) => <li className="sf-stat" key={index}>
    <span className="sf-stat-value">{stat.value}</span>
    <span className="sf-stat-label">{stat.label}</span>
    {stat.text && <span className="sf-stat-text">{stat.text}</span>}
  </li>)}</ul>;
}
