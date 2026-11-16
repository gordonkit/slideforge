import type { CSSProperties } from "react";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";
import { textValue } from "../../schemas/fields.js";

// Laid out in the default content box, like the default variant; positions are percentages.
const WIDTH = 1728;
const HEIGHT = 714;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const OUTER = 292;
const INNER = 150;
const MIDDLE = (OUTER + INNER) / 2;
/** The width of the gap between two segments, and how far each segment's tip reaches into the next one's notch. */
const GAP = 8;
const TIP = 7 * Math.PI / 180;
/** Labels sit this far outside the ring; a side label is this wide and tall, one above or below the ring one line tall. */
const LABEL_GAP = 20;
const LABEL_WIDTH = 440;
const LABEL_HEIGHT = 72;
const LABEL_LINE = 40;

type Point = [number, number];

const polar = (radius: number, angle: number): Point => [CX + radius * Math.cos(angle), CY + radius * Math.sin(angle)];
const xy = ([x, y]: Point) => `${x.toFixed(1)} ${y.toFixed(1)}`;
const percent = (value: number, total: number) => `${(value / total * 100).toFixed(3)}%`;

/** Where the line through `a` and `b` meets the circle of `radius`, nearest to `a`. */
function onCircle([ax, ay]: Point, [bx, by]: Point, radius: number): Point {
  const [px, py, dx, dy] = [ax - CX, ay - CY, bx - ax, by - ay];
  const a = dx * dx + dy * dy;
  const b = 2 * (px * dx + py * dy);
  const c = px * px + py * py - radius * radius;
  const root = Math.sqrt(Math.max(b * b - 4 * a * c, 0));
  const t = [(-b - root) / (2 * a), (-b + root) / (2 * a)].reduce((best, value) => Math.abs(value) < Math.abs(best) ? value : best);
  return [ax + dx * t, ay + dy * t];
}

/** Where the lines through `a`–`b` and `c`–`d` cross. */
function crossing([ax, ay]: Point, [bx, by]: Point, [cx, cy]: Point, [dx, dy]: Point): Point {
  const denominator = (ax - bx) * (cy - dy) - (ay - by) * (cx - dx);
  const u = ((ax - cx) * (cy - dy) - (ay - cy) * (cx - dx)) / denominator;
  return [ax + u * (bx - ax), ay + u * (by - ay)];
}

/**
 * The boundary at `angle` (outer edge, triangular tip, inner edge) moved `distance` clockwise, at right
 * angles to each of its two edges, so the gap between neighbors is the same width all along.
 */
function boundary(angle: number, distance: number): { outer: Point; tip: Point; inner: Point } {
  const outer = polar(OUTER, angle);
  const tip = polar(MIDDLE, angle + TIP);
  const inner = polar(INNER, angle);
  const shift = (a: Point, b: Point): [Point, Point] => {
    const [dx, dy] = [b[0] - a[0], b[1] - a[1]];
    const length = Math.hypot(dx, dy);
    let [nx, ny] = [-dy / length, dx / length];
    // Clockwise is the direction of increasing angle.
    if (nx * -Math.sin(angle) + ny * Math.cos(angle) < 0) [nx, ny] = [-nx, -ny];
    return [[a[0] + nx * distance, a[1] + ny * distance], [b[0] + nx * distance, b[1] + ny * distance]];
  };
  const [o1, o2] = shift(outer, tip);
  const [i1, i2] = shift(tip, inner);
  return { outer: onCircle(o1, o2, OUTER), tip: crossing(o1, o2, i1, i2), inner: onCircle(i2, i1, INNER) };
}

/**
 * One segment of the ring, clockwise from `from` to `to`: its clockwise end is a triangle pointing at the
 * next segment, and its start a notch of the same shape, so neighbors nest with an even gap.
 */
function segmentPath(from: number, to: number): string {
  const start = boundary(from, GAP / 2);
  const end = boundary(to, -GAP / 2);
  const large = to - from > Math.PI ? 1 : 0;
  return [
    `M ${xy(start.outer)}`,
    `A ${OUTER} ${OUTER} 0 ${large} 1 ${xy(end.outer)}`,
    `L ${xy(end.tip)}`,
    `L ${xy(end.inner)}`,
    `A ${INNER} ${INNER} 0 ${large} 0 ${xy(start.inner)}`,
    `L ${xy(start.tip)}`,
    "Z",
  ].join(" ");
}

/** Where a step's description goes: beside the ring on the left and right, above or below it near the top and bottom. */
function labelBox(angle: number): CSSProperties & { "data-side": string } {
  const clear = OUTER + LABEL_GAP;
  const [x, y] = polar(clear, angle);
  const cos = Math.cos(angle);
  const side = cos > 0.35 ? "right" : cos < -0.35 ? "left" : Math.sin(angle) < 0 ? "top" : "bottom";
  if (side === "top" || side === "bottom") {
    // Wholly above or below the ring, so the box never cuts into it.
    const top = side === "top" ? CY - clear - LABEL_LINE : CY + clear;
    return { left: percent(x - LABEL_WIDTH / 2, WIDTH), top: percent(top, HEIGHT), "data-side": side };
  }
  // Start the box where the ring ends at the box's height, so its inner edge clears the ring.
  const top = y - LABEL_HEIGHT / 2;
  const nearest = top > CY ? top - CY : top + LABEL_HEIGHT < CY ? CY - top - LABEL_HEIGHT : 0;
  const reach = Math.sqrt(Math.max(clear * clear - nearest * nearest, 0));
  const left = side === "right" ? CX + reach : CX - reach - LABEL_WIDTH;
  return { left: percent(left, WIDTH), top: percent(top, HEIGHT), "data-side": side };
}

/** ring: the steps as segments of one ring, each nesting into the next with a triangular tip. */
export function CycleRing({ slide }: LayoutProps<"cycle">) {
  const count = slide.steps.length;
  const span = 2 * Math.PI / count;
  // Step 1 is centered at the top; each segment spans its step's share of the ring.
  const angle = (index: number) => -Math.PI / 2 + index * span;
  const style = { "--sf-ring-label-width": `${LABEL_WIDTH}px`, "--sf-ring-label-height": `${LABEL_HEIGHT}px`, "--sf-ring-label-line": `${LABEL_LINE}px`, "--sf-ring-inner": `${INNER * 2}px` } as CSSProperties;
  return <div className="sf-cycle sf-cycle-ring" data-count={count} style={style} role="list" aria-label={slide.steps.map((step) => textValue(step.title)).join(" → ")}>
    {/* The segments sit under the step titles on purpose. */}
    <svg className="sf-cycle-arrows" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" data-pptx-allow-overlap="true">
      {slide.steps.map((_, index) => <path key={index} d={segmentPath(angle(index) - span / 2, angle(index) + span / 2)} style={{ fill: "var(--sf-accent)", fillOpacity: index % 2 ? 0.82 : 1 }} />)}
    </svg>
    {slide.center !== undefined && <div className="sf-cycle-ring-center"><span><DisplayTextContent value={slide.center} size="card-title" /></span></div>}
    {slide.steps.map((step, index) => {
      const [x, y] = polar(MIDDLE, angle(index) + TIP / 2);
      const { "data-side": side, ...box } = labelBox(angle(index));
      return <div className="sf-cycle-ring-step" role="listitem" key={index}>
        <span className="sf-cycle-ring-title" style={{ left: percent(x, WIDTH), top: percent(y, HEIGHT) }}>
          <span className="sf-cycle-ring-number" aria-hidden="true">{index + 1}</span>
          <DisplayTextContent value={step.title} size="card-body" />
        </span>
        {step.text && <span className="sf-cycle-ring-label" data-side={side} style={box}><DisplayTextContent value={step.text} size="card-body" scale={0.85} /></span>}
      </div>;
    })}
  </div>;
}
