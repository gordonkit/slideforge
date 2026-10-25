import { ContentBlocks, SlideChart } from "../../components/content.js";
import type { LayoutProps } from "../types.js";

export function ChartLayout({ slide }: LayoutProps<"chart">) {
  return slide.blocks.length > 0
    ? <div className="sf-chart-layout"><SlideChart data={slide.data} unit={slide.unit} /><ContentBlocks blocks={slide.blocks} /></div>
    : <SlideChart data={slide.data} unit={slide.unit} />;
}
