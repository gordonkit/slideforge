export interface ValidationIssue {
  rule: string;
  message: string;
  /** One-based slide number, when an issue belongs to a slide. */
  slide?: number;
  severity: 'error' | 'warning';
}

export interface LayoutValidationOptions {
  /** Overrides automatic [data-pptx="slide"], then .slide discovery. */
  selector?: string;
  width?: number;
  height?: number;
  /** Pixel tolerance for geometry and clipping checks. Defaults to 1. */
  tolerance?: number;
  /** All rules are enabled by default; overlaps and missing fonts are warnings. */
  rules?: Partial<Record<'dimensions' | 'boundaries' | 'overflow' | 'overlap' | 'images' | 'fonts', boolean>>;
}

export interface PptxValidationReport {
  /** Structural checks only; not a guarantee of Office compatibility. */
  valid: boolean;
  slideCount: number;
  /** Number of editable text shapes containing non-whitespace text. */
  editableTextCount: number;
  /** Drawable shapes, pictures, connectors, and graphic frames (excluding group containers). */
  shapeCount: number;
  issues: ValidationIssue[];
}
