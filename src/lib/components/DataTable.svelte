<script lang="ts">
  import type { Table } from '../core/types';

  interface Props {
    table: Table;
    highlight?: ReadonlySet<string>;
    primary?: string;
    presentLabel?: string;
    initialRows?: number;
  }

  let { table, highlight = new Set(), primary = '', presentLabel = '', initialRows = 25 }: Props = $props();
  let extraRows = $state(0);
  const limit = $derived(initialRows + extraRows);
  const visible = $derived(table.rows.slice(0, limit));
  const remaining = $derived(table.rows.length - visible.length);

  function isPresent(header: string, cell: string) {
    return highlight.has(header) && cell === presentLabel;
  }
</script>

<div class="scroller">
  <table>
    <thead>
      <tr>
        {#each table.headers as header (header)}
          <th class:new={highlight.has(header)} class:primary={header === primary}>{header}</th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each visible as row, r (r)}
        <tr>
          {#each row as cell, c (c)}
            <td class:new={highlight.has(table.headers[c])} class:present={isPresent(table.headers[c], cell)} class:primary={table.headers[c] === primary}>{cell}</td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{#if remaining > 0}
  <button class="more" type="button" onclick={() => (extraRows += 200)}>Show more rows ({remaining} hidden)</button>
{/if}

<style>
  .scroller {
    overflow: auto;
    max-height: 60vh;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: #fff;
  }
  table {
    border-collapse: separate;
    border-spacing: 0;
    font-family: var(--font-data);
    font-size: 0.8rem;
    white-space: nowrap;
  }
  th,
  td {
    padding: 0.4rem 0.65rem;
    border-bottom: 1px solid var(--rule);
    border-right: 1px solid var(--paper-deep);
    text-align: left;
    max-width: 28ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  th {
    position: sticky;
    top: 0;
    background: var(--paper-deep);
    font-weight: 600;
    z-index: 1;
  }
  th.new {
    background: var(--accent-tint-strong);
    color: var(--accent-deep);
  }
  td.new {
    background: var(--accent-tint);
    color: var(--ink-mute);
    text-align: center;
  }
  td.present {
    background: var(--good);
    color: #fff;
    font-weight: 600;
  }
  .primary {
    position: sticky;
    left: 0;
    z-index: 2;
    background: var(--paper-deep);
    font-weight: 600;
  }
  th.primary {
    z-index: 3;
  }
  .more {
    margin-top: 0.6rem;
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: #fff;
    cursor: pointer;
  }
  .more:hover {
    border-color: var(--accent);
  }
</style>
