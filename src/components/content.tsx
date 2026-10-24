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

export function SlideChart({ data, unit = "" }: { data: { label: string; value: number }[]; unit?: string }) {
  const maximum = Math.max(...data.map((item) => item.value), 1);
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
