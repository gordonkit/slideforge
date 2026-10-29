import { ContentBlocks } from "../../components/content.js";
import { SlideCard } from "../../components/slide.js";
import type { LayoutProps } from "../types.js";

export function CardsLayout({ slide }: LayoutProps<"cards">) {
  return <div className="sf-cards" data-count={slide.cards.length}>{slide.cards.map((card, index) => <SlideCard title={card.title} key={index}><ContentBlocks blocks={card.blocks} /></SlideCard>)}</div>;
}
