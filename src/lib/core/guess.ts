import { SEPARATOR_CHOICES } from './separator';
import type { Table } from './types';

function columnCells(table: Table, index: number): string[] {
  return table.rows.map((row) => (row[index] ?? '').trim());
}

export function guessPrimaryColumn(table: Table): number {
  for (let index = 0; index < table.headers.length; index += 1) {
    const cells = columnCells(table, index);
    if (cells.length === 0) break;
    const allFilled = cells.every((cell) => cell !== '');
    const allUnique = new Set(cells).size === cells.length;
    if (allFilled && allUnique) return index;
  }
  return 0;
}

const STRONG_SEPARATORS = SEPARATOR_CHOICES.map((c) => c.value).filter((v) => v !== ' ' && v !== '/');
const HEADER_HINTS = ['gene', 'amr', 'resist', 'antibiotic', 'antimicrobial', 'genotype', 'profile', 'virulence', 'plasmid', 'marker'];

function headerLooksLikeList(header: string): boolean {
  const lower = header.toLowerCase();
  return HEADER_HINTS.some((hint) => lower.includes(hint));
}

export function guessValueColumn(table: Table, primaryColumn: number): number {
  let best = -1;
  let bestScore = 0;
  for (let index = 0; index < table.headers.length; index += 1) {
    if (index === primaryColumn) continue;
    const cells = columnCells(table, index);
    const splitCells = cells.filter((cell) => STRONG_SEPARATORS.some((sep) => cell.includes(sep))).length;
    const score = splitCells + (headerLooksLikeList(table.headers[index]) ? table.rows.length : 0);
    if (score > bestScore) {
      best = index;
      bestScore = score;
    }
  }
  if (best >= 0) return best;
  const fallback = table.headers.findIndex((_, i) => i !== primaryColumn);
  return fallback >= 0 ? fallback : 0;
}

export function duplicateIdCount(table: Table, primaryColumn: number): number {
  const seen = new Set<string>();
  const duplicated = new Set<string>();
  for (const cell of columnCells(table, primaryColumn)) {
    if (seen.has(cell)) duplicated.add(cell);
    seen.add(cell);
  }
  return duplicated.size;
}
