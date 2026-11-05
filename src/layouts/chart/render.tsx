import { ContentBlocks, SlideChart } from "../../components/content.js";
import type { LayoutProps } from "../types.js";

export function ChartLayout({ slide, variant }: LayoutProps<"chart">) {
  const chart = <SlideChart data={slide.data} unit={slide.unit} variant={variant} />;
  return slide.blocks.length > 0
    ? <div className="sf-chart-layout">{chart}<ContentBlocks blocks={slide.blocks} /></div>
    : chart;
}
