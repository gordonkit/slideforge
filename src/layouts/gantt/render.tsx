import type { CSSProperties } from "react";
import type { LayoutProps } from "../types.js";

export function GanttLayout({ slide }: LayoutProps<"gantt">) {
  // The period count sizes every row's grid, the way a chart bar's width is set from its value.
  const style = { "--sf-gantt-periods": slide.periods.length } as CSSProperties;
  return <div className="sf-gantt" style={style}>
    <div className="sf-gantt-row sf-gantt-header" aria-hidden="true">
      <span />
      <div className="sf-gantt-periods">{slide.periods.map((period, index) => <span key={index}>{period}</span>)}</div>
    </div>
    {slide.tasks.map((task, index) => {
      const span = task.start === task.end ? slide.periods[task.start - 1] : `${slide.periods[task.start - 1]}–${slide.periods[task.end - 1]}`;
      const progress = task.progress === undefined ? "" : `, ${task.progress}%`;
      return <div className="sf-gantt-row" key={index}>
        <p className="sf-gantt-label">{task.label}{task.progress !== undefined && <span className="sf-gantt-percent">{task.progress}%</span>}</p>
        {/* The bar is drawn over its track on purpose. */}
        <div className="sf-gantt-track" role="img" aria-label={`${task.label}: ${span}${progress}`} data-pptx-allow-overlap="true">
          <span className="sf-gantt-bar" style={{ gridColumn: `${task.start} / ${task.end + 1}` }}>
            {task.progress !== undefined && <span className="sf-gantt-progress" style={{ width: `${task.progress}%` }} />}
          </span>
        </div>
      </div>;
    })}
  </div>;
}
