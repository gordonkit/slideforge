import type { CSSProperties } from "react";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

/** Steps in order, each with a number, joined by arrows. */
export function ProcessLayout({ slide, variant }: LayoutProps<"process">) {
  const arrow = variant === "vertical" ? "↓" : "→";
  const filled = slide.fillOpacity === undefined ? undefined : { "--sf-fill-opacity": slide.fillOpacity } as CSSProperties;
  return <ol className={filled ? "sf-process sf-process-filled" : "sf-process"} style={filled} data-count={slide.steps.length}>{slide.steps.flatMap((step, index) => {
    const item = <li className="sf-step" key={`step-${index}`}>
      <span className="sf-step-number" aria-hidden="true">{index + 1}</span>
      <span className="sf-step-body"><span className="sf-step-title"><DisplayTextContent value={step.title} size="card-title" scale={slide.steps.length >= 5 ? 0.85 : 1} /></span>{step.text && <span className="sf-step-text"><DisplayTextContent value={step.text} size="card-body" scale={slide.steps.length >= 5 ? 0.8 : 1} /></span>}</span>
    </li>;
    return index === 0 ? [item] : [<li className="sf-process-arrow" aria-hidden="true" key={`arrow-${index}`}>{arrow}</li>, item];
  })}</ol>;
}
