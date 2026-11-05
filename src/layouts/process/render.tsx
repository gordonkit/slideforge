import type { LayoutProps } from "../types.js";

/** Steps in order, each with a number, joined by arrows. */
export function ProcessLayout({ slide, variant }: LayoutProps<"process">) {
  const arrow = variant === "vertical" ? "↓" : "→";
  return <ol className="sf-process" data-count={slide.steps.length}>{slide.steps.flatMap((step, index) => {
    const item = <li className="sf-step" key={`step-${index}`}>
      <span className="sf-step-number" aria-hidden="true">{index + 1}</span>
      <span className="sf-step-body"><span className="sf-step-title">{step.title}</span>{step.text && <span className="sf-step-text">{step.text}</span>}</span>
    </li>;
    return index === 0 ? [item] : [<li className="sf-process-arrow" aria-hidden="true" key={`arrow-${index}`}>{arrow}</li>, item];
  })}</ol>;
}
