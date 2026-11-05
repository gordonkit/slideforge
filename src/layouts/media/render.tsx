import { ContentBlocks } from "../../components/content.js";
import type { LayoutProps } from "../types.js";

/** One image as the subject, with a caption and optional text next to it. */
export function MediaLayout({ slide }: LayoutProps<"media">) {
  return <div className="sf-media" data-text={slide.blocks.length > 0 ? "" : undefined}>
    <figure className="sf-media-figure"><img src={slide.image} alt={slide.alt} />{slide.caption && <figcaption>{slide.caption}</figcaption>}</figure>
    {slide.blocks.length > 0 && <ContentBlocks blocks={slide.blocks} />}
  </div>;
}
