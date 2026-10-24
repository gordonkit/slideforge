import type { Page } from 'playwright';
import type { LayoutValidationOptions, ValidationIssue } from './types.js';
export type { LayoutValidationOptions, ValidationIssue } from './types.js';

export async function validateLayout(
  page: Page,
  options: LayoutValidationOptions = {},
): Promise<ValidationIssue[]> {
  const width = options.width ?? 1280;
  const height = options.height ?? 720;
  const tolerance = options.tolerance ?? 1;
  if (![width, height].every(value => Number.isFinite(value) && value > 0)
      || !Number.isFinite(tolerance) || tolerance < 0) {
    return [{ rule: 'layout.options', severity: 'error', message: 'Dimensions must be positive and tolerance must be non-negative finite numbers.' }];
  }
  return page.evaluate(async ({ selector, width, height, tolerance, rules }) => {
    await document.fonts.ready;
    const issues: ValidationIssue[] = [];
    const enabled = (rule: keyof NonNullable<LayoutValidationOptions['rules']>) => rules?.[rule] !== false;
    let slides: Element[];
    try {
      slides = Array.from(document.querySelectorAll(selector ?? '[data-pptx="slide"]'));
      if (!selector && slides.length === 0) slides = Array.from(document.querySelectorAll('.slide'));
    } catch {
      return [{ rule: 'layout.selector', severity: 'error' as const, message: 'Invalid slide selector.' }];
    }
    if (slides.length === 0) {
      return [{ rule: 'layout.slides', severity: 'error' as const, message: 'No slide elements found.' }];
    }
    const genericFonts = new Set(['serif', 'sans-serif', 'monospace', 'cursive', 'fantasy', 'system-ui', 'ui-serif', 'ui-sans-serif', 'ui-monospace', 'ui-rounded', 'emoji', 'math', 'fangsong']);
    const fontAvailability = new Map<string, boolean>();
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontAvailable = (family: string) => {
      const cached = fontAvailability.get(family);
      if (cached !== undefined) return cached;
      const quoted = JSON.stringify(family);
      let available = document.fonts.check(`16px ${quoted}`);
      // FontFaceSet.check can return true for an unknown family that falls back.
      if (available && context) {
        const probe = 'mmmmmmmmmmWWWWiiii0123456789';
        available = ['monospace', 'serif', 'sans-serif'].some(fallback => {
          context.font = `72px ${fallback}`;
          const baseline = context.measureText(probe).width;
          context.font = `72px ${quoted}, ${fallback}`;
          return Math.abs(context.measureText(probe).width - baseline) > 0.01;
        });
      }
      fontAvailability.set(family, available);
      return available;
    };
    slides.forEach((root, index) => {
      const slide = index + 1;
      const add = (rule: string, message: string, severity: 'error' | 'warning' = 'error') =>
        issues.push({ rule: `layout.${rule}`, message, slide, severity });
      const bounds = root.getBoundingClientRect();
      const label = (element: Element) => element.id ? `#${element.id}` : element.tagName.toLowerCase();
      if (enabled('dimensions') && (Math.abs(bounds.width - width) > tolerance || Math.abs(bounds.height - height) > tolerance)) {
        add('dimensions', `Slide is ${bounds.width}×${bounds.height}; expected ${width}×${height}.`);
      }
      const visible = (element: Element) => {
        const style = getComputedStyle(element);
        for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
          if (getComputedStyle(ancestor).opacity === '0') return false;
          if (ancestor === root) break;
        }
        return style.display !== 'none' && style.visibility !== 'hidden' && style.visibility !== 'collapse'
          && element.getClientRects().length > 0;
      };
      const elements = [root, ...Array.from(root.querySelectorAll('*'))].filter(element =>
        element.closest(selector ?? (root.matches('[data-pptx="slide"]') ? '[data-pptx="slide"]' : '.slide')) === root
        && !element.closest('[hidden]') && visible(element));
      const fonts = new Set<string>();
      const overlapCandidates: Element[] = [];
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (enabled('images') && element instanceof HTMLImageElement
            && (!element.complete || element.naturalWidth === 0)) {
          add('images', `${label(element)} has a missing or undecodable image: ${element.getAttribute('src') ?? '(no src)'}.`);
        }
        if (rect.width === 0 || rect.height === 0) continue;
        if (enabled('boundaries') && element !== root
            && (rect.left < bounds.left - tolerance || rect.top < bounds.top - tolerance
              || rect.right > bounds.right + tolerance || rect.bottom > bounds.bottom + tolerance)) {
          add('boundaries', `${label(element)} extends outside the slide.`);
        }
        const hasText = Array.from(element.childNodes).some(node => node.nodeType === Node.TEXT_NODE && !!node.textContent?.trim());
        if (enabled('overflow')) {
          const html = element instanceof HTMLElement ? element : undefined;
          const clipsX = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowX);
          const clipsY = ['hidden', 'clip', 'auto', 'scroll'].includes(style.overflowY);
          let clipped = !!html && ((clipsX && html.scrollWidth > html.clientWidth + tolerance)
            || (clipsY && html.scrollHeight > html.clientHeight + tolerance));
          if (hasText) {
            // Text rects span the font's ascent and descent. Fonts such as Segoe UI exceed a tight
            // line-height, and the excess is shared leading, not clipped text, so compare line boxes.
            const lineHeight = parseFloat(style.lineHeight);
            for (const node of Array.from(element.childNodes)) {
              if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
              const range = document.createRange();
              range.selectNodeContents(node);
              for (const textRect of Array.from(range.getClientRects())) {
                const leading = Number.isFinite(lineHeight) ? Math.max(0, (textRect.height - lineHeight) / 2) : 0;
                const top = textRect.top + leading;
                const bottom = textRect.bottom - leading;
                if (textRect.left < rect.left - tolerance || textRect.right > rect.right + tolerance
                    || top < rect.top - tolerance || bottom > rect.bottom + tolerance) clipped = true;
                if (textRect.left < bounds.left - tolerance || textRect.right > bounds.right + tolerance
                    || top < bounds.top - tolerance || bottom > bounds.bottom + tolerance) clipped = true;
                for (let ancestor: Element | null = element; ancestor; ancestor = ancestor.parentElement) {
                  const ancestorStyle = getComputedStyle(ancestor);
                  const ancestorRect = ancestor.getBoundingClientRect();
                  if ((['hidden', 'clip', 'auto', 'scroll'].includes(ancestorStyle.overflowX)
                      && (textRect.left < ancestorRect.left - tolerance || textRect.right > ancestorRect.right + tolerance))
                    || (['hidden', 'clip', 'auto', 'scroll'].includes(ancestorStyle.overflowY)
                      && (top < ancestorRect.top - tolerance || bottom > ancestorRect.bottom + tolerance))) clipped = true;
                  if (ancestor === root) break;
                }
              }
            }
          }
          if (clipped) add('overflow', `${label(element)} contains overflowing or clipped content.`);
        }
        if (enabled('fonts') && hasText) {
          const first = style.fontFamily.match(/(?:[^,"']+|"[^"]*"|'[^']*')+/)?.[0]?.trim().replace(/^(['"])(.*)\1$/, '$2');
          if (first && !genericFonts.has(first.toLowerCase())) fonts.add(first);
        }
        // Layout wrappers and painted parent containers are not collision candidates.
        if (element !== root && !element.closest('[data-pptx-allow-overlap="true"]')
            && (hasText || /^(IMG|SVG|CANVAS|VIDEO)$/.test(element.tagName)
              || (element.children.length === 0 && (style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none')))) {
          overlapCandidates.push(element);
        }
      }
      if (enabled('fonts')) for (const family of fonts) {
        if (!fontAvailable(family)) add('fonts', `Font "${family}" is unavailable; text uses a fallback.`, 'warning');
      }
      if (enabled('overlap')) {
        for (let i = 0; i < overlapCandidates.length; i++) {
          const a = overlapCandidates[i]!;
          const ar = a.getBoundingClientRect();
          for (let j = i + 1; j < overlapCandidates.length; j++) {
            const b = overlapCandidates[j]!;
            if (a.contains(b) || b.contains(a)) continue;
            const br = b.getBoundingClientRect();
            if (Math.min(ar.right, br.right) - Math.max(ar.left, br.left) > tolerance
                && Math.min(ar.bottom, br.bottom) - Math.max(ar.top, br.top) > tolerance) {
              add('overlap', `${label(a)} overlaps ${label(b)}.`, 'warning');
            }
          }
        }
      }
    });
    return issues;
  }, { selector: options.selector, width, height, tolerance, rules: options.rules });
}
