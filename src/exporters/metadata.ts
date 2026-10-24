import { strToU8, unzipSync, zipSync } from 'fflate';

export interface PresentationMetadata {
  title?: string;
  author?: string;
  subject?: string;
  lang?: string;
}

function xml(value: string): string {
  return value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\ufffe\uffff]/g, '').replace(/[<>&"']/g, char => ({
    '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;',
  })[char]!);
}

/** The converter has no metadata setter; retain its package and replace only core properties. */
export function applyMetadata(data: Uint8Array, metadata: PresentationMetadata): Uint8Array {
  const files = unzipSync(data);
  files['docProps/core.xml'] = strToU8(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
<dc:title>${xml(metadata.title ?? '')}</dc:title>
<dc:creator>${xml(metadata.author ?? '')}</dc:creator>
<dc:subject>${xml(metadata.subject ?? '')}</dc:subject>
<dc:language>${xml(metadata.lang ?? '')}</dc:language>
</cp:coreProperties>`);
  return zipSync(files);
}
