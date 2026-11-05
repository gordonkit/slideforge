import { readFileSync } from "node:fs";
import type { ReactNode } from "react";
import type { Slide } from "../schemas/presentation.js";
import { Slide as SlideComponent } from "../components/slide.js";
import { AgendaLayout } from "./agenda/render.js";
import { ClosingLayout } from "./closing/render.js";
import { CodeLayout } from "./code/render.js";
import { CompareLayout } from "./compare/render.js";
import { HubLayout } from "./hub/render.js";
import { MatrixLayout } from "./matrix/render.js";
import { MediaLayout } from "./media/render.js";
import { ProcessLayout } from "./process/render.js";
import { StatsLayout } from "./stats/render.js";
import { TeamLayout } from "./team/render.js";
import { BlankLayout } from "./blank/render.js";
import { CardsLayout } from "./cards/render.js";
import { ChartLayout } from "./chart/render.js";
import { ContentLayout } from "./content/render.js";
import { CoverLayout } from "./cover/render.js";
import { GanttLayout } from "./gantt/render.js";
import { PanelsLayout } from "./panels/render.js";
import { QuoteLayout } from "./quote/render.js";
import { SectionLayout } from "./section/render.js";
import { layoutFamilies, layoutFamily, slideVariant, type LayoutFamily } from "./registry.js";
import { TableLayout } from "./table/render.js";
import { TimelineLayout } from "./timeline/render.js";
import { TwoColumnsLayout } from "./two-columns/render.js";
import type { LayoutProps } from "./types.js";

// One renderer per registered family; the mapped type makes a missing family a compile error.
const renderers: { [F in LayoutFamily]: (props: LayoutProps<F>) => ReactNode } = {
  cover: CoverLayout,
  agenda: AgendaLayout,
  section: SectionLayout,
  content: ContentLayout,
  "two-columns": TwoColumnsLayout,
  cards: CardsLayout,
  panels: PanelsLayout,
  closing: ClosingLayout,
  code: CodeLayout,
  compare: CompareLayout,
  hub: HubLayout,
  matrix: MatrixLayout,
  media: MediaLayout,
  process: ProcessLayout,
  stats: StatsLayout,
  team: TeamLayout,
  timeline: TimelineLayout,
  gantt: GanttLayout,
  table: TableLayout,
  chart: ChartLayout,
  quote: QuoteLayout,
  blank: BlankLayout,
};

/** Each family's `<family>.css`, in registry order, appended after the shared stylesheet. */
export const layoutStylesheet = layoutFamilies
  .map((family) => readFileSync(new URL(`./${family}/${family}.css`, import.meta.url), "utf8"))
  .join("");

export function SlideLayout({ slide, variant = slideVariant(slide), number, total, background, sectionNumber, panelGradient }: {
  slide: Slide; variant?: string; number: number; total: number; background?: string | undefined; sectionNumber?: number | undefined; panelGradient?: number | undefined;
}) {
  const Layout = renderers[layoutFamily(slide.layout)] as (props: { slide: Slide; variant: string; sectionNumber?: number | undefined; panelGradient?: number | undefined }) => ReactNode;
  return <SlideComponent slide={slide} variant={variant} number={number} total={total} background={background}>
    <Layout slide={slide} variant={variant} sectionNumber={sectionNumber} panelGradient={panelGradient} />
  </SlideComponent>;
}
