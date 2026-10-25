import { createHash } from 'node:crypto';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const IMAGE_RELATIONSHIP = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/image';
const RELATIONSHIP_ID = 'rIdSlideForgeBackground';

/** Slide part paths in presentation order, resolved through the presentation relationships. */
function slidePaths(files: Record<string, Uint8Array>): string[] {
  const presentation = strFromU8(files['ppt/presentation.xml']!);
  const rels = strFromU8(files['ppt/_rels/presentation.xml.rels']!);
  const targets = new Map(Array.from(rels.matchAll(/<Relationship\b[^>]*>/g), ([tag]) =>
    [/\bId="([^"]+)"/.exec(tag)?.[1], /\bTarget="([^"]+)"/.exec(tag)?.[1]] as const));
  return Array.from(presentation.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/g), ([, id]) => {
    const target = targets.get(id!);
    if (!target) throw new Error(`Slide relationship ${id} is missing`);
    return target.startsWith('/') ? target.slice(1) : `ppt/${target}`;
  });
}

/**
 * Set each slide's PowerPoint background to its captured PNG (`undefined` keeps the converter's).
 * Identical images are stored once. The picture fills the slide and is not a selectable shape.
 */
export function applyBackgrounds(data: Uint8Array, backgrounds: ReadonlyArray<Uint8Array | undefined>): Uint8Array {
  if (!backgrounds.some(Boolean)) return data;
  const files: Record<string, Uint8Array> = unzipSync(data);
  const paths = slidePaths(files);
  if (backgrounds.length !== paths.length) {
    throw new Error(`Expected ${paths.length} slide backgrounds, got ${backgrounds.length}`);
  }
  backgrounds.forEach((image, index) => {
    if (!image) return;
    const slidePath = paths[index]!;
    const media = `slideforge-background-${createHash('sha256').update(image).digest('hex').slice(0, 16)}.png`;
    files[`ppt/media/${media}`] = image;

    const relsPath = slidePath.replace(/([^/]+)$/, '_rels/$1.rels');
    const relationship = `<Relationship Id="${RELATIONSHIP_ID}" Type="${IMAGE_RELATIONSHIP}" Target="../media/${media}"/>`;
    const rels = files[relsPath] ? strFromU8(files[relsPath])
      : '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>';
    files[relsPath] = strToU8(rels.replace('</Relationships>', `${relationship}</Relationships>`));

    let slide = strFromU8(files[slidePath]!)
      .replace(/<p:bg\b[^>]*\/>|<p:bg\b[^>]*>[\s\S]*?<\/p:bg>/, '');
    if (!/<p:sld\b[^>]*\bxmlns:r=/.test(slide)) {
      slide = slide.replace(/<p:sld\b/, '<p:sld xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"');
    }
    const background = `<p:bg><p:bgPr><a:blipFill dpi="0" rotWithShape="1"><a:blip r:embed="${RELATIONSHIP_ID}"/>`
      + '<a:srcRect/><a:stretch><a:fillRect/></a:stretch></a:blipFill><a:effectLst/></p:bgPr></p:bg>';
    files[slidePath] = strToU8(slide.replace(/(<p:cSld\b[^>]*>)/, `$1${background}`));
  });
  const types = strFromU8(files['[Content_Types].xml']!);
  if (!/<Default\b[^>]*\bExtension="png"/i.test(types)) {
    files['[Content_Types].xml'] = strToU8(types.replace(/(<Types\b[^>]*>)/, '$1<Default Extension="png" ContentType="image/png"/>'));
  }
  return zipSync(files);
}
