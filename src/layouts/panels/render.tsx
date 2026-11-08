import type { CSSProperties } from "react";
import { ContentBlocks } from "../../components/content.js";
import { gradientFill, mixColors, readableOn } from "../../themes/color.js";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

/** Panels split the slide with thin lines instead of cards; a panel with a `color` is filled with it. */
export function PanelsLayout({ slide, variant, panelGradient = 0 }: LayoutProps<"panels">) {
  return <div className="sf-panels" data-count={slide.panels.length} data-numbered={slide.numbered === false ? "false" : undefined}>{slide.panels.flatMap((panel, index) => {
    const style = panel.color === undefined ? undefined : {
      "--sf-panel-fill": gradientFill(panel.color, "#000000", panelGradient),
      // Judge the text color on the middle of the gradient, so it reads across the whole fill.
      "--sf-panel-text": readableOn(mixColors(panel.color, "#000000", panelGradient / 2)),
    } as CSSProperties;
    const content = <section className={`sf-panel${panel.color === undefined ? "" : " sf-panel-filled"}`} style={style} key={`panel-${index}`}>
      {slide.numbered !== false && <span className="sf-panel-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>}
      <h2><DisplayTextContent value={panel.title} size="card-title" scale={slide.panels.length >= 6 ? 0.85 : 1} /></h2>
      <ContentBlocks blocks={panel.blocks} size="card-body" scale={slide.panels.length >= 5 ? variant === "rows" ? 0.7 : 0.8 : 1} />
    </section>;
    return index === 0 ? [content] : [<div className="sf-panel-line" aria-hidden="true" key={`line-${index}`} />, content];
  })}</div>;
}
