import Papa from 'papaparse';
import type { Table } from './types';

export interface ParsedFile {
  table: Table;
  delimiter: string;
}

const BYTE_ORDER_MARK = /^\uFEFF/;
const NON_BREAKING_SPACE = /\u00A0/g;

export function cleanHeader(raw: string, index = 0): string {
  const cleaned = raw.replace(BYTE_ORDER_MARK, '').replace(NON_BREAKING_SPACE, ' ').trim();
  return cleaned || `Column ${index + 1}`;
}

export function decodeBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

function dedupeHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header) => {
    const count = seen.get(header) ?? 0;
    seen.set(header, count + 1);
    return count === 0 ? header : `${header} (${count + 1})`;
  });
}

export function parseText(text: string): ParsedFile {
  const result = Papa.parse<string[]>(text, {
    delimitersToGuess: [',', '\t', ';', '|'],
    skipEmptyLines: 'greedy',
  });
  const [rawHeader = [], ...body] = result.data;
  const headers = dedupeHeaders(rawHeader.map((h, i) => cleanHeader(h, i)));
  const width = headers.length;
  const rows = body.map((row) => {
    const padded = row.slice(0, width);
    while (padded.length < width) padded.push('');
    return padded;
  });
  return { table: { headers, rows }, delimiter: result.meta.delimiter };
}

export async function parseFile(file: File): Promise<ParsedFile> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  return parseText(decodeBytes(bytes));
}

export function serializeCsv(table: Table, delimiter = ','): string {
  return Papa.unparse({ fields: table.headers, data: table.rows }, { delimiter, newline: '\r\n' });
}
