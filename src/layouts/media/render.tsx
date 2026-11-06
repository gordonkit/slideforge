import { ContentBlocks } from "../../components/content.js";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";

/** One image as the subject, with a caption and optional text next to it. */
export function MediaLayout({ slide, variant }: LayoutProps<"media">) {
  return <div className="sf-media" data-text={slide.blocks.length > 0 ? "" : undefined}>
    <figure className="sf-media-figure"><img src={slide.image} alt={slide.alt} />{slide.caption && <figcaption><DisplayTextContent value={slide.caption} size="caption" /></figcaption>}</figure>
    {slide.blocks.length > 0 && <ContentBlocks blocks={slide.blocks} size={variant === "full" ? "card-body" : "body"} />}
  </div>;
}
