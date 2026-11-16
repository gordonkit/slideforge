import type { CSSProperties } from "react";
import type { LayoutProps } from "../types.js";
import { DisplayTextContent } from "../../components/text.js";
import { textValue } from "../../schemas/fields.js";
import { CycleRing } from "./ring.js";

// The ring is laid out in the default content box; positions are percentages, so a template's
// slightly different box stretches the drawing instead of breaking it.
const WIDTH = 1728;
const HEIGHT = 714;
const CX = WIDTH / 2;
const CY = HEIGHT / 2;
const CENTER = 260;
const GAP = 22;
const SHAFT = 7;
const HEAD = 20;
const HEAD_LENGTH = 34;
// The room an arrow wants between two cards, used to space the steps.
const ARROW_ROOM = 60;
const SAMPLES = 720;

interface Geometry { rx: number; ry: number; width: number; height: number; scale: number }

/** The ring's radii and the card size for a step count; more steps get smaller cards on a wider ring. */
const GEOMETRY: Record<number, Geometry> = {
  3: { rx: 560, ry: 250, width: 460, height: 180, scale: 1 },
  4: { rx: 600, ry: 255, width: 440, height: 170, scale: 1 },
  5: { rx: 620, ry: 262, width: 400, height: 160, scale: 0.9 },
  6: { rx: 650, ry: 275, width: 370, height: 144, scale: 0.9 },
  7: { rx: 660, ry: 280, width: 340, height: 140, scale: 0.8 },
  8: { rx: 700, ry: 292, width: 280, height: 124, scale: 0.75 },
};

type Point = [number, number];

const ringPoint = ({ rx, ry }: Geometry, angle: number): Point => [CX + rx * Math.cos(angle), CY + ry * Math.sin(angle)];

/**
 * The angle of each step, clockwise from the top. Equal angles would crowd the cards at the ring's
 * narrow ends, so the steps are spaced evenly along the ring measured in card sizes: a horizontal
 * stretch counts in card widths and a vertical one in card heights.
 */
function stepAngles(ring: Geometry, count: number): number[] {
  const across = ring.width + 2 * GAP + ARROW_ROOM;
  const down = ring.height + 2 * GAP + ARROW_ROOM;
  const angles: number[] = [];
  const lengths = [0];
  for (let sample = 0; sample <= SAMPLES * 4; sample++) {
    angles.push(-Math.PI / 2 + 2 * Math.PI * sample / (SAMPLES * 4));
    if (sample === 0) continue;
    const [ax, ay] = ringPoint(ring, angles[sample - 1]!);
    const [bx, by] = ringPoint(ring, angles[sample]!);
    lengths.push(lengths[sample - 1]! + Math.hypot((bx - ax) / across, (by - ay) / down));
  }
  const total = lengths.at(-1)!;
  return Array.from({ length: count }, (_, step) => angles[lengths.findIndex((length) => length >= total * step / count)]!);
}

/** The unit normal of the ring at `angle`, pointing outward. */
function normal({ rx, ry }: Geometry, angle: number): Point {
  const tx = -rx * Math.sin(angle);
  const ty = ry * Math.cos(angle);
  const length = Math.hypot(tx, ty);
  return [ty / length, -tx / length];
}

/**
 * The arrow from step `index` to the next one: the longest stretch of the ring between them that
 * no card covers, as one closed outline (a shaft ending in a head), or `undefined` when there is no room.
 */
function arrowPath(ring: Geometry, angles: number[], index: number): string | undefined {
  const from = angles[index]!;
  const to = index + 1 < angles.length ? angles[index + 1]! : angles[0]! + 2 * Math.PI;
  const cards = angles.map((angle) => ringPoint(ring, angle));
  const covered = ([x, y]: Point) => cards.some(([cx, cy]) => Math.abs(x - cx) < ring.width / 2 + GAP && Math.abs(y - cy) < ring.height / 2 + GAP);
  let best: number[] = [];
  let run: number[] = [];
  for (let sample = 0; sample <= SAMPLES; sample++) {
    const angle = from + (to - from) * sample / SAMPLES;
    if (covered(ringPoint(ring, angle))) {
      if (run.length > best.length) best = run;
      run = [];
    } else run.push(angle);
  }
  if (run.length > best.length) best = run;
  if (best.length < 2) return undefined;
  // Walk back from the tip until the head is long enough; the shaft is the rest.
  let base = best.length - 1;
  for (let length = 0; base > 0 && length < HEAD_LENGTH; base--) {
    const [ax, ay] = ringPoint(ring, best[base]!);
    const [bx, by] = ringPoint(ring, best[base - 1]!);
    length += Math.hypot(ax - bx, ay - by);
  }
  const offset = (angle: number, distance: number): Point => {
    const [x, y] = ringPoint(ring, angle);
    const [nx, ny] = normal(ring, angle);
    return [x + nx * distance, y + ny * distance];
  };
  const shaft = best.slice(0, base + 1);
  const outline: Point[] = [
    ...shaft.map((angle) => offset(angle, SHAFT)),
    offset(best[base]!, HEAD),
    ringPoint(ring, best.at(-1)!),
    offset(best[base]!, -HEAD),
    ...shaft.reverse().map((angle) => offset(angle, -SHAFT)),
  ];
  return `M ${outline.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(" L ")} Z`;
}

const percent = (value: number, total: number) => `${(value / total * 100).toFixed(3)}%`;

/** Steps around a ring, each leading to the next by an arrow, with an optional idea in the middle. */
export function CycleLayout({ slide, variant }: LayoutProps<"cycle">) {
  if (variant === "ring") return <CycleRing slide={slide} variant={variant} />;
  const count = slide.steps.length;
  const ring = GEOMETRY[count]!;
  const angles = stepAngles(ring, count);
  const style = { "--sf-cycle-card-width": `${ring.width}px`, "--sf-cycle-card-height": `${ring.height}px`, "--sf-cycle-center": `${CENTER}px`, "--sf-cycle-scale": ring.scale } as CSSProperties;
  const arrows = angles.map((_, index) => arrowPath(ring, angles, index)).filter((path) => path !== undefined);
  return <div className="sf-cycle" data-count={count} style={style} role="list" aria-label={slide.steps.map((step) => textValue(step.title)).join(" → ")}>
    {/* The arrows run under the cards on purpose; each stops short of the next card. */}
    <svg className="sf-cycle-arrows" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true" data-pptx-allow-overlap="true">
      {arrows.map((path, index) => <path key={index} d={path} style={{ fill: "var(--sf-accent)" }} />)}
    </svg>
    {slide.center !== undefined && <div className="sf-cycle-center"><span><DisplayTextContent value={slide.center} size="card-title" /></span></div>}
    {slide.steps.map((step, index) => {
      const [x, y] = ringPoint(ring, angles[index]!);
      return <div className="sf-cycle-step" role="listitem" key={index} style={{ left: percent(x, WIDTH), top: percent(y, HEIGHT) }}>
        <span className="sf-cycle-heading">
          <span className="sf-cycle-number" aria-hidden="true">{index + 1}</span>
          <span className="sf-cycle-title"><DisplayTextContent value={step.title} size="card-title" scale={ring.scale} /></span>
        </span>
        {step.text && <span className="sf-cycle-text"><DisplayTextContent value={step.text} size="card-body" scale={ring.scale * 0.85} /></span>}
      </div>;
    })}
  </div>;
}
