/** Color math for the gradient fills and the text color on a colored panel. Colors are six-digit hex. */
const channels = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
const toHex = (values: readonly number[]) => `#${values.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

/** The red, green, and blue channels as `"r g b"`, for `rgb(var(--x-rgb) / alpha)` in CSS. */
export function rgbChannels(hex: string): string {
  return channels(hex).join(" ");
}

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

/** A top-to-bottom color/opacity gradient, or a solid fill when both endpoints match. */
export function gradientFill(base: string, target: string, percent: number, fromOpacity = 1, toOpacity = fromOpacity): string {
  const color = (hex: string, opacity: number) => opacity === 1 ? hex : `rgb(${rgbChannels(hex)} / ${opacity})`;
  const from = color(base, fromOpacity);
  const to = color(percent > 0 ? mixColors(base, target, percent) : base, toOpacity);
  return percent > 0 || fromOpacity !== toOpacity ? `linear-gradient(180deg, ${from}, ${to})` : from;
}
