export interface Table {
  headers: string[];
  rows: string[][];
}

export type PresenceFormat = 'binary' | 'boolean' | 'yesno';

export type ColumnOrder = 'alpha' | 'appearance' | 'frequency';

export interface TransformOptions {
  primaryColumn: number;
  valueColumn: number;
  separator: string;
  format: PresenceFormat;
  keepOriginal: boolean;
  mergeDuplicates: boolean;
  columnPrefix: string;
  order: ColumnOrder;
  excludedValues: ReadonlySet<string>;
}

export interface MergeConflict {
  id: string;
  column: string;
  values: string[];
}

export interface TransformResult {
  table: Table;
  newColumns: string[];
  valueCounts: Map<string, number>;
  mergedIds: number;
  conflicts: MergeConflict[];
}
