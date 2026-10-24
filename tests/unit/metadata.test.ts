import { describe, expect, it } from 'vitest';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { applyMetadata } from '../../src/exporters/metadata.js';

describe('PowerPoint metadata adapter', () => {
  it('escapes user metadata and preserves slide data', () => {
    const original = zipSync({ 'ppt/slides/slide1.xml': strToU8('<slide/>') });
    const result = unzipSync(applyMetadata(original, { title: '<script>&"繁體中文', author: "O'Brien" }));
    expect(strFromU8(result['docProps/core.xml']!)).toContain('&lt;script&gt;&amp;&quot;繁體中文');
    expect(strFromU8(result['docProps/core.xml']!)).toContain('O&apos;Brien');
    expect(strFromU8(result['ppt/slides/slide1.xml']!)).toBe('<slide/>');
  });
});
