import { createContext, useContext } from "react";
import { type DisplayText, textValue } from "../schemas/fields.js";
import { designTokens, type DesignTokens } from "../themes/tokens.js";

export const TextTokens = createContext<DesignTokens>(designTokens);

export function DisplayTextContent({ value, size = "body", scale = 1 }: {
  value: DisplayText | undefined;
  size?: keyof DesignTokens["type"] | number;
  scale?: number;
}) {
  const tokens = useContext(TextTokens);
  if (typeof value !== "object" || value.fontSize === undefined) return textValue(value);
  const base = typeof size === "number" ? size : tokens.type[size];
  const fontSize = typeof value.fontSize === "number" ? value.fontSize : Number(base) * scale + value.fontSize.delta;
  if (!Number.isFinite(fontSize) || fontSize < 8 || fontSize > 240) {
    throw new Error(`Resolved fontSize for "${value.text}" must be between 8 and 240px (got ${fontSize})`);
  }
  return <span style={{ fontSize }}>{value.text}</span>;
}