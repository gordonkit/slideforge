import { SlideTable } from "../../components/content.js";
import type { LayoutProps } from "../types.js";

export function TableLayout({ slide }: LayoutProps<"table">) {
  return <SlideTable columns={slide.columns} rows={slide.rows} />;
}
