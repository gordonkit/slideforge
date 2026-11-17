import type { CSSProperties } from "react";
import type { ColorScheme } from "../schemas/fields.js";
import { luminance, rgbChannels } from "./color.js";

export function resolveColorScheme(scheme: ColorScheme | undefined, schemes?: Readonly<Record<string, readonly string[]>>): readonly string[] | undefined {
  if (scheme === undefined || Array.isArray(scheme)) return scheme;
  if (schemes === undefined || !Object.hasOwn(schemes, scheme)) {
    throw new Error(`Unknown color scheme "${scheme}": define it in presentation.colorSchemes or template.colorSchemes, or supply an array of hex colors`);
  }
  return schemes[scheme];
}

export function itemColor(colors: readonly string[] | undefined, index: number, override?: string): string | undefined {
  return override ?? colors?.[index % colors.length];
}

/** Keep at least 4.5:1 contrast on an opaque fill, preferring the existing near-black over pure black. */
export function itemTextColor(color: string): string {
  const lightness = luminance(color);
  if ((lightness + 0.05) / (luminance("#111827") + 0.05) >= 4.5) return "#111827";
  return 1.05 / (lightness + 0.05) >= 4.5 ? "#ffffff" : "#000000";
}

export function itemColorStyle(color: string | undefined): CSSProperties | undefined {
  if (color === undefined) return undefined;
  const text = itemTextColor(color);
  return {
    "--sf-accent": color,
    "--sf-accent-rgb": rgbChannels(color),
    "--sf-on-accent": text,
    "--sf-card-fill": color,
    "--sf-surface-rgb": rgbChannels(color),
    "--sf-foreground": text,
    "--sf-muted": text,
    color: text,
  } as CSSProperties;
}
