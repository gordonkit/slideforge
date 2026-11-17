import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { applyTableFills } from '../../src/exporters/table-fill.js';

const fill = (color: string) => `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`;
const highlight = (color: string) => `<a:highlight><a:srgbClr val="${color}"/></a:highlight>`;
const run = (text: string, background: string) => `<a:r><a:rPr b="1">${fill('101827')}${highlight(background)}</a:rPr><a:t>${text}</a:t></a:r>`;
const cell = (color: string, text: string) => `<a:tc><a:txBody><a:p>${text}</a:p></a:txBody><a:tcPr><a:lnB>${fill('33467A')}</a:lnB>${fill(color)}</a:tcPr></a:tc>`;
const path = 'ppt/slides/slide1.xml';

describe('translucent table fills', () => {
  it('removes inherited header and body highlights without changing text, borders, or intentional different-color highlights', () => {
    const header = cell('4CC3FF', run('Header', '4CC3FF') + run('Marked', 'FF00FF'));
    const body = cell('18234A', run('Body', '18234a'));
    const data = zipSync({ [path]: strToU8(`<a:tbl><a:tr>${header}</a:tr><a:tr>${body}</a:tr></a:tbl>`) });
    const result = strFromU8(unzipSync(applyTableFills(data, [[[0.8, 0.5]]]))[path]!);
    expect(result).not.toContain(highlight('4CC3FF'));
    expect(result).not.toContain(highlight('18234a'));
    expect(result).toContain(run('Marked', 'FF00FF'));
    expect(result).toContain(`<a:rPr b="1">${fill('101827')}</a:rPr><a:t>Header</a:t>`);
    expect(result).toContain(`<a:rPr b="1">${fill('101827')}</a:rPr><a:t>Body</a:t>`);
    expect(result).toContain(`<a:lnB>${fill('33467A')}</a:lnB>`);
    expect(result).toContain('<a:srgbClr val="4CC3FF"><a:alpha val="80000"/></a:srgbClr>');
    expect(result).toContain('<a:srgbClr val="18234A"><a:alpha val="50000"/></a:srgbClr>');
  });

  it('does not remove highlights from unmarked or opaque cells next to a corrected cell', () => {
    const marked = cell('4CC3FF', run('Translucent', '4CC3FF'));
    const untouched = cell('FF00FF', run('Unmarked', 'FF00FF'));
    const opaque = cell('00FF00', run('Opaque', '00FF00'));
    const data = zipSync({ [path]: strToU8(`<a:tbl><a:tr>${marked}${untouched}${opaque}</a:tr></a:tbl>`) });
    const result = strFromU8(unzipSync(applyTableFills(data, [[[0.8, null, 1]]]))[path]!);
    expect(result).not.toContain(highlight('4CC3FF'));
    expect(result).toContain(untouched);
    expect(result).toContain(opaque);
  });
});
