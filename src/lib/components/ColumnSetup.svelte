<script lang="ts">
  import { duplicateIdCount } from '../core/guess';
  import { detectSeparator, SEPARATOR_CHOICES } from '../core/separator';
  import { collectValues, orderValues, splitCell } from '../core/transform';
  import type { PresenceFormat, Table, TransformOptions } from '../core/types';

  interface Props {
    table: Table;
    options: TransformOptions;
    onrun: () => void;
  }

  let { table, options = $bindable(), onrun }: Props = $props();

  const CUSTOM = '__custom__';
  const FORMATS: { value: PresenceFormat; label: string; sample: string }[] = [
    { value: 'binary', label: '1 and 0', sample: '1 / 0' },
    { value: 'boolean', label: 'true and false', sample: 'true / false' },
    { value: 'yesno', label: 'yes and no', sample: 'yes / no' },
  ];
  const MANY_COLUMNS = 150;

  const initialSeparator = options.separator;
  const initialIsPreset = SEPARATOR_CHOICES.some((c) => c.value === initialSeparator);
  let separatorChoice = $state(initialIsPreset ? initialSeparator : CUSTOM);
  let customSeparator = $state(initialIsPreset ? '' : initialSeparator);
  let filter = $state('');

  const counts = $derived(collectValues(table, options.valueColumn, options.separator));
  const allValues = $derived(orderValues(counts, { order: options.order, excludedValues: new Set() }));
  const selectedCount = $derived(allValues.filter((v) => !options.excludedValues.has(v)).length);
  const shownValues = $derived(filter ? allValues.filter((v) => v.toLowerCase().includes(filter.toLowerCase())) : allValues);
  const duplicates = $derived(duplicateIdCount(table, options.primaryColumn));
  const cellsWithValues = $derived(table.rows.filter((row) => splitCell(row[options.valueColumn] ?? '', options.separator).length > 0).length);
  const sameColumn = $derived(options.primaryColumn === options.valueColumn);
  const canRun = $derived(!sameColumn && selectedCount > 0 && options.separator !== '');

  const previewRow = $derived.by(() => {
    const multi = table.rows.find((row) => splitCell(row[options.valueColumn] ?? '', options.separator).length > 1);
    return multi ?? table.rows.find((row) => (row[options.valueColumn] ?? '').trim() !== '') ?? table.rows[0];
  });
  const previewValues = $derived(new Set(splitCell(previewRow?.[options.valueColumn] ?? '', options.separator)));
  const previewColumns = $derived(allValues.filter((v) => !options.excludedValues.has(v)).slice(0, 8));
  const presentLabel = $derived(FORMATS.find((f) => f.value === options.format)?.sample.split(' / ') ?? ['1', '0']);

  function onValueColumnChange() {
    const cells = table.rows.map((row) => row[options.valueColumn] ?? '');
    const detected = detectSeparator(cells);
    separatorChoice = detected;
    options.separator = detected;
    options.excludedValues = new Set();
  }

  function onSeparatorChoice() {
    options.separator = separatorChoice === CUSTOM ? customSeparator : separatorChoice;
    options.excludedValues = new Set();
  }

  function toggleValue(value: string, include: boolean) {
    const next = new Set(options.excludedValues);
    if (include) next.delete(value);
    else next.add(value);
    options.excludedValues = next;
  }

  function setAll(include: boolean) {
    options.excludedValues = include ? new Set() : new Set(allValues);
  }

  function percent(n: number) {
    return table.rows.length ? Math.round((n / table.rows.length) * 100) : 0;
  }
</script>

<div class="setup">
  <div class="field-row">
    <label class="field">
      <span class="label">Sample ID column</span>
      <select bind:value={options.primaryColumn}>
        {#each table.headers as header, i (i)}
          <option value={i}>{header}</option>
        {/each}
      </select>
      <span class="help">One row per sample. Used to spot and merge duplicates.</span>
    </label>

    <label class="field">
      <span class="label">Column to split</span>
      <select bind:value={options.valueColumn} onchange={onValueColumnChange}>
        {#each table.headers as header, i (i)}
          <option value={i}>{header}</option>
        {/each}
      </select>
      <span class="help">The cell that lists several values, for example AMR genes.</span>
    </label>

    <div class="field">
      <label class="label" for="sep">Values are separated by</label>
      <div class="inline">
        <select id="sep" bind:value={separatorChoice} onchange={onSeparatorChoice}>
          {#each SEPARATOR_CHOICES as choice (choice.value)}
            <option value={choice.value}>{choice.label}</option>
          {/each}
          <option value={CUSTOM}>Something else</option>
        </select>
        {#if separatorChoice === CUSTOM}
          <input class="custom" type="text" bind:value={customSeparator} oninput={onSeparatorChoice} placeholder="e.g. ::" aria-label="Custom separator" />
        {/if}
      </div>
      <span class="help">Detected automatically. Change it if the value list below looks wrong.</span>
    </div>
  </div>

  {#if sameColumn}
    <p class="notice warn" role="alert">The sample ID column and the column to split must be different.</p>
  {/if}

  <section class="values">
    <div class="values-head">
      <h3>
        {allValues.length} unique {allValues.length === 1 ? 'value' : 'values'} found in
        {cellsWithValues} of {table.rows.length} rows
      </h3>
      <div class="values-tools">
        {#if allValues.length > 12}
          <input type="search" placeholder="Filter values" bind:value={filter} aria-label="Filter values" />
        {/if}
        <button type="button" class="link" onclick={() => setAll(true)}>Select all</button>
        <button type="button" class="link" onclick={() => setAll(false)}>Clear</button>
      </div>
    </div>
    <p class="help">Each ticked value becomes its own column. Untick anything that is not a real value, such as “none” or “NA”.</p>

    {#if allValues.length === 0}
      <p class="notice warn">No values found. Check the separator, or pick a different column.</p>
    {:else}
      <ul class="value-list" role="list">
        {#each shownValues as value (value)}
          {@const n = counts.get(value) ?? 0}
          <li>
            <label class="value">
              <input type="checkbox" checked={!options.excludedValues.has(value)} onchange={(e) => toggleValue(value, e.currentTarget.checked)} />
              <span class="value-name">{value}</span>
              <span class="value-count" title="{n} rows ({percent(n)}%)">{n}</span>
              <span class="bar" style="--w: {percent(n)}%"></span>
            </label>
          </li>
        {/each}
      </ul>
      {#if allValues.length >= MANY_COLUMNS}
        <p class="notice warn">
          This will add {selectedCount} columns. That is fine, but if you expected fewer, the separator may be wrong.
        </p>
      {/if}
    {/if}
  </section>

  <div class="field-row">
    <fieldset class="field">
      <legend class="label">Mark presence as</legend>
      <div class="radios">
        {#each FORMATS as format (format.value)}
          <label class="radio">
            <input type="radio" name="format" value={format.value} bind:group={options.format} />
            {format.label}
          </label>
        {/each}
      </div>
    </fieldset>

    <label class="field">
      <span class="label">Order new columns</span>
      <select bind:value={options.order}>
        <option value="alpha">Alphabetically</option>
        <option value="frequency">Most common first</option>
        <option value="appearance">As first seen in the file</option>
      </select>
    </label>

    <label class="field">
      <span class="label">Prefix for new column names</span>
      <input type="text" bind:value={options.columnPrefix} placeholder="optional, e.g. gene_" />
      <span class="help">Helps when a value looks like a number or clashes with an existing column.</span>
    </label>
  </div>

  <div class="checks">
    <label class="check">
      <input type="checkbox" bind:checked={options.keepOriginal} />
      <span>Keep the original “{table.headers[options.valueColumn]}” column too</span>
    </label>
    <label class="check" class:attention={duplicates > 0}>
      <input type="checkbox" bind:checked={options.mergeDuplicates} disabled={duplicates === 0} />
      <span>
        Merge rows that share the same sample ID
        {#if duplicates > 0}
          <span class="badge">{duplicates} {duplicates === 1 ? 'ID appears' : 'IDs appear'} more than once</span>
        {:else}
          <span class="help">All sample IDs are unique, so there is nothing to merge.</span>
        {/if}
      </span>
    </label>
    {#if duplicates > 0 && options.mergeDuplicates}
      <p class="help indent">Merged rows keep every value listed on any of them. Other columns take the first non-empty entry, and you will be told if they disagreed.</p>
    {/if}
  </div>

  {#if previewRow && previewColumns.length > 0}
    <section class="preview" aria-label="Preview of one row">
      <p class="preview-title">What happens to one row</p>
      <div class="preview-flow">
        <div class="cell before">
          <span class="cell-head">{table.headers[options.valueColumn]}</span>
          <span class="cell-body">{previewRow[options.valueColumn] || '(empty)'}</span>
        </div>
        <span class="becomes" aria-hidden="true">becomes</span>
        <div class="after">
          {#each previewColumns as column (column)}
            {@const present = previewValues.has(column)}
            <div class="cell" class:present>
              <span class="cell-head">{options.columnPrefix}{column}</span>
              <span class="cell-body">{present ? presentLabel[0] : presentLabel[1]}</span>
            </div>
          {/each}
          {#if selectedCount > previewColumns.length}
            <span class="more">+{selectedCount - previewColumns.length} more</span>
          {/if}
        </div>
      </div>
    </section>
  {/if}

  <div class="actions">
    <button type="button" class="primary" disabled={!canRun} onclick={onrun}>
      Transform {table.rows.length} rows into {selectedCount} presence {selectedCount === 1 ? 'column' : 'columns'}
    </button>
  </div>
</div>

<style>
  .setup {
    display: grid;
    gap: 1.6rem;
  }
  .field-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1.25rem;
  }
  .field {
    display: grid;
    gap: 0.35rem;
    align-content: start;
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .label {
    font-weight: 600;
  }
  .help {
    font-size: 0.85rem;
    color: var(--ink-soft);
  }
  .indent {
    margin-left: 1.6rem;
  }
  select,
  input[type='text'],
  input[type='search'] {
    width: 100%;
    padding: 0.5rem 0.6rem;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: #fff;
  }
  select:focus,
  input:focus {
    border-color: var(--accent);
  }
  .inline {
    display: flex;
    gap: 0.5rem;
  }
  .custom {
    max-width: 8ch;
    font-family: var(--font-data);
  }
  .radios {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    padding-top: 0.25rem;
  }
  .radio,
  .value {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }
  .checks {
    display: grid;
    gap: 0.6rem;
  }
  .check {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: start;
    gap: 0.5rem;
    cursor: pointer;
  }
  .check input {
    margin-top: 0.25rem;
  }
  .check .badge {
    margin-left: 0.4rem;
  }
  .attention {
    color: var(--accent-deep);
  }
  .badge {
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
    background: var(--warn-tint);
    color: var(--warn);
    font-size: 0.8rem;
    font-weight: 600;
  }
  input[type='checkbox'],
  input[type='radio'] {
    accent-color: var(--accent);
    width: 1rem;
    height: 1rem;
  }

  .values {
    display: grid;
    gap: 0.5rem;
    padding: 1rem 1.1rem;
    border: 1px solid var(--rule);
    border-radius: var(--radius);
    background: #fff;
  }
  .values-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1rem;
  }
  .values h3 {
    font-size: 1rem;
    font-weight: 600;
  }
  .values-tools {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .values-tools input {
    width: 14ch;
    padding: 0.3rem 0.5rem;
  }
  .link {
    padding: 0;
    border: 0;
    background: none;
    color: var(--accent);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .value-list {
    list-style: none;
    margin: 0.25rem 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
    gap: 0.25rem 1.25rem;
    max-height: 18rem;
    overflow: auto;
  }
  .value {
    position: relative;
    padding: 0.3rem 0.4rem;
    border-radius: 4px;
    isolation: isolate;
  }
  .value:hover {
    background: var(--paper-deep);
  }
  .value-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--font-data);
    font-size: 0.85rem;
  }
  .value-count {
    font-size: 0.8rem;
    color: var(--ink-soft);
    font-variant-numeric: tabular-nums;
  }
  .bar {
    position: absolute;
    inset: 0 auto 0 0;
    width: var(--w);
    border-radius: 4px;
    background: var(--accent-tint);
    z-index: -1;
  }

  .preview {
    padding: 1.1rem 1.25rem;
    border-radius: var(--radius);
    background: var(--ink);
    color: var(--paper);
  }
  .preview-title {
    font-size: 0.85rem;
    color: var(--ink-mute);
    margin-bottom: 0.75rem;
  }
  .preview-flow {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.75rem;
  }
  .becomes {
    font-style: italic;
    color: var(--ink-mute);
  }
  .after {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .cell {
    display: grid;
    min-width: 4ch;
    border-radius: 4px;
    overflow: hidden;
    border: 1px solid #2e4256;
    font-family: var(--font-data);
    font-size: 0.8rem;
  }
  .cell-head {
    padding: 0.2rem 0.55rem;
    background: #1c2a38;
    color: var(--ink-mute);
    max-width: 22ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cell-body {
    padding: 0.35rem 0.55rem;
    text-align: center;
    max-width: 40ch;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .before .cell-body {
    text-align: left;
  }
  .cell.present {
    border-color: var(--good);
  }
  .cell.present .cell-head {
    background: var(--good-deep);
    color: var(--good-tint);
  }
  .cell.present .cell-body {
    background: var(--good);
    color: #fff;
    font-weight: 600;
  }
  .more {
    font-size: 0.85rem;
    color: var(--ink-mute);
  }

  .notice {
    padding: 0.6rem 0.85rem;
    border-left: 3px solid var(--warn);
    border-radius: 0 var(--radius) var(--radius) 0;
    background: var(--warn-tint);
    color: var(--warn);
    font-size: 0.9rem;
  }
  .actions {
    display: flex;
    justify-content: flex-start;
  }
  .primary {
    padding: 0.75rem 1.4rem;
    border: 0;
    border-radius: var(--radius);
    background: var(--accent);
    color: #fff;
    font-weight: 600;
    cursor: pointer;
  }
  .primary:hover:not(:disabled) {
    background: var(--accent-deep);
  }
  .primary:disabled {
    background: var(--rule);
    color: var(--ink-mute);
    cursor: not-allowed;
  }
</style>
