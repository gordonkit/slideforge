import type { Slide } from "../../schemas/presentation.js";
import { layoutFamily } from "../registry.js";

type AgendaSlide = Extract<Slide, { layout: "agenda" | `agenda/${string}` }>;

/** The presentation's `section` slides as agenda items: the title, the subtitle as text, and a link to the slide. */
export function sectionItems(slides: readonly Slide[]): NonNullable<AgendaSlide["items"]> {
  return slides.flatMap((slide, index) => layoutFamily(slide.layout) === "section"
    ? [{ title: slide.title, ...(slide.subtitle === undefined ? {} : { text: slide.subtitle }), slide: index + 1 }] : []);
}

/** The slides with every agenda that has no `items` filled in from the `section` slides. */
export function resolveAgendas(slides: readonly Slide[]): Slide[] {
  const items = sectionItems(slides);
  return slides.map((slide) => layoutFamily(slide.layout) === "agenda" && (slide as AgendaSlide).items === undefined
    ? { ...slide, items } as Slide : slide);
}

/** The 1-based number of each `section` slide among the sections, by slide index. */
export function sectionNumbers(slides: readonly Slide[]): Map<number, number> {
  const numbers = new Map<number, number>();
  slides.forEach((slide, index) => { if (layoutFamily(slide.layout) === "section") numbers.set(index, numbers.size + 1); });
  return numbers;
}
