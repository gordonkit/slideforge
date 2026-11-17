import type { CSSProperties } from "react";
import { ContentBlocks } from "../../components/content.js";
import { gradientFill, mixColors, readableOn, rgbChannels } from "../../themes/color.js";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";
import { borderTokens, themeTokens } from "../../themes/tokens.js";

function dividerStyle(divider: LayoutProps<"panels">["slide"]["divider"]): CSSProperties | undefined {
  if (divider === undefined) return undefined;
  return {
    ...(divider.color === undefined ? {} : { "--sf-panel-divider-rgb": rgbChannels(divider.color) }),
    ...(divider.width === undefined ? {} : { "--sf-panel-divider-width": `${divider.width}px` }),
    ...(divider.opacity === undefined ? {} : { "--sf-panel-divider-opacity": divider.opacity }),
  } as CSSProperties;
}

/** Panels split the slide with thin lines instead of cards; a panel with a `color` is filled with it. */
export function PanelsLayout({ slide, variant, panelGradient = 0, panelDivider = { color: themeTokens.light.border, width: borderTokens.width } }: LayoutProps<"panels">) {
  return <div className="sf-panels" style={dividerStyle(slide.divider)} data-count={slide.panels.length} data-numbered={slide.numbered === false ? "false" : undefined}>{slide.panels.flatMap((panel, index) => {
    const fromOpacity = typeof panel.fillOpacity === "number" ? panel.fillOpacity : panel.fillOpacity?.from;
    const toOpacity = typeof panel.fillOpacity === "number" ? panel.fillOpacity : panel.fillOpacity?.to;
    const style = panel.color === undefined ? undefined : {
      "--sf-panel-fill": gradientFill(panel.color, "#000000", panelGradient, fromOpacity, toOpacity),
      // Judge the text color on the middle of the gradient, so it reads across the whole fill.
      "--sf-panel-text": readableOn(mixColors(panel.color, "#000000", panelGradient / 2)),
    } as CSSProperties;
    const content = <section className={`sf-panel${panel.color === undefined ? "" : " sf-panel-filled"}`} style={style} key={`panel-${index}`}>
      {slide.numbered !== false && <span className="sf-panel-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>}
      <h2><DisplayTextContent value={panel.title} size="card-title" scale={slide.panels.length >= 6 ? 0.85 : 1} /></h2>
      <ContentBlocks blocks={panel.blocks} size="card-body" scale={slide.panels.length >= 5 ? variant === "rows" ? 0.7 : 0.8 : 1} />
    </section>;
    const lineStyle = panel.divider?.style ?? slide.divider?.style;
    const patterned = lineStyle === "dashed" || lineStyle === "dotted";
    // Export serializes SVGs without inherited CSS, so stroke attributes need resolved values.
    const line = { ...panelDivider, ...slide.divider, ...panel.divider };
    return index === 0 ? [content] : [<div className="sf-panel-line" style={dividerStyle(panel.divider)} data-style={lineStyle} aria-hidden="true" key={`line-${index}`}>
      {patterned && <svg xmlns="http://www.w3.org/2000/svg"><line x1={variant === "rows" ? "0" : "50%"} y1={variant === "rows" ? "50%" : "0"} x2={variant === "rows" ? "100%" : "50%"} y2={variant === "rows" ? "50%" : "100%"} stroke={line.color} strokeWidth={line.width} strokeOpacity={line.opacity ?? 1} strokeDasharray={lineStyle === "dotted" ? `0 ${line.width * 2}` : `${line.width * 3}`} strokeLinecap={lineStyle === "dotted" ? "round" : "butt"} /></svg>}
    </div>, content];
  })}</div>;
}
