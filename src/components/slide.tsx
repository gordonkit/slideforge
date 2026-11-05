import type { ReactNode } from "react";
import type { Slide as PresentationSlide } from "../schemas/presentation.js";
import { studioRenderUrl } from "../schemas/background.js";
import { layoutFamily, slideVariant } from "../layouts/registry.js";

export function SlideSubtitle({ children }: { children: ReactNode }) {
  return <p className="sf-subtitle"><span className="sf-subtitle-mark" aria-hidden="true" /><span className="sf-subtitle-text">{children}</span></p>;
}

export function SlideTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="sf-header"><h1>{title}</h1>{subtitle && <SlideSubtitle>{subtitle}</SlideSubtitle>}</header>;
}

export function SlideContent({ children }: { children: ReactNode }) {
  return <div className="sf-content">{children}</div>;
}

/** Regular polygons (the pentagon points down) drawn behind a card's text; the card keeps the polygon's aspect ratio. The circle is a plain round box, so it needs no drawing. */
export const cardShapes = {
  hexagon: { viewBox: "0 0 100 86.6", points: "25,0 75,0 100,43.3 75,86.6 25,86.6 0,43.3" },
  pentagon: { viewBox: "0 0 100 95.1", points: "50,95.1 100,58.8 80.9,0 19.1,0 0,58.8" },
} as const;
export type CardShape = keyof typeof cardShapes | "circle";

export function SlideCard({ title, badge, shape, children }: { title: string; badge?: number | undefined; shape?: CardShape | undefined; children: ReactNode }) {
  const content = <>{badge !== undefined && <span className="sf-card-badge" aria-hidden="true">{badge}</span>}<h2>{title}</h2>{children}</>;
  if (shape === undefined) return <article className="sf-card">{content}</article>;
  if (shape === "circle") return <article className="sf-card"><div className="sf-card-inner">{content}</div></article>;
  const { viewBox, points } = cardShapes[shape];
  return <article className="sf-card"><div className="sf-card-inner"><svg className="sf-card-shape" viewBox={viewBox} aria-hidden="true"><polygon points={points} /></svg>{content}</div></article>;
}

export function SlideColumns({ children }: { children: ReactNode }) {
  return <div className="sf-columns">{children}</div>;
}

export function SlideFooter({ text, number, total }: { text?: string; number: number; total: number }) {
  return <footer className="sf-footer"><span>{text}</span><span>{number} / {total}</span></footer>;
}

/**
 * Full-slide background layer. Export turns it into the PowerPoint slide background, so it is never
 * converted as a shape; a studio share link is drawn by the studio's `/render` page.
 */
export function SlideBackground({ source }: { source: string }) {
  const render = studioRenderUrl(source);
  return <div className="sf-background" data-pptx-background="" aria-hidden="true">
    {render ? <iframe src={render} title="Background" tabIndex={-1} /> : <img src={source} alt="" />}
  </div>;
}

export function Slide({ slide, variant = slideVariant(slide), number, total, background, children }: {
  slide: PresentationSlide; variant?: string; number: number; total: number; background?: string | undefined; children: ReactNode;
}) {
  const family = layoutFamily(slide.layout);
  // A blank slide shows only its background; its title labels the slide but is not drawn.
  const drawn = family !== "blank";
  return <section id={`slide-${number}`} className={`sf-slide sf-layout-${family} sf-variant-${variant}`} data-pptx="slide" data-layout={family} data-variant={variant} aria-label={`${number}. ${slide.title}`}>
    {background !== undefined && <SlideBackground source={background} />}
    {drawn && <SlideTitle title={slide.title} {...(slide.subtitle === undefined ? {} : { subtitle: slide.subtitle })} />}
    {drawn && <SlideContent>{children}</SlideContent>}
    {drawn && <SlideFooter text={slide.footer} number={number} total={total} />}
    {slide.notes !== undefined && <aside data-pptx-notes="" hidden>{slide.notes}</aside>}
  </section>;
}

export const SlideFrame = Slide;
