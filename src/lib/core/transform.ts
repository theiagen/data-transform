import type { MergeConflict, PresenceFormat, Table, TransformOptions, TransformResult } from './types';

const PRESENCE_LABELS: Record<PresenceFormat, [present: string, absent: string]> = {
  binary: ['1', '0'],
  boolean: ['true', 'false'],
  yesno: ['yes', 'no'],
};

export function splitCell(cell: string, separator: string): string[] {
  const parts = separator === ' ' ? cell.split(/\s+/) : cell.split(separator);
  const seen = new Set<string>();
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

export function collectValues(table: Table, valueColumn: number, separator: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of table.rows) {
    for (const value of splitCell(row[valueColumn] ?? '', separator)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

export function orderValues(counts: Map<string, number>, options: Pick<TransformOptions, 'order' | 'excludedValues'>): string[] {
  const values = [...counts.keys()].filter((value) => !options.excludedValues.has(value));
  if (options.order === 'alpha') {
    return values.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }
  if (options.order === 'frequency') {
    return values.sort((a, b) => (counts.get(b) ?? 0) - (counts.get(a) ?? 0) || a.localeCompare(b));
  }
  return values;
}

function uniqueHeader(name: string, taken: Set<string>): string {
  if (!taken.has(name)) return name;
  const withSuffix = `${name} (presence)`;
  if (!taken.has(withSuffix)) return withSuffix;
  let n = 2;
  while (taken.has(`${withSuffix} ${n}`)) n += 1;
  return `${withSuffix} ${n}`;
}

interface RowGroup {
  cells: string[];
  values: Set<string>;
  rowCount: number;
  conflicts: Map<number, Set<string>>;
}

export function joinValues(values: Iterable<string>, separator: string): string {
  const joiner = separator.trim() === '' ? separator : `${separator} `;
  return [...values].join(joiner);
}

function groupByPrimary(table: Table, options: TransformOptions): Map<string, RowGroup> {
  const groups = new Map<string, RowGroup>();
  for (const row of table.rows) {
    const id = (row[options.primaryColumn] ?? '').trim();
    const values = splitCell(row[options.valueColumn] ?? '', options.separator);
    const group = groups.get(id);
    if (!group) {
      groups.set(id, { cells: [...row], values: new Set(values), rowCount: 1, conflicts: new Map() });
      continue;
    }
    group.rowCount += 1;
    values.forEach((value) => group.values.add(value));
    row.forEach((cell, index) => {
      if (index === options.valueColumn || index === options.primaryColumn) return;
      const incoming = cell.trim();
      if (!incoming) return;
      const current = group.cells[index].trim();
      if (!current) {
        group.cells[index] = cell;
      } else if (current !== incoming) {
        const clash = group.conflicts.get(index) ?? new Set([current]);
        clash.add(incoming);
        group.conflicts.set(index, clash);
      }
    });
  }
  for (const group of groups.values()) {
    if (group.rowCount > 1) group.cells[options.valueColumn] = joinValues(group.values, options.separator);
  }
  if (options.mergeConflicts === 'combine') combineConflicts(groups, options);
  return groups;
}

function combineConflicts(groups: Map<string, RowGroup>, options: TransformOptions): void {
  for (const group of groups.values()) {
    if (group.rowCount < 2) continue;
    for (const [index, values] of group.conflicts) {
      const items = new Set([...values].flatMap((value) => splitCell(value, options.separator)));
      group.cells[index] = joinValues(items, options.separator);
    }
  }
}

interface SourceRows {
  rows: { cells: string[]; values: Set<string> }[];
  mergedIds: number;
  conflicts: MergeConflict[];
}

function sourceRows(table: Table, options: TransformOptions): SourceRows {
  if (!options.mergeDuplicates) {
    return {
      rows: table.rows.map((row) => ({
        cells: row,
        values: new Set(splitCell(row[options.valueColumn] ?? '', options.separator)),
      })),
      mergedIds: 0,
      conflicts: [],
    };
  }
  const groups = groupByPrimary(table, options);
  const conflicts: MergeConflict[] = [];
  let mergedIds = 0;
  for (const [id, group] of groups) {
    if (group.rowCount > 1) mergedIds += 1;
    for (const [index, values] of group.conflicts) {
      conflicts.push({ id, column: table.headers[index], values: [...values] });
    }
  }
  return { rows: [...groups.values()], mergedIds, conflicts };
}

export function transform(table: Table, options: TransformOptions): TransformResult {
  const counts = collectValues(table, options.valueColumn, options.separator);
  const newValues = orderValues(counts, options);
  const [present, absent] = PRESENCE_LABELS[options.format];

  const keepColumn = (index: number) => index !== options.valueColumn || options.keepOriginal;
  const keptHeaders = table.headers.filter((_, i) => keepColumn(i));
  const taken = new Set(keptHeaders);
  const newHeaders = newValues.map((value) => {
    const header = uniqueHeader(`${options.columnPrefix}${value}`, taken);
    taken.add(header);
    return header;
  });

  const insertAt = options.keepOriginal ? options.valueColumn + 1 : options.valueColumn;
  const headers = [...keptHeaders.slice(0, insertAt), ...newHeaders, ...keptHeaders.slice(insertAt)];

  const source = sourceRows(table, options);
  const rows = source.rows.map(({ cells, values }) => {
    const kept = cells.filter((_, i) => keepColumn(i));
    const presence = newValues.map((value) => (values.has(value) ? present : absent));
    return [...kept.slice(0, insertAt), ...presence, ...kept.slice(insertAt)];
  });

  return {
    table: { headers, rows },
    newColumns: newHeaders,
    valueCounts: counts,
    mergedIds: source.mergedIds,
    conflicts: source.conflicts,
  };
}
