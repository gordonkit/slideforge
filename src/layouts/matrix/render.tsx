import { ContentBlocks } from "../../components/content.js";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

/** A 2 × 2 matrix: four quadrants, with optional axis names above and below the grid. */
export function MatrixLayout({ slide, variant }: LayoutProps<"matrix">) {
  return <div className="sf-matrix">
    {slide.yAxis && <p className="sf-matrix-axis sf-matrix-y">↑ <DisplayTextContent value={slide.yAxis} size="card-body" /></p>}
    <div className="sf-matrix-grid">
      {slide.quadrants.map((quadrant, index) => <section className="sf-matrix-cell" key={index}><h2><DisplayTextContent value={quadrant.title} size="card-title" /></h2><ContentBlocks blocks={quadrant.blocks} size="card-body" /></section>)}
      {variant === "lines" && <><div className="sf-matrix-line sf-matrix-vline" data-pptx-allow-overlap="true" aria-hidden="true" /><div className="sf-matrix-line sf-matrix-hline" data-pptx-allow-overlap="true" aria-hidden="true" /></>}
    </div>
    {slide.xAxis && <p className="sf-matrix-axis sf-matrix-x"><DisplayTextContent value={slide.xAxis} size="card-body" /> →</p>}
  </div>;
}
