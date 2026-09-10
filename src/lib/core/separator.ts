export interface SeparatorChoice {
  value: string;
  label: string;
}

export const SEPARATOR_CHOICES: readonly SeparatorChoice[] = [
  { value: ';', label: 'Semicolon ;' },
  { value: ',', label: 'Comma ,' },
  { value: '|', label: 'Pipe |' },
  { value: '/', label: 'Slash /' },
  { value: ' ', label: 'Whitespace' },
];

const FALLBACK = ';';

export function detectSeparator(cells: readonly string[]): string {
  let best = FALLBACK;
  let bestHits = 0;
  for (const { value } of SEPARATOR_CHOICES) {
    const hits = cells.filter((cell) => cell.trim().includes(value)).length;
    if (hits > bestHits) {
      best = value;
      bestHits = hits;
    }
  }
  return best;
}
