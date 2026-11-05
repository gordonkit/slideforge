import { ContentBlocks } from "../../components/content.js";
import { SlideCard } from "../../components/slide.js";
import type { LayoutProps } from "../types.js";

export function CardsLayout({ slide, variant }: LayoutProps<"cards">) {
  const shape = variant === "hexagon" || variant === "pentagon" ? variant : undefined;
  const numbered = variant === "circle" || shape !== undefined;
  return <div className="sf-cards" data-count={slide.cards.length}>{slide.cards.map((card, index) => <SlideCard title={card.title} badge={numbered ? index + 1 : undefined} shape={shape} key={index}><ContentBlocks blocks={card.blocks} /></SlideCard>)}</div>;
}
