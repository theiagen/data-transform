import { describe, expect, it } from 'vitest';
import { detectSeparator, SEPARATOR_CHOICES } from './separator';

describe('detectSeparator', () => {
  it('picks the candidate that appears in the most cells', () => {
    expect(detectSeparator(['a;b', 'c;d;e', 'f'])).toBe(';');
    expect(detectSeparator(['a|b', 'c, d|e', 'f|g'])).toBe('|');
  });
  it('falls back to comma when nothing splits', () => {
    expect(detectSeparator(['a', 'b', ''])).toBe(',');
  });
  it('exposes the candidates in a stable order', () => {
    expect(SEPARATOR_CHOICES.map((c) => c.value)).toEqual([';', ',', '|', '/', ' ']);
  });
});
