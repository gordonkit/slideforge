import type { ContentBlock } from "../schemas/presentation.js";

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  return <div className="sf-blocks">{blocks.map((block, index) => {
    switch (block.type) {
      case "paragraph":
        return <p key={index}>{block.text}</p>;
      case "bullets": {
        const List = block.ordered ? "ol" : "ul";
        return <List key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</List>;
      }
      case "image":
        return <SlideImage key={index} src={block.src} alt={block.alt} caption={block.caption} />;
    }
  })}</div>;
}

export function SlideImage({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return <figure><img src={src} alt={alt} />{caption && <figcaption>{caption}</figcaption>}</figure>;
}

export function SlideTable({ columns, rows }: { columns: string[]; rows: string[][] }) {
  return <table className="sf-table">
    <thead><tr>{columns.map((column, index) => <th key={index} scope="col">{column}</th>)}</tr></thead>
    <tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody>
  </table>;
}

const DONUT_OUTER = 98;
const DONUT_INNER = 62;
const DONUT_GAP = 0.012;

/** The path of a ring segment from `from` to `to` radians (0 is straight up, clockwise), as one closed outline. */
function ringSegment(from: number, to: number): string {
  const point = (radius: number, angle: number) => `${(100 + radius * Math.sin(angle)).toFixed(2)} ${(100 - radius * Math.cos(angle)).toFixed(2)}`;
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${point(DONUT_OUTER, from)} A ${DONUT_OUTER} ${DONUT_OUTER} 0 ${large} 1 ${point(DONUT_OUTER, to)} L ${point(DONUT_INNER, to)} A ${DONUT_INNER} ${DONUT_INNER} 0 ${large} 0 ${point(DONUT_INNER, from)} Z`;
}

/** The ring segments of the data, each as one or two paths (a full circle needs two halves). */
function donutSegments(data: { value: number }[]): { path: string; index: number }[] {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  let start = 0;
  return data.flatMap((item, index) => {
    const span = item.value / total * 2 * Math.PI;
    const from = start + (data.length > 1 ? DONUT_GAP / 2 : 0);
    const to = start + span - (data.length > 1 ? DONUT_GAP / 2 : 0);
    start += span;
    if (span <= 0 || to <= from) return [];
    if (span > 2 * Math.PI - 0.01) return [{ path: ringSegment(from, from + Math.PI), index }, { path: ringSegment(from + Math.PI, from + 2 * Math.PI - 0.001), index }];
    return [{ path: ringSegment(from, to), index }];
  });
}

/** Each slice is the accent color, fainter for later slices; the legend swatches match. */
const sliceOpacity = (index: number, count: number) => count <= 1 ? 1 : 1 - index * (0.75 / (count - 1));

function DonutChart({ data, unit }: { data: { label: string; value: number }[]; unit: string }) {
  const total = data.reduce((sum, item) => sum + item.value, 0) || 1;
  return <div className="sf-chart sf-chart-donut" role="img" aria-label={`Donut chart: ${data.map((item) => `${item.label}: ${item.value}${unit}`).join(", ")}`}>
    <svg className="sf-donut" viewBox="0 0 200 200" aria-hidden="true">{donutSegments(data).map((segment, key) =>
      <path key={key} d={segment.path} style={{ fill: "var(--sf-accent)", fillOpacity: sliceOpacity(segment.index, data.length) }} />)}</svg>
    <ul className="sf-donut-legend">{data.map((item, index) => <li key={index}>
      <span className="sf-donut-swatch" style={{ opacity: sliceOpacity(index, data.length) }} aria-hidden="true" />
      <span className="sf-donut-label">{item.label}</span>
      <span className="sf-donut-value">{Math.round(item.value / total * 100)}%</span>
    </li>)}</ul>
  </div>;
}

export function SlideChart({ data, unit = "", variant = "default" }: { data: { label: string; value: number }[]; unit?: string; variant?: string }) {
  const maximum = Math.max(...data.map((item) => item.value), 1);
  if (variant === "donut") return <DonutChart data={data} unit={unit} />;
  if (variant === "columns") {
    return <div className="sf-chart sf-chart-columns" role="img" aria-label={`Column chart: ${data.map((item) => `${item.label}: ${item.value}${unit}`).join(", ")}`}>
      {data.map((item, index) => <div className="sf-column" key={index}>
        <div className="sf-column-value">{item.value}{unit}</div>
        <div className="sf-column-track"><div className="sf-column-bar" style={{ height: `${item.value / maximum * 100}%` }} /></div>
        <div className="sf-column-label">{item.label}</div>
      </div>)}
    </div>;
  }
  return <div className="sf-chart" role="img" aria-label={`Bar chart: ${data.map((item) => `${item.label}: ${item.value}${unit}`).join(", ")}`}>
    {data.map((item, index) => <div className="sf-chart-row" key={index}>
      <div className="sf-chart-label">{item.label}</div>
      <div className="sf-chart-track"><div className="sf-chart-bar" style={{ width: `${item.value / maximum * 100}%` }} /></div>
      <div className="sf-chart-value">{item.value}{unit}</div>
    </div>)}
  </div>;
}

export const DataTable = SlideTable;
export const BarChart = SlideChart;
