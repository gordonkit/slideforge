import type { LayoutProps } from "../types.js";

/** A chapter divider: the chapter's number, counted over the section slides in order, and a rail for the default variant. */
export function SectionLayout({ variant, sectionNumber }: LayoutProps<"section">) {
  return <>
    {variant === "default" && <div className="sf-section-rail" aria-hidden="true" />}
    {sectionNumber !== undefined && <p className="sf-section-number">{String(sectionNumber).padStart(2, "0")}</p>}
  </>;
}
