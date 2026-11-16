import type { CSSProperties } from "react";
import { ContentBlocks } from "../../components/content.js";
import { SlideCard } from "../../components/slide.js";
import type { LayoutProps } from "../types.js";

export function CardsLayout({ slide, variant }: LayoutProps<"cards">) {
  const honeycomb = variant === "honeycomb";
  const shape = honeycomb ? "hexagon" : variant === "circle" || variant === "hexagon" || variant === "pentagon" ? variant : undefined;
  const numbered = variant === "badge" || shape !== undefined;
  const style = {
    ...(slide.fillOpacity === undefined ? {} : { "--sf-fill-opacity": slide.fillOpacity }),
    ...(honeycomb ? { "--sf-cards-count": slide.cards.length } : {}),
  } as CSSProperties;
  const className = slide.fillOpacity === undefined ? "sf-cards" : "sf-cards sf-cards-filled";
  // Honeycomb hexagons nest into each other's bounding boxes on purpose.
  return <div className={className} style={Object.keys(style).length ? style : undefined} data-count={slide.cards.length} data-pptx-allow-overlap={honeycomb ? "true" : undefined}>{slide.cards.map((card, index) => <SlideCard title={card.title} badge={numbered ? index + 1 : undefined} shape={shape} key={index}>{card.blocks && <ContentBlocks blocks={card.blocks} size="card-body" scale={shape === "hexagon" || shape === "pentagon" ? 0.8 : 1} />}</SlideCard>)}</div>;
}
