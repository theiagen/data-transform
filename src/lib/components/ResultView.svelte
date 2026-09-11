<script lang="ts">
  import { serializeCsv } from '../core/parse';
  import type { MergeConflictPolicy, PresenceFormat, TransformResult } from '../core/types';
  import DataTable from './DataTable.svelte';

  interface Props {
    result: TransformResult;
    fileName: string;
    primaryHeader: string;
    format: PresenceFormat;
    mergeConflicts: MergeConflictPolicy;
    onedit: () => void;
    onreset: () => void;
  }

  let { result, fileName, primaryHeader, format, mergeConflicts, onedit, onreset }: Props = $props();

  const PRESENT: Record<PresenceFormat, string> = { binary: '1', boolean: 'true', yesno: 'yes' };
  const highlight = $derived(new Set(result.newColumns));
  const outputName = $derived(`${fileName.replace(/\.[^.]+$/, '') || 'table'}_presence.csv`);
  let downloaded = $state(false);

  function download() {
    const csv = serializeCsv(result.table);
    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = outputName;
    link.click();
    URL.revokeObjectURL(url);
    downloaded = true;
  }
</script>

<div class="result">
  <div class="summary">
    <div class="stats">
      <span><strong>{result.table.rows.length}</strong> rows</span>
      <span><strong>{result.table.headers.length}</strong> columns</span>
      <span class="new"><strong>{result.newColumns.length}</strong> new presence columns</span>
      {#if result.mergedIds > 0}
        <span><strong>{result.mergedIds}</strong> {result.mergedIds === 1 ? 'sample ID' : 'sample IDs'} merged</span>
      {/if}
    </div>
    <div class="buttons">
      <button type="button" class="primary" onclick={download}>Download {outputName}</button>
      <button type="button" class="ghost" onclick={onedit}>Change settings</button>
      <button type="button" class="ghost" onclick={onreset}>Start over with another file</button>
    </div>
    {#if downloaded}
      <p class="done">Saved to your downloads folder. The file opens directly in Excel or R.</p>
    {/if}
  </div>

  {#if result.conflicts.length > 0}
    <details class="conflicts">
      <summary>
        {result.conflicts.length} merged {result.conflicts.length === 1 ? 'cell' : 'cells'} had different values across rows. {mergeConflicts === 'combine' ? 'They were combined into one cell.' : 'The first non-empty one was kept.'}
      </summary>
      <ul>
        {#each result.conflicts.slice(0, 100) as conflict (conflict.id + conflict.column)}
          <li><code>{conflict.id}</code> in <code>{conflict.column}</code>: {conflict.values.join(' | ')}</li>
        {/each}
        {#if result.conflicts.length > 100}
          <li>and {result.conflicts.length - 100} more</li>
        {/if}
      </ul>
    </details>
  {/if}

  <DataTable table={result.table} {highlight} primary={primaryHeader} presentLabel={PRESENT[format]} />
</div>

<style>
  .result {
    display: grid;
    gap: 1.25rem;
  }
  .summary {
    display: grid;
    gap: 0.9rem;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1.5rem;
    color: var(--ink-soft);
  }
  .stats strong {
    color: var(--ink);
    font-variant-numeric: tabular-nums;
  }
  .stats .new strong {
    color: var(--accent-deep);
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  button {
    padding: 0.7rem 1.2rem;
    border-radius: var(--radius);
    cursor: pointer;
  }
  .primary {
    border: 0;
    background: var(--accent);
    color: #fff;
    font-weight: 600;
  }
  .primary:hover {
    background: var(--accent-deep);
  }
  .ghost {
    border: 1px solid var(--rule);
    background: transparent;
  }
  .ghost:hover {
    border-color: var(--accent);
    color: var(--accent-deep);
  }
  .done {
    padding: 0.5rem 0.85rem;
    border-left: 3px solid var(--good);
    border-radius: 0 var(--radius) var(--radius) 0;
    background: var(--good-tint);
    color: var(--good);
    font-size: 0.9rem;
  }
  .conflicts {
    padding: 0.7rem 0.9rem;
    border-left: 3px solid var(--warn);
    border-radius: 0 var(--radius) var(--radius) 0;
    background: var(--warn-tint);
    font-size: 0.9rem;
  }
  .conflicts summary {
    cursor: pointer;
    color: var(--warn);
    font-weight: 600;
  }
  .conflicts ul {
    margin: 0.5rem 0 0;
    padding-left: 1.2rem;
    max-height: 12rem;
    overflow: auto;
  }
  code {
    font-family: var(--font-data);
    font-size: 0.85em;
  }
</style>
