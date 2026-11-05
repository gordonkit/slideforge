import type { CSSProperties } from "react";
import { ContentBlocks } from "../../components/content.js";
import { gradientFill, mixColors, readableOn } from "../../themes/color.js";
import type { LayoutProps } from "../types.js";

/** Panels split the slide with thin lines instead of cards; a panel with a `color` is filled with it. */
export function PanelsLayout({ slide, panelGradient = 0 }: LayoutProps<"panels">) {
  return <div className="sf-panels" data-count={slide.panels.length}>{slide.panels.flatMap((panel, index) => {
    const style = panel.color === undefined ? undefined : {
      "--sf-panel-fill": gradientFill(panel.color, "#000000", panelGradient),
      // Judge the text color on the middle of the gradient, so it reads across the whole fill.
      "--sf-panel-text": readableOn(mixColors(panel.color, "#000000", panelGradient / 2)),
    } as CSSProperties;
    const content = <section className={`sf-panel${panel.color === undefined ? "" : " sf-panel-filled"}`} style={style} key={`panel-${index}`}>
      <span className="sf-panel-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
      <h2>{panel.title}</h2>
      <ContentBlocks blocks={panel.blocks} />
    </section>;
    return index === 0 ? [content] : [<div className="sf-panel-line" aria-hidden="true" key={`line-${index}`} />, content];
  })}</div>;
}
