/** Color math for the gradient fills and the text color on a colored panel. Colors are six-digit hex. */
const channels = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (values: readonly number[]) => `#${values.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** `from` moved `percent` of the way toward `to`. */
export function mixColors(from: string, to: string, percent: number): string {
  const a = channels(from);
  const b = channels(to);
  return toHex(a.map((value, i) => value + (b[i]! - value) * percent / 100));
}

/** Relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** White or near-black, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.4 ? "#111827" : "#ffffff";
}

/** A solid color, or a top-to-bottom gradient from it toward `target` by `percent`; 0 is solid. */
export function gradientFill(base: string, target: string, percent: number): string {
  return percent > 0 ? `linear-gradient(180deg, ${base}, ${mixColors(base, target, percent)})` : base;
}
