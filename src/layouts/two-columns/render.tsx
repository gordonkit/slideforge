import { ContentBlocks } from "../../components/content.js";
import { SlideColumns } from "../../components/slide.js";
import type { LayoutProps } from "../types.js";

export function TwoColumnsLayout({ slide }: LayoutProps<"two-columns">) {
  return <SlideColumns><ContentBlocks blocks={slide.left} /><ContentBlocks blocks={slide.right} /></SlideColumns>;
}
