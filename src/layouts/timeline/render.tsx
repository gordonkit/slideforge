import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

export function TimelineLayout({ slide }: LayoutProps<"timeline">) {
  return <ol className="sf-timeline">{slide.events.map((event, index) => <li className="sf-timeline-event" key={index}>
    <p className="sf-timeline-date"><DisplayTextContent value={event.date} size="subtitle" /></p>
    {/* The rail runs under the marker, so the pair is marked as intended overlap. */}
    <div className="sf-timeline-track" aria-hidden="true" data-pptx-allow-overlap="true"><span className="sf-timeline-rail" /><span className="sf-timeline-marker" /></div>
    <h2><DisplayTextContent value={event.title} size="card-title" /></h2>
    {event.text && <p className="sf-timeline-text"><DisplayTextContent value={event.text} size="card-body" /></p>}
  </li>)}</ol>;
}
