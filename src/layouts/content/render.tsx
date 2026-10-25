import { ContentBlocks } from "../../components/content.js";
import type { LayoutProps } from "../types.js";

export function ContentLayout({ slide }: LayoutProps<"content">) {
  return <ContentBlocks blocks={slide.blocks} />;
}
