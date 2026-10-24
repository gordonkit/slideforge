import { unzipSync } from 'fflate';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import type { PptxValidationReport, ValidationIssue } from './types.js';
export type { PptxValidationReport, ValidationIssue } from './types.js';

type XmlNode = Record<string, unknown>;
interface Relationship { id: string; type: string; target?: string; external: boolean }
const MAX_ARCHIVE_SIZE = 64 * 1024 * 1024;
const MAX_PART_SIZE = 32 * 1024 * 1024;
const MAX_TOTAL_SIZE = 128 * 1024 * 1024;
const MAX_ENTRIES = 2000;
const RELATIONSHIP_NAMESPACE = /^https?:\/\/schemas\.(?:openxmlformats\.org\/officeDocument\/2006|microsoft\.com\/office\/2006)\/relationships$|^http:\/\/purl\.oclc\.org\/ooxml\/officeDocument\/relationships$/;
const CRC_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) value = (value & 1) ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = CRC_TABLE[(crc ^ byte) & 255]! ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

// fflate deliberately does not verify CRCs or all ZIP record boundaries.
function zipChecksums(data: Uint8Array): number[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let end = data.length - 22;
  for (; end >= Math.max(0, data.length - 65557); end--) {
    if (view.getUint32(end, true) === 0x06054b50
        && end + 22 + view.getUint16(end + 20, true) === data.length) break;
  }
  if (end < 0 || end < data.length - 65557) throw new Error('Invalid ZIP end record.');
  const count = view.getUint16(end + 10, true);
  const size = view.getUint32(end + 12, true);
  let offset = view.getUint32(end + 16, true);
  if (view.getUint16(end + 4, true) !== 0 || view.getUint16(end + 6, true) !== 0
      || view.getUint16(end + 8, true) !== count || count > MAX_ENTRIES
      || count === 0xffff || offset + size !== end) throw new Error('Unsupported or invalid ZIP directory.');
  const checksums: number[] = [];
  for (let index = 0; index < count; index++) {
    if (offset + 46 > end || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Invalid ZIP directory entry.');
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const next = offset + 46 + nameLength + view.getUint16(offset + 30, true) + view.getUint16(offset + 32, true);
    const local = view.getUint32(offset + 42, true);
    if (next > end || local + 30 > view.getUint32(end + 16, true)
        || view.getUint32(local, true) !== 0x04034b50 || (view.getUint16(offset + 8, true) & 1) !== 0
        || view.getUint16(offset + 34, true) !== 0) throw new Error('Invalid or encrypted ZIP entry.');
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    if (start + compressedSize > view.getUint32(end + 16, true)
        || view.getUint16(local + 8, true) !== view.getUint16(offset + 10, true)
        || nameLength !== view.getUint16(local + 26, true)
        || !data.subarray(offset + 46, offset + 46 + nameLength).every((byte, i) => byte === data[local + 30 + i])) {
      throw new Error('Invalid ZIP entry bounds or local header.');
    }
    checksums.push(view.getUint32(offset + 16, true));
    offset = next;
  }
  if (offset !== end) throw new Error('Invalid ZIP directory length.');
  return checksums;
}

function node(value: unknown): XmlNode | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? value as XmlNode : undefined;
}
function children(parent: unknown, name: string): unknown[] {
  const object = node(parent);
  if (!object) return [];
  const values = Object.entries(object).filter(([key]) => !key.startsWith('@_') && key.split(':').pop() === name);
  return values.flatMap(([, value]) => Array.isArray(value) ? value : [value]);
}
function attribute(parent: unknown, name: string): string | undefined {
  const value = node(parent)?.[`@_${name}`];
  return value === undefined ? undefined : String(value);
}
function walk(value: unknown, visit: (name: string, object: unknown) => void): void {
  const object = node(value);
  if (!object) return;
  for (const [key, child] of Object.entries(object)) {
    if (key.startsWith('@_') || key === '#text' || key === '?xml') continue;
    for (const item of Array.isArray(child) ? child : [child]) {
      visit(key.split(':').pop()!, item);
      walk(item, visit);
    }
  }
}
function resolveTarget(source: string, target: string): string | undefined {
  try {
    const path = decodeURIComponent(target.split(/[?#]/, 1)[0]!);
    if (!path || /[\\\u0000-\u001f]/.test(path) || /^[a-z][a-z\d+.-]*:/i.test(path) || path.startsWith('//')) return undefined;
    const parts = path.startsWith('/') ? [] : source.split('/').slice(0, -1);
    for (const segment of path.split('/')) {
      if (!segment || segment === '.') continue;
      if (segment === '..') {
        if (parts.length === 0) return undefined;
        parts.pop();
      } else parts.push(segment);
    }
    return parts.length ? parts.join('/') : undefined;
  } catch {
    return undefined;
  }
}
function relationshipSource(path: string): string | undefined {
  if (path === '_rels/.rels') return '';
  const match = /^(.*\/)?_rels\/([^/]+)\.rels$/.exec(path);
  return match ? `${match[1] ?? ''}${match[2]}` : undefined;
}

/** Bounded, offline package/XML checks, not an Office acceptance test. */
export function validatePptx(data: Uint8Array): PptxValidationReport {
  const issues: ValidationIssue[] = [];
  const report: PptxValidationReport = { valid: false, slideCount: 0, editableTextCount: 0, shapeCount: 0, issues };
  const add = (rule: string, message: string, slide?: number) =>
    issues.push({ rule: `pptx.${rule}`, message, severity: 'error', ...(slide === undefined ? {} : { slide }) });
  try {
    if (data.byteLength > MAX_ARCHIVE_SIZE) {
      add('zip.limit', 'ZIP exceeds the 64 MiB compressed size limit.');
      return report;
    }
    if (data.byteLength < 4 || data[0] !== 0x50 || data[1] !== 0x4b
        || !((data[2] === 3 && data[3] === 4) || (data[2] === 5 && data[3] === 6))) {
      add('zip', 'Input is not a ZIP package.');
      return report;
    }
    let total = 0;
    let entries = 0;
    const seen = new Set<string>();
    const checksums = zipChecksums(data);
    const integrity = new Map<string, { crc: number; size: number }>();
    const files = unzipSync(data, {
      filter: info => {
        entries++;
        total += info.originalSize;
        if (entries > MAX_ENTRIES || info.originalSize > MAX_PART_SIZE || total > MAX_TOTAL_SIZE
            || !Number.isSafeInteger(info.originalSize) || info.originalSize < 0) {
          throw new Error('ZIP exceeds the entry count or uncompressed size limits.');
        }
        if (info.compression === 0 && info.size !== info.originalSize) throw new Error('Stored ZIP entry has inconsistent sizes.');
        const path = info.name;
        if (path.startsWith('/') || /[\\\u0000-\u001f]/.test(path) || path.split('/').some(part => part === '.' || part === '..') || /^[a-z][a-z\d+.-]*:/i.test(path)) {
          throw new Error('ZIP contains an unsafe part path.');
        }
        if (seen.has(path)) throw new Error('ZIP contains duplicate part names.');
        seen.add(path);
        integrity.set(path, { crc: checksums[entries - 1]!, size: info.originalSize });
        return !path.endsWith('/');
      },
    });
    for (const [path, bytes] of Object.entries(files)) {
      const expected = integrity.get(path)!;
      if (bytes.length !== expected.size || crc32(bytes) !== expected.crc) throw new Error(`ZIP checksum or size mismatch: ${path}.`);
    }
    const required = ['[Content_Types].xml', '_rels/.rels', 'ppt/presentation.xml', 'ppt/_rels/presentation.xml.rels'];
    for (const path of required) if (!Object.hasOwn(files, path)) add('part.missing', `Required part is missing: ${path}.`);
    const parser = new XMLParser({ ignoreAttributes: false, processEntities: false, parseTagValue: false, parseAttributeValue: false });
    const documents = new Map<string, unknown>();
    const decoder = new TextDecoder('utf-8', { fatal: true });
    for (const [path, bytes] of Object.entries(files)) {
      if (!/\.(xml|rels)$/i.test(path)) continue;
      let text: string;
      try {
        text = decoder.decode(bytes);
      } catch {
        add('xml', `Part is not valid UTF-8 XML: ${path}.`);
        continue;
      }
      if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(text)) {
        add('xml.unsafe', `DOCTYPE and entity declarations are not allowed: ${path}.`);
        continue;
      }
      const result = XMLValidator.validate(text);
      if (result !== true) {
        add('xml', `Malformed XML in ${path}: ${result.err.msg}`);
        continue;
      }
      documents.set(path, parser.parse(text) as unknown);
    }
    const relationships = new Map<string, Map<string, Relationship>>();
    for (const [path, document] of documents) {
      if (!path.endsWith('.rels')) continue;
      const source = relationshipSource(path);
      const root = children(document, 'Relationships')[0];
      if (source === undefined || root === undefined) {
        add('relationships', `Invalid relationships part: ${path}.`);
        continue;
      }
      if (source && !Object.hasOwn(files, source)) add('relationships', `Relationship source is missing: ${source}.`);
      const byId = new Map<string, Relationship>();
      relationships.set(source, byId);
      for (const entry of children(root, 'Relationship')) {
        const id = attribute(entry, 'Id');
        const type = attribute(entry, 'Type');
        const target = attribute(entry, 'Target');
        const mode = attribute(entry, 'TargetMode');
        if (!id || !type || !target || (mode !== undefined && mode !== 'Internal' && mode !== 'External')) {
          add('relationships', `Relationship in ${path} requires valid Id, Type, Target, and TargetMode attributes.`);
          continue;
        }
        if (byId.has(id)) add('relationships', `Duplicate relationship ID "${id}" in ${path}.`);
        const external = mode === 'External';
        const resolved = external ? undefined : resolveTarget(source, target);
        byId.set(id, { id, type, target: resolved, external });
        if (!external && !resolved) add('relationships.target', `Unsafe or invalid target "${target}" in ${path}.`);
        else if (!external && resolved && !Object.hasOwn(files, resolved)) add('relationships.target', `Missing relationship target ${resolved} (from ${path}).`);
      }
    }
    const officeRelationship = Array.from(relationships.get('')?.values() ?? []).find(item => /\/officeDocument$/.test(item.type));
    if (!officeRelationship || officeRelationship.external || officeRelationship.target !== 'ppt/presentation.xml') {
      add('relationships.officeDocument', 'Package must reference ppt/presentation.xml as its internal officeDocument.');
    }
    // Check explicit relationship references in every XML part, including pictures and hyperlinks.
    for (const [path, document] of documents) {
      if (path.endsWith('.rels')) continue;
      const inspect = (value: unknown, inherited: Set<string>) => {
        const object = node(value);
        if (!object) return;
        const prefixes = new Set(inherited);
        for (const [key, val] of Object.entries(object)) {
          if (key.startsWith('@_xmlns:')) {
            const prefix = key.slice(8);
            if (RELATIONSHIP_NAMESPACE.test(String(val))) prefixes.add(prefix);
            else prefixes.delete(prefix);
          }
        }
        for (const [key, val] of Object.entries(object)) {
          const match = /^@_([^:]+):(id|embed|link)$/.exec(key);
          if (match && prefixes.has(match[1]!) && !relationships.get(path)?.has(String(val))) {
            add('relationships.reference', `Unresolved relationship "${String(val)}" in ${path}.`);
          }
          if (!key.startsWith('@_')) for (const item of Array.isArray(val) ? val : [val]) inspect(item, prefixes);
        }
      };
      inspect(document, new Set());
    }
    const presentation = children(documents.get('ppt/presentation.xml'), 'presentation')[0];
    if (!presentation && documents.has('ppt/presentation.xml')) add('presentation', 'Presentation XML has no presentation root.');
    const size = children(presentation, 'sldSz')[0];
    const cx = Number(attribute(size, 'cx'));
    const cy = Number(attribute(size, 'cy'));
    if (!Number.isFinite(cx) || !Number.isFinite(cy) || cx <= 0 || cy <= 0 || Math.abs(cx / cy - 16 / 9) > 0.01) {
      add('dimensions', 'Presentation must declare positive widescreen (16:9) slide dimensions.');
    }
    const slideIds = children(children(presentation, 'sldIdLst')[0], 'sldId');
    report.slideCount = slideIds.length;
    if (slideIds.length === 0) add('slides', 'Presentation contains no slide references.');
    const slidePaths = new Set<string>();
    slideIds.forEach((entry, index) => {
      const slide = index + 1;
      const object = node(entry);
      const id = object && Object.entries(object).find(([key]) => /^@_[^:]+:id$/.test(key))?.[1];
      const rel = id === undefined ? undefined : relationships.get('ppt/presentation.xml')?.get(String(id));
      if (!rel || rel.external || !/\/slide$/.test(rel.type) || !rel.target) {
        add('slides.reference', 'Slide reference must resolve to an internal slide relationship.', slide);
        return;
      }
      if (slidePaths.has(rel.target)) add('slides.reference', `Duplicate slide target: ${rel.target}.`, slide);
      slidePaths.add(rel.target);
      const slideDocument = documents.get(rel.target);
      if (!slideDocument || !children(slideDocument, 'sld').length) {
        add('slides.xml', `Missing or invalid slide XML: ${rel.target}.`, slide);
        return;
      }
      walk(slideDocument, (name, value) => {
        if (['sp', 'pic', 'cxnSp', 'graphicFrame'].includes(name)) report.shapeCount++;
        if (name === 'sp') {
          let text = '';
          for (const body of children(value, 'txBody')) walk(body, (textName, textValue) => {
            if (textName === 't') text += typeof textValue === 'string' ? textValue : String(node(textValue)?.['#text'] ?? '');
          });
          if (text.trim()) report.editableTextCount++;
        }
      });
    });
    // Validate orphan slide parts too rather than silently accepting corrupt XML roots.
    for (const [path, document] of documents) {
      if (/^ppt\/slides\/slide[^/]*\.xml$/.test(path) && !children(document, 'sld').length) add('slides.xml', `Invalid slide root in ${path}.`);
    }
    const contentTypes = children(documents.get('[Content_Types].xml'), 'Types')[0];
    if (!contentTypes) add('contentTypes', 'Missing or invalid content types root.');
    else {
      const defaults = new Map(children(contentTypes, 'Default').map(entry => [attribute(entry, 'Extension')?.toLowerCase(), attribute(entry, 'ContentType')]));
      const overrides = new Map(children(contentTypes, 'Override').map(entry => [attribute(entry, 'PartName'), attribute(entry, 'ContentType')]));
      const contentTypeFor = (path: string) => overrides.get(`/${path}`) ?? defaults.get(path.split('.').pop()?.toLowerCase());
      if (contentTypeFor('ppt/presentation.xml') !== 'application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml') {
        add('contentTypes', 'Presentation content type is missing or incorrect.');
      }
      for (const path of slidePaths) if (contentTypeFor(path) !== 'application/vnd.openxmlformats-officedocument.presentationml.slide+xml') {
        add('contentTypes', `Slide content type is missing or incorrect: ${path}.`);
      }
      for (const path of Object.keys(files)) {
        if (path !== '[Content_Types].xml' && !contentTypeFor(path)) add('contentTypes', `Part has no content type: ${path}.`);
      }
      for (const partName of overrides.keys()) {
        const resolved = partName?.startsWith('/') ? resolveTarget('', partName) : undefined;
        if (!resolved || !Object.hasOwn(files, resolved)) add('contentTypes', `Content type override references a missing or unsafe part: ${partName ?? '(no PartName)'}.`);
      }
    }
    report.valid = !issues.some(issue => issue.severity === 'error');
    return report;
  } catch (error) {
    add('zip', `Unable to validate package: ${error instanceof Error ? error.message : 'invalid ZIP or XML'}`);
    return report;
  }
}
