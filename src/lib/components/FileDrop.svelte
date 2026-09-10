<script lang="ts">
  interface Props {
    onfile: (file: File) => void;
    error?: string;
  }

  let { onfile, error = '' }: Props = $props();
  let dragging = $state(false);
  let input: HTMLInputElement;

  function accept(list: FileList | null) {
    const file = list?.[0];
    if (file) onfile(file);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    dragging = false;
    accept(event.dataTransfer?.files ?? null);
  }
</script>

<div
  class="drop"
  class:dragging
  role="button"
  tabindex="0"
  aria-label="Choose a CSV or TSV file"
  ondragover={(e) => {
    e.preventDefault();
    dragging = true;
  }}
  ondragleave={() => (dragging = false)}
  ondrop={onDrop}
  onclick={() => input.click()}
  onkeydown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      input.click();
    }
  }}
>
  <svg class="glyph" viewBox="0 0 48 48" aria-hidden="true">
    <rect x="6" y="10" width="36" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="2" />
    <line x1="6" y1="19" x2="42" y2="19" stroke="currentColor" stroke-width="2" />
    <line x1="18" y1="19" x2="18" y2="38" stroke="currentColor" stroke-width="2" />
    <line x1="30" y1="19" x2="30" y2="38" stroke="currentColor" stroke-width="2" />
  </svg>
  <p class="lead">Drop a CSV or TSV file here, or click to choose one</p>
  <p class="hint">The file is read by your browser only. Nothing is uploaded.</p>
  <input bind:this={input} type="file" accept=".csv,.tsv,.txt,text/csv,text/tab-separated-values" hidden onchange={(e) => accept(e.currentTarget.files)} />
</div>
{#if error}
  <p class="error" role="alert">{error}</p>
{/if}

<style>
  .drop {
    display: grid;
    justify-items: center;
    gap: 0.4rem;
    padding: 2.75rem 1.5rem;
    border: 1.5px dashed var(--rule);
    border-radius: var(--radius);
    background: var(--paper-deep);
    color: var(--ink-soft);
    cursor: pointer;
    text-align: center;
    transition: border-color 120ms, background 120ms;
  }
  .drop:hover,
  .drop.dragging {
    border-color: var(--accent);
    background: var(--accent-tint);
    color: var(--accent-deep);
  }
  .glyph {
    width: 44px;
    height: 44px;
    margin-bottom: 0.4rem;
  }
  .lead {
    font-weight: 600;
    color: var(--ink);
  }
  .hint {
    font-size: 0.9rem;
  }
  .error {
    margin-top: 0.75rem;
    padding: 0.6rem 0.85rem;
    border-left: 3px solid var(--warn);
    background: var(--warn-tint);
    color: var(--warn);
    border-radius: 0 var(--radius) var(--radius) 0;
  }
</style>
