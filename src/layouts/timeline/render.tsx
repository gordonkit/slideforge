import type { LayoutProps } from "../types.js";

export function TimelineLayout({ slide }: LayoutProps<"timeline">) {
  return <ol className="sf-timeline">{slide.events.map((event, index) => <li className="sf-timeline-event" key={index}>
    <p className="sf-timeline-date">{event.date}</p>
    {/* The rail runs under the marker, so the pair is marked as intended overlap. */}
    <div className="sf-timeline-track" aria-hidden="true" data-pptx-allow-overlap="true"><span className="sf-timeline-rail" /><span className="sf-timeline-marker" /></div>
    <h2>{event.title}</h2>
    {event.text && <p className="sf-timeline-text">{event.text}</p>}
  </li>)}</ol>;
}
