import { exportToPptx } from 'dom-to-pptx';

/** Small browser-only adapter around the published dom-to-pptx API. */
export async function convert(selector: string, width: number, height: number): Promise<string> {
  const slides = Array.from(document.querySelectorAll<HTMLElement>(selector));
  if (!slides.length) throw new Error(`No slides found for selector: ${selector}`);
  const blob = await exportToPptx(slides, {
    width, height, skipDownload: true, svgAsVector: true, autoEmbedFonts: true,
  });
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Unable to read exported PowerPoint'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]!);
    reader.readAsDataURL(blob);
  });
}
