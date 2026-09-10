<script lang="ts">
  import ColumnSetup from './lib/components/ColumnSetup.svelte';
  import FileDrop from './lib/components/FileDrop.svelte';
  import ResultView from './lib/components/ResultView.svelte';
  import { guessPrimaryColumn, guessValueColumn } from './lib/core/guess';
  import { parseFile, type ParsedFile } from './lib/core/parse';
  import { detectSeparator } from './lib/core/separator';
  import { transform } from './lib/core/transform';
  import type { TransformOptions, TransformResult } from './lib/core/types';

  type Stage = 'load' | 'setup' | 'result';

  let stage = $state<Stage>('load');
  let fileName = $state('');
  let parsed = $state<ParsedFile | null>(null);
  let loadError = $state('');
  let options = $state<TransformOptions>(defaultOptions());
  let result = $state<TransformResult | null>(null);

  function defaultOptions(): TransformOptions {
    return {
      primaryColumn: 0,
      valueColumn: 1,
      separator: ';',
      format: 'binary',
      keepOriginal: false,
      mergeDuplicates: false,
      columnPrefix: '',
      order: 'alpha',
      excludedValues: new Set(),
    };
  }

  async function loadFile(file: File) {
    loadError = '';
    try {
      const next = await parseFile(file);
      if (next.table.headers.length < 2) {
        loadError = 'This file has fewer than two columns. It needs at least a sample ID column and a column to split.';
        return;
      }
      if (next.table.rows.length === 0) {
        loadError = 'This file has a header row but no data rows.';
        return;
      }
      const primaryColumn = guessPrimaryColumn(next.table);
      const valueColumn = guessValueColumn(next.table, primaryColumn);
      const separator = detectSeparator(next.table.rows.map((row) => row[valueColumn] ?? ''));
      parsed = next;
      fileName = file.name;
      options = { ...defaultOptions(), primaryColumn, valueColumn, separator };
      result = null;
      stage = 'setup';
    } catch (error) {
      loadError = `Could not read the file: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  function run() {
    if (!parsed) return;
    result = transform(parsed.table, options);
    stage = 'result';
  }

  function reset() {
    stage = 'load';
    parsed = null;
    result = null;
    fileName = '';
    loadError = '';
  }

  const year = new Date().getFullYear();
  const delimiterName = $derived(parsed?.delimiter === '\t' ? 'tab-separated' : parsed?.delimiter === ';' ? 'semicolon-separated' : 'comma-separated');
</script>

<main>
  <header>
    <a class="brand" href="https://theiagen.com/" target="_blank" rel="noopener">
      <img src="/theiagen-logo.svg" alt="Theiagen Genomics" width="1026" height="253" />
    </a>
    <h1>Data Transform</h1>
    <p class="tagline">
      Turn a column that lists several values per sample, such as AMR genes, into one column per value marked present or absent.
      Everything runs in your browser. The file never leaves your computer.
    </p>
  </header>

  <ol class="steps">
    <li class="step" class:active={stage === 'load'} class:done={stage !== 'load'}>
      <div class="step-head">
        <h2>Load a file</h2>
        {#if parsed}
          <p class="step-summary">
            <strong>{fileName}</strong>, {delimiterName}, {parsed.table.rows.length} rows and {parsed.table.headers.length} columns.
            <button type="button" class="link" onclick={reset}>Use a different file</button>
          </p>
        {/if}
      </div>
      {#if stage === 'load'}
        <FileDrop onfile={loadFile} error={loadError} />
        <p class="aside">Works with CSV and TSV exports from Excel, LIMS systems, and typing tools. The first row must contain column names.</p>
      {/if}
    </li>

    <li class="step" class:active={stage === 'setup'} class:done={stage === 'result'} class:pending={stage === 'load'}>
      <div class="step-head">
        <h2>Choose what to split</h2>
        {#if stage === 'result' && parsed}
          <p class="step-summary">
            Split <strong>{parsed.table.headers[options.valueColumn]}</strong> by sample <strong>{parsed.table.headers[options.primaryColumn]}</strong>.
            <button type="button" class="link" onclick={() => (stage = 'setup')}>Change settings</button>
          </p>
        {/if}
      </div>
      {#if stage === 'setup' && parsed}
        <ColumnSetup table={parsed.table} bind:options onrun={run} />
      {/if}
    </li>

    <li class="step" class:active={stage === 'result'} class:pending={stage !== 'result'}>
      <div class="step-head">
        <h2>Check and download</h2>
      </div>
      {#if stage === 'result' && result && parsed}
        <ResultView {result} {fileName} primaryHeader={parsed.table.headers[options.primaryColumn]} format={options.format} onedit={() => (stage = 'setup')} onreset={reset} />
      {/if}
    </li>
  </ol>

  <footer>
    <p>
      Values are split on the separator, trimmed, and de-duplicated within a cell. Every other column is copied through unchanged.
      Large files are fine. There is no upload, no server, and nothing is stored after you close the tab.
    </p>
    <p class="copyright">
      <img src="/theiagen-logo.svg" alt="" width="1026" height="253" />
      <span>Theiagen Genomics © {year}. All Rights Reserved.</span>
    </p>
  </footer>
</main>

<style>
  main {
    max-width: 1120px;
    margin: 0 auto;
    padding: 2.5rem 1.5rem 4rem;
  }
  header {
    max-width: var(--measure);
    margin-bottom: 2.5rem;
  }
  .brand {
    display: inline-block;
    margin-bottom: 1.5rem;
  }
  .brand img {
    display: block;
    width: auto;
    height: 3rem;
  }
  h1 {
    font-size: 2.1rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.1;
    margin-bottom: 0.75rem;
  }
  .tagline {
    color: var(--ink-soft);
    font-size: 1.05rem;
  }
  .steps {
    list-style: none;
    margin: 0;
    padding: 0;
    counter-reset: step;
  }
  .step {
    position: relative;
    padding: 1.5rem 0 1.5rem 3.25rem;
    border-top: 1px solid var(--rule);
    counter-increment: step;
  }
  .step::before {
    content: counter(step);
    position: absolute;
    left: 0;
    top: 1.35rem;
    width: 2rem;
    height: 2rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    border: 1.5px solid var(--rule);
    background: var(--paper);
    color: var(--ink-mute);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .step.active::before {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .step.done::before {
    content: '✓';
    background: var(--accent-tint);
    border-color: var(--accent-tint-strong);
    color: var(--accent-deep);
  }
  .step.pending {
    color: var(--ink-mute);
  }
  .step-head {
    display: grid;
    gap: 0.25rem;
    margin-bottom: 1rem;
  }
  .step-head h2 {
    font-size: 1.25rem;
    font-weight: 600;
  }
  .step.pending .step-head {
    margin-bottom: 0;
  }
  .step-summary {
    color: var(--ink-soft);
    overflow-wrap: anywhere;
  }
  .step-summary strong {
    color: var(--ink);
  }
  .link {
    margin-left: 0.4rem;
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .aside {
    margin-top: 0.9rem;
    color: var(--ink-soft);
    font-size: 0.9rem;
    max-width: var(--measure);
  }
  footer {
    margin-top: 3rem;
    padding-top: 1.25rem;
    border-top: 1px solid var(--rule);
    color: var(--ink-mute);
    font-size: 0.85rem;
    max-width: var(--measure);
  }
  .copyright {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 1.25rem;
    flex-wrap: wrap;
  }
  .copyright img {
    width: auto;
    height: 1.6rem;
    opacity: 0.85;
  }
  @media (max-width: 600px) {
    main {
      padding: 1.5rem 1rem 3rem;
    }
    .step {
      padding-left: 2.6rem;
    }
    h1 {
      font-size: 1.7rem;
    }
  }
</style>
