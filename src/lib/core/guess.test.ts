import { describe, expect, it } from 'vitest';
import { duplicateIdCount, guessPrimaryColumn, guessValueColumn } from './guess';
import type { Table } from './types';

const table: Table = {
  headers: ['site', 'sample', 'genes', 'notes'],
  rows: [
    ['A', 'S1', 'x;y', ''],
    ['A', 'S2', 'z', 'long free text here'],
    ['B', 'S3', 'x;z', ''],
  ],
};

describe('guessPrimaryColumn', () => {
  it('picks the first column whose values are all filled and unique', () => {
    expect(guessPrimaryColumn(table)).toBe(1);
  });
  it('falls back to the first column', () => {
    expect(guessPrimaryColumn({ headers: ['a', 'b'], rows: [['1', '1'], ['1', '1']] })).toBe(0);
  });
});

describe('guessValueColumn', () => {
  it('picks the column with the most separator-bearing cells, skipping the primary', () => {
    expect(guessValueColumn(table, 1)).toBe(2);
  });
  it('ignores slashes in dates and prefers a header that sounds like a gene list', () => {
    const dated: Table = {
      headers: ['id', 'date', 'AMR_genotype', 'region'],
      rows: [['1', '1/8/2023', 'OXA-72', 'East'], ['2', '2/9/2023', 'OXA-23', 'West']],
    };
    expect(guessValueColumn(dated, 0)).toBe(2);
  });
  it('falls back to the first non-primary column when nothing splits', () => {
    expect(guessValueColumn({ headers: ['id', 'v'], rows: [['1', 'a']] }, 0)).toBe(1);
  });
});

describe('duplicateIdCount', () => {
  it('counts distinct ids that appear more than once', () => {
    expect(duplicateIdCount({ headers: ['id'], rows: [['a'], ['a'], ['b'], ['a'], ['c'], ['c']] }, 0)).toBe(2);
    expect(duplicateIdCount(table, 1)).toBe(0);
  });
});
