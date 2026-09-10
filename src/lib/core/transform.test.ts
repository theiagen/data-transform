import { describe, expect, it } from 'vitest';
import { collectValues, splitCell, transform } from './transform';
import type { Table, TransformOptions } from './types';

const table: Table = {
  headers: ['id', 'species', 'genes', 'region'],
  rows: [
    ['S1', 'A. baumannii', 'OXA-72; NDM-1', 'East'],
    ['S2', 'A. baumannii', 'OXA-23', 'West'],
    ['S3', 'K. pneumoniae', '', 'East'],
    ['S4', 'K. pneumoniae', 'NDM-1;OXA-72;NDM-1', 'West'],
  ],
};

const base: TransformOptions = {
  primaryColumn: 0,
  valueColumn: 2,
  separator: ';',
  format: 'binary',
  keepOriginal: false,
  mergeDuplicates: false,
  columnPrefix: '',
  order: 'alpha',
  excludedValues: new Set(),
};

describe('splitCell', () => {
  it('splits on the separator, trims, drops empties and duplicates', () => {
    expect(splitCell(' a ;b;; a ', ';')).toEqual(['a', 'b']);
  });
  it('treats whitespace separator as any run of whitespace', () => {
    expect(splitCell('a  b\tc', ' ')).toEqual(['a', 'b', 'c']);
  });
  it('returns nothing for an empty cell', () => {
    expect(splitCell('   ', ';')).toEqual([]);
  });
});

describe('collectValues', () => {
  it('counts how many rows contain each value', () => {
    const counts = collectValues(table, 2, ';');
    expect(counts.get('OXA-72')).toBe(2);
    expect(counts.get('NDM-1')).toBe(2);
    expect(counts.get('OXA-23')).toBe(1);
    expect(counts.size).toBe(3);
  });
});

describe('transform', () => {
  it('replaces the value column with one presence column per unique value', () => {
    const result = transform(table, base);
    expect(result.table.headers).toEqual(['id', 'species', 'NDM-1', 'OXA-23', 'OXA-72', 'region']);
    expect(result.table.rows[0]).toEqual(['S1', 'A. baumannii', '1', '0', '1', 'East']);
    expect(result.table.rows[2]).toEqual(['S3', 'K. pneumoniae', '0', '0', '0', 'East']);
    expect(result.table.rows[3]).toEqual(['S4', 'K. pneumoniae', '1', '0', '1', 'West']);
    expect(result.newColumns).toEqual(['NDM-1', 'OXA-23', 'OXA-72']);
  });

  it('keeps the original column in front of the new ones when asked', () => {
    const result = transform(table, { ...base, keepOriginal: true });
    expect(result.table.headers).toEqual(['id', 'species', 'genes', 'NDM-1', 'OXA-23', 'OXA-72', 'region']);
    expect(result.table.rows[1][2]).toBe('OXA-23');
  });

  it('supports boolean and yes/no output formats', () => {
    expect(transform(table, { ...base, format: 'boolean' }).table.rows[1].slice(2, 5)).toEqual(['false', 'true', 'false']);
    expect(transform(table, { ...base, format: 'yesno' }).table.rows[1].slice(2, 5)).toEqual(['no', 'yes', 'no']);
  });

  it('prefixes new column names', () => {
    const result = transform(table, { ...base, columnPrefix: 'gene_' });
    expect(result.table.headers[2]).toBe('gene_NDM-1');
  });

  it('orders columns by first appearance or frequency', () => {
    expect(transform(table, { ...base, order: 'appearance' }).newColumns).toEqual(['OXA-72', 'NDM-1', 'OXA-23']);
    const byFrequency = transform(table, { ...base, order: 'frequency' }).newColumns;
    expect(byFrequency[2]).toBe('OXA-23');
  });

  it('skips excluded values', () => {
    const result = transform(table, { ...base, excludedValues: new Set(['NDM-1']) });
    expect(result.newColumns).toEqual(['OXA-23', 'OXA-72']);
  });

  it('merges rows sharing a primary id when asked, taking the union of values', () => {
    const duplicated: Table = {
      headers: ['id', 'site', 'genes'],
      rows: [
        ['S1', 'Lab A', 'OXA-72'],
        ['S1', '', 'NDM-1'],
        ['S1', 'Lab B', 'NDM-1'],
        ['S2', 'Lab A', 'OXA-23'],
      ],
    };
    const result = transform(duplicated, { ...base, valueColumn: 2, mergeDuplicates: true });
    expect(result.table.rows).toHaveLength(2);
    expect(result.table.rows[0]).toEqual(['S1', 'Lab A', '1', '0', '1']);
    expect(result.mergedIds).toBe(1);
    expect(result.conflicts).toEqual([{ id: 'S1', column: 'site', values: ['Lab A', 'Lab B'] }]);
  });

  it('leaves duplicate ids alone when merging is off', () => {
    const duplicated: Table = {
      headers: ['id', 'genes'],
      rows: [['S1', 'a'], ['S1', 'b']],
    };
    const result = transform(duplicated, { ...base, valueColumn: 1 });
    expect(result.table.rows).toHaveLength(2);
    expect(result.mergedIds).toBe(0);
  });

  it('avoids clashing with existing header names', () => {
    const clashing: Table = { headers: ['id', 'genes', 'NDM-1'], rows: [['S1', 'NDM-1', 'x']] };
    const result = transform(clashing, { ...base, valueColumn: 1 });
    expect(result.table.headers).toEqual(['id', 'NDM-1 (presence)', 'NDM-1']);
  });
});
