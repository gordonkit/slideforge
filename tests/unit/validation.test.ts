import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { chromium, type Browser, type Page } from 'playwright';
import { strToU8, zipSync } from 'fflate';
import { validateLayout, validatePptx } from '../../src/validators/index.js';

const office = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const packageRelationships = 'http://schemas.openxmlformats.org/package/2006/relationships';
const presentationNamespace = 'http://schemas.openxmlformats.org/presentationml/2006/main';
function parts(): Record<string, string> {
  return {
    '[Content_Types].xml': `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
      <Override PartName="/ppt/slides/slide1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>
    </Types>`,
    '_rels/.rels': `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${office}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
    'ppt/presentation.xml': `<p:presentation xmlns:p="${presentationNamespace}" xmlns:r="${office}">
      <p:sldIdLst><p:sldId id="256" r:id="rId1"/></p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/>
    </p:presentation>`,
    'ppt/_rels/presentation.xml.rels': `<Relationships xmlns="${packageRelationships}"><Relationship Id="rId1" Type="${office}/slide" Target="slides/slide1.xml"/></Relationships>`,
    'ppt/slides/slide1.xml': `<p:sld xmlns:p="${presentationNamespace}" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">
      <p:cSld><p:spTree>
        <p:sp><p:txBody><a:p><a:r><a:t>Editable</a:t></a:r><a:r><a:t> text</a:t></a:r></a:p></p:txBody></p:sp>
        <p:sp><p:spPr/></p:sp><p:pic/><p:cxnSp/><p:graphicFrame/>
      </p:spTree></p:cSld>
    </p:sld>`,
  };
}
function archive(input = parts(), level: 0 | 6 = 6): Uint8Array {
  return zipSync(Object.fromEntries(Object.entries(input).map(([name, value]) => [name, strToU8(value)])), { level });
}
function centralOffset(data: Uint8Array): number {
  return new DataView(data.buffer, data.byteOffset, data.byteLength).getUint32(data.length - 6, true);
}

describe('PPTX structural validation', () => {
  it('reports slides, editable text shapes and drawable objects', () => {
    expect(validatePptx(archive())).toEqual({
      valid: true, slideCount: 1, editableTextCount: 1, shapeCount: 5, issues: [],
    });
  });

  it.each([new Uint8Array(), strToU8('not zip'), new Uint8Array([80, 75, 3, 4])])('returns issues instead of throwing on invalid ZIP input', data => {
    expect(validatePptx(data).valid).toBe(false);
    expect(validatePptx(data).issues.some(issue => issue.rule === 'pptx.zip')).toBe(true);
  });

  it('rejects missing required parts and empty slide lists', () => {
    const input = parts();
    delete input['ppt/presentation.xml'];
    const report = validatePptx(archive(input));
    expect(report.valid).toBe(false);
    expect(report.issues.some(issue => issue.rule === 'pptx.part.missing')).toBe(true);
    expect(validatePptx(zipSync({})).valid).toBe(false);
  });

  it('rejects missing slide and media relationship targets', () => {
    const input = parts();
    delete input['ppt/slides/slide1.xml'];
    input['ppt/slides/_rels/slide1.xml.rels'] = `<Relationships><Relationship Id="missing" Type="${office}/image" Target="../media/missing.png"/></Relationships>`;
    const report = validatePptx(archive(input));
    expect(report.valid).toBe(false);
    expect(report.issues.filter(issue => issue.rule === 'pptx.relationships.target')).toHaveLength(2);
  });

  it('rejects unsafe traversal but accepts rooted and relative internal targets', () => {
    const input = parts();
    input['ppt/_rels/presentation.xml.rels'] = input['ppt/_rels/presentation.xml.rels']!.replace('slides/slide1.xml', '../../outside.xml');
    expect(validatePptx(archive(input)).issues.some(issue => issue.rule === 'pptx.relationships.target')).toBe(true);
    input['ppt/_rels/presentation.xml.rels'] = input['ppt/_rels/presentation.xml.rels']!.replace('../../outside.xml', '/ppt/slides/slide1.xml');
    expect(validatePptx(archive(input)).valid).toBe(true);
  });

  it('allows external hyperlinks without fetching and checks explicit relationship references', () => {
    const input = parts();
    input['ppt/slides/_rels/slide1.xml.rels'] = `<Relationships><Relationship Id="url" Type="${office}/hyperlink" Target="https://example.test/" TargetMode="External"/></Relationships>`;
    input['ppt/slides/slide1.xml'] = input['ppt/slides/slide1.xml']!.replace('<p:cSld>', `<p:cSld xmlns:r="${office}"><a:hlinkClick r:id="url"/>`);
    expect(validatePptx(archive(input)).valid).toBe(true);
    input['ppt/slides/slide1.xml'] = input['ppt/slides/slide1.xml']!.replace('r:id="url"', 'r:id="missing"');
    expect(validatePptx(archive(input)).issues.some(issue => issue.rule === 'pptx.relationships.reference')).toBe(true);
  });

  it.each(['<p:sld><broken></p:sld>', '<!DOCTYPE sld [<!ENTITY x SYSTEM "file:///etc/passwd">]><sld/>'])('rejects malformed or unsafe XML', xml => {
    const input = parts();
    input['ppt/slides/slide1.xml'] = xml;
    expect(validatePptx(archive(input)).valid).toBe(false);
    expect(validatePptx(archive(input)).issues.some(issue => issue.rule.startsWith('pptx.xml'))).toBe(true);
  });

  it('rejects non-widescreen dimensions and missing slide content types', () => {
    const input = parts();
    input['ppt/presentation.xml'] = input['ppt/presentation.xml']!.replace('6858000', '9144000');
    input['[Content_Types].xml'] = input['[Content_Types].xml']!.replace('presentationml.slide+xml', 'invalid');
    const report = validatePptx(archive(input));
    expect(report.valid).toBe(false);
    expect(report.issues.some(issue => issue.rule === 'pptx.dimensions')).toBe(true);
    expect(report.issues.some(issue => issue.rule === 'pptx.contentTypes')).toBe(true);
  });

  it('detects corrupted payloads even if the XML remains well-formed', () => {
    const data = archive(parts(), 0);
    const needle = strToU8('Editable');
    const offset = data.findIndex((_, index) => needle.every((byte, i) => data[index + i] === byte));
    expect(offset).toBeGreaterThan(0);
    data[offset] = 'X'.charCodeAt(0);
    expect(validatePptx(data).issues.some(issue => issue.rule === 'pptx.zip' && issue.message.includes('checksum'))).toBe(true);
  });

  it('rejects oversized declared uncompressed allocations before inflation', () => {
    const data = archive();
    new DataView(data.buffer, data.byteOffset, data.byteLength).setUint32(centralOffset(data) + 24, 0x7fffffff, true);
    const report = validatePptx(data);
    expect(report.valid).toBe(false);
    expect(report.issues[0]?.message).toContain('limits');
  });

  it('rejects unsafe ZIP part names, duplicates and truncated archives', () => {
    const input = parts();
    input['../evil.xml'] = '<evil/>';
    expect(validatePptx(archive(input)).issues[0]?.message).toContain('unsafe');
    const data = archive();
    expect(validatePptx(data.subarray(0, data.length - 8)).valid).toBe(false);
    // Two same-length root names let both the local and central filenames be changed.
    const duplicate = zipSync({ 'a.xml': strToU8('<a/>'), 'b.xml': strToU8('<b/>') });
    for (let i = 0; i < duplicate.length - 5; i++) {
      if (duplicate[i] === 98 && duplicate[i + 1] === 46 && duplicate[i + 2] === 120 && duplicate[i + 3] === 109 && duplicate[i + 4] === 108) duplicate[i] = 97;
    }
    expect(validatePptx(duplicate).issues[0]?.message).toContain('duplicate');
  });
});

describe('browser layout validation', () => {
  let browser: Browser;
  let page: Page;
  beforeAll(async () => {
    browser = await chromium.launch({ args: ['--no-sandbox'] });
    page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  });
  afterAll(async () => { await browser?.close(); });
  async function content(body: string, root = 'data-pptx="slide"', extraStyle = '') {
    await page.setContent(`<style>
      * { box-sizing: border-box; } body { margin: 0; }
      section { position: relative; width:1280px; height:720px; font-family: sans-serif; }
      ${extraStyle}
    </style><section ${root}>${body}</section>`);
  }

  it('accepts basic slides and does not flag ancestor/descendant or inline text as overlaps', async () => {
    await content('<div style="padding:20px;background:#fff"><h1>Title</h1><p>Text with <strong>an inline label</strong>.</p></div>');
    expect(await validateLayout(page)).toEqual([]);
  });

  it('supports fallback and custom selectors, dimensions and toggles', async () => {
    await content('<p>Text</p>', 'class="slide"');
    expect(await validateLayout(page)).toEqual([]);
    await content('<p>Text</p>', 'class="custom"', 'section {width:640px;height:360px}');
    expect(await validateLayout(page, { selector: '.custom', width: 640, height: 360 })).toEqual([]);
    expect((await validateLayout(page, { selector: '.custom' })).some(issue => issue.rule === 'layout.dimensions')).toBe(true);
    expect(await validateLayout(page, { selector: '.custom', rules: { dimensions: false } })).toEqual([]);
    expect((await validateLayout(page, { selector: '[' }))[0]?.rule).toBe('layout.selector');
    expect((await validateLayout(page, { width: Number.NaN }))[0]?.rule).toBe('layout.options');
  });

  it('reports outside bounds and clipped text, with slide numbers', async () => {
    await content('<div id="outside" style="position:absolute;left:1270px;width:100px;height:20px">Outside</div><div id="clipped" style="width:25px;height:12px;overflow:hidden;white-space:nowrap">Clipped content</div>');
    const issues = await validateLayout(page);
    expect(issues.some(issue => issue.rule === 'layout.boundaries' && issue.message.includes('#outside') && issue.slide === 1)).toBe(true);
    expect(issues.some(issue => issue.rule === 'layout.overflow' && issue.message.includes('#clipped'))).toBe(true);
    expect((await validateLayout(page, { rules: { boundaries: false, overflow: false } })).some(issue => issue.severity === 'error')).toBe(false);
  });

  it('reports unbroken text overflowing a visible container', async () => {
    await content('<div id="text" style="width:20px;white-space:nowrap">A very long unbroken line</div>');
    expect((await validateLayout(page)).some(issue => issue.rule === 'layout.overflow' && issue.message.includes('#text'))).toBe(true);
  });

  it('detects collisions and honors intentional-overlap annotations', async () => {
    const boxes = '<div id="one" style="position:absolute;left:20px;top:20px;width:100px;height:100px;background:red"></div><div id="two" style="position:absolute;left:60px;top:60px;width:100px;height:100px;background:blue"></div>';
    await content(boxes);
    expect((await validateLayout(page)).some(issue => issue.rule === 'layout.overlap')).toBe(true);
    await content(boxes.replace('id="two"', 'id="two" data-pptx-allow-overlap="true"'));
    expect((await validateLayout(page)).some(issue => issue.rule === 'layout.overlap')).toBe(false);
    await content(boxes);
    expect((await validateLayout(page, { rules: { overlap: false } })).some(issue => issue.rule === 'layout.overlap')).toBe(false);
  });

  it('detects missing images and unavailable explicit fonts, not generic fallback', async () => {
    await content('<img id="broken" src="data:image/png;base64,broken"><p style="font-family:SlideForgeDefinitelyMissingFont,sans-serif">Fallback text</p><p style="font-family:monospace">Generic text</p>');
    const issues = await validateLayout(page);
    expect(issues.some(issue => issue.rule === 'layout.images')).toBe(true);
    const fonts = issues.filter(issue => issue.rule === 'layout.fonts');
    expect(fonts).toHaveLength(1);
    expect(fonts[0]?.message).toContain('SlideForgeDefinitelyMissingFont');
  });

  it('ignores invisible content and only uses fallback roots when preferred roots are absent', async () => {
    await content('<div style="opacity:0"><p style="position:absolute;left:2000px">Invisible</p></div><div hidden><img src="broken"></div><div class="slide" style="width:1px;height:1px"></div>');
    expect(await validateLayout(page)).toEqual([]);
    await page.setContent('<p>No slides</p>');
    expect((await validateLayout(page))[0]?.rule).toBe('layout.slides');
  });
});
