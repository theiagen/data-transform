import { describe, expect, it } from 'vitest';
import { cleanHeader, decodeBytes, parseText, serializeCsv } from './parse';

describe('cleanHeader', () => {
  it('strips BOM, non-breaking spaces and surrounding whitespace', () => {
    expect(cleanHeader('\uFEFF Name ')).toBe('Name');
    expect(cleanHeader('\u00A0Current_Date In')).toBe('Current_Date In');
  });
  it('names blank headers', () => {
    expect(cleanHeader('', 3)).toBe('Column 4');
  });
});

describe('decodeBytes', () => {
  it('decodes UTF-8', () => {
    expect(decodeBytes(new TextEncoder().encode('héllo'))).toBe('héllo');
  });
  it('falls back to Latin-1 for stray bytes', () => {
    const bytes = new Uint8Array([0xa0, 0x41]);
    expect(decodeBytes(bytes)).toBe('\u00A0A');
  });
});

describe('parseText', () => {
  it('auto-detects tab delimited input and cleans headers', () => {
    const parsed = parseText('id\tgenes\r\nS1\ta;b\r\nS2\tc\r\n');
    expect(parsed.delimiter).toBe('\t');
    expect(parsed.table.headers).toEqual(['id', 'genes']);
    expect(parsed.table.rows).toEqual([['S1', 'a;b'], ['S2', 'c']]);
  });
  it('handles quoted commas and pads short rows', () => {
    const parsed = parseText('id,name,genes\nS1,"Doe, J",a\nS2,x\n');
    expect(parsed.table.rows[0]).toEqual(['S1', 'Doe, J', 'a']);
    expect(parsed.table.rows[1]).toEqual(['S2', 'x', '']);
  });
  it('drops fully empty trailing lines and de-duplicates header names', () => {
    const parsed = parseText('id,x,x\n1,2,3\n\n');
    expect(parsed.table.headers).toEqual(['id', 'x', 'x (2)']);
    expect(parsed.table.rows).toHaveLength(1);
  });
});

describe('serializeCsv', () => {
  it('quotes fields that need it and uses CRLF line endings', () => {
    const csv = serializeCsv({ headers: ['a', 'b'], rows: [['1', 'x,y'], ['2', 'he said "hi"']] });
    expect(csv).toBe('a,b\r\n1,"x,y"\r\n2,"he said ""hi"""');
  });
});
