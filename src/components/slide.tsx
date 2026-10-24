import type { ReactNode } from "react";
import type { Slide as PresentationSlide } from "../schemas/presentation.js";

export function SlideSubtitle({ children }: { children: ReactNode }) {
  return <p className="sf-subtitle">{children}</p>;
}

export function SlideTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return <header className="sf-header"><h1>{title}</h1>{subtitle && <SlideSubtitle>{subtitle}</SlideSubtitle>}</header>;
}

export function SlideContent({ children }: { children: ReactNode }) {
  return <div className="sf-content">{children}</div>;
}

export function SlideCard({ title, children }: { title: string; children: ReactNode }) {
  return <article className="sf-card"><h2>{title}</h2>{children}</article>;
}

export function SlideColumns({ children }: { children: ReactNode }) {
  return <div className="sf-columns">{children}</div>;
}

export function SlideFooter({ text, number, total }: { text?: string; number: number; total: number }) {
  return <footer className="sf-footer"><span>{text}</span><span>{number} / {total}</span></footer>;
}

export function Slide({ slide, number, total, children }: {
  slide: PresentationSlide; number: number; total: number; children: ReactNode;
}) {
  return <section className={`sf-slide sf-layout-${slide.layout}`} data-pptx="slide" data-layout={slide.layout} aria-label={`${number}. ${slide.title}`}>
    <SlideTitle title={slide.title} {...(slide.subtitle === undefined ? {} : { subtitle: slide.subtitle })} />
    <SlideContent>{children}</SlideContent>
    <SlideFooter text={slide.footer} number={number} total={total} />
    {slide.notes !== undefined && <aside data-pptx-notes="" hidden>{slide.notes}</aside>}
  </section>;
}

export const SlideFrame = Slide;
