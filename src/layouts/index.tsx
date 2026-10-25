import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import type { Slide } from "../schemas/presentation.js";
import { Slide as SlideComponent } from "../components/slide.js";
import { CardsLayout } from "./cards/render.js";
import { ChartLayout } from "./chart/render.js";
import { ContentLayout } from "./content/render.js";
import { CoverLayout } from "./cover/render.js";
import { layoutFamilies, type LayoutFamily } from "./registry.js";
import { TableLayout } from "./table/render.js";
import { TwoColumnsLayout } from "./two-columns/render.js";
import type { LayoutProps } from "./types.js";

// One renderer per registered family; the mapped type makes a missing family a compile error.
const renderers: { [F in LayoutFamily]: (props: LayoutProps<F>) => ReactNode } = {
  cover: CoverLayout,
  content: ContentLayout,
  "two-columns": TwoColumnsLayout,
  cards: CardsLayout,
  table: TableLayout,
  chart: ChartLayout,
};

/** Each family's `<family>.css`, in registry order, appended after the shared stylesheet. */
export const layoutStylesheet = layoutFamilies
  .map((family) => readFileSync(new URL(`./${family}/${family}.css`, import.meta.url), "utf8"))
  .join("");

export function SlideLayout({ slide, number, total, background }: {
  slide: Slide; number: number; total: number; background?: string | undefined;
}) {
  const Layout = renderers[slide.layout] as (props: { slide: Slide }) => ReactNode;
  return <SlideComponent slide={slide} number={number} total={total} background={background}><Layout slide={slide} /></SlideComponent>;
}
