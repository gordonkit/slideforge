import type { Slide } from "../schemas/presentation.js";
import { ContentBlocks, SlideChart, SlideTable } from "../components/content.js";
import { Slide as SlideComponent, SlideCard, SlideColumns } from "../components/slide.js";

export function SlideLayout({ slide, number, total }: { slide: Slide; number: number; total: number }) {
  let content;
  switch (slide.layout) {
    case "cover":
      content = slide.author ? <p className="sf-author">{slide.author}</p> : null;
      break;
    case "content":
      content = <ContentBlocks blocks={slide.blocks} />;
      break;
    case "two-columns":
      content = <SlideColumns><ContentBlocks blocks={slide.left} /><ContentBlocks blocks={slide.right} /></SlideColumns>;
      break;
    case "cards":
      content = <div className="sf-cards">{slide.cards.map((card, index) => <SlideCard title={card.title} key={index}><ContentBlocks blocks={card.blocks} /></SlideCard>)}</div>;
      break;
    case "table":
      content = <SlideTable columns={slide.columns} rows={slide.rows} />;
      break;
    case "chart":
      content = slide.blocks.length > 0
        ? <div className="sf-chart-layout"><SlideChart data={slide.data} unit={slide.unit} /><ContentBlocks blocks={slide.blocks} /></div>
        : <SlideChart data={slide.data} unit={slide.unit} />;
      break;
  }
  return <SlideComponent slide={slide} number={number} total={total}>{content}</SlideComponent>;
}
