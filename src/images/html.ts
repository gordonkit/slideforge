import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dataUrl, IMAGE_EXTENSIONS, type RemoteImageFetcher } from './remote.js';

/** An `<img>` in rendered HTML: its source (unescaped) and the 1-based slide it is on. */
export interface ImageReference {
  src: string;
  slide: number | undefined;
}

const imageTag = /<img\b[^>]*>/g;
const sourceAttribute = /\ssrc="([^"]*)"/;

function unescapeAttribute(value: string): string {
  return value.replace(/&(?:amp|lt|gt|quot|#x27|#39|#(\d+)|#x([0-9a-f]+));/gi, (entity, decimal?: string, hex?: string) =>
    decimal ? String.fromCodePoint(Number(decimal)) : hex ? String.fromCodePoint(Number.parseInt(hex, 16))
      : ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" })[entity.toLowerCase()]!);
}

function escapeAttribute(value: string): string {
  return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[char]!);
}

/** Every `<img>` in document order, with the slide (`data-pptx="slide"`) it follows. */
export function imageReferences(html: string): ImageReference[] {
  const references: ImageReference[] = [];
  for (const match of html.matchAll(imageTag)) {
    const src = sourceAttribute.exec(match[0])?.[1];
    if (src === undefined) continue;
    const slides = html.slice(0, match.index).split('data-pptx="slide"').length - 1;
    references.push({ src: unescapeAttribute(src), slide: slides || undefined });
  }
  return references;
}

/** Replace `<img>` sources; `replace` returns the new source, or undefined to keep it. */
export function replaceImageSources(html: string, replace: (src: string) => string | undefined): string {
  return html.replace(imageTag, tag => tag.replace(sourceAttribute, (attribute, src: string) => {
    const replacement = replace(unescapeAttribute(src));
    return replacement === undefined ? attribute : ` src="${escapeAttribute(replacement)}"`;
  }));
}

/** Whether a source is an absolute HTTP(S) URL. */
export function isRemoteSource(src: string): boolean {
  return /^https?:\/\//i.test(src);
}

/** "Slide 3: " for messages, or nothing when the image is outside slides. */
export function slidePrefix(slide: number | undefined): string {
  return slide === undefined ? '' : `Slide ${slide}: `;
}

/**
 * Inline every `<img>` as a data URL: remote images through the fetcher, local `file:` images from
 * disk. Relative sources resolve against `baseUrl`. Data URLs are kept. Errors name the slide.
 */
export async function embedImages(html: string, fetcher: RemoteImageFetcher, baseUrl: string | undefined): Promise<string> {
  const resolved = new Map<string, string>();
  for (const { src, slide } of imageReferences(html)) {
    if (resolved.has(src) || src.startsWith('data:')) continue;
    let url: URL;
    try {
      url = new URL(src, baseUrl);
    } catch {
      throw new Error(`${slidePrefix(slide)}Cannot resolve image ${src}; relative images need a base URL`);
    }
    try {
      if (url.protocol === 'file:') {
        const path = fileURLToPath(url);
        const type = IMAGE_EXTENSIONS.get(extname(path).toLowerCase());
        if (!type) throw new Error(`Unsupported image format: ${path}. Use SVG, PNG, JPEG, GIF, WebP, or AVIF.`);
        try {
          resolved.set(src, dataUrl(type, await readFile(path)));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new Error(`Image not found: ${path}`);
          throw error;
        }
      } else {
        const image = await fetcher.fetch(url.href);
        resolved.set(src, dataUrl(image.type, image.data));
      }
    } catch (error) {
      throw new Error(`${slidePrefix(slide)}${error instanceof Error ? error.message : String(error)}`, { cause: error });
    }
  }
  return replaceImageSources(html, src => resolved.get(src));
}
