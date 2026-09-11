# Data Transform

https://theiagen.github.io/data-transform/

Turn a spreadsheet column that lists several values per sample, such as AMR genes, into one column per value marked present or absent. Runs entirely in the browser. The file never leaves your computer.

## What it does

Given a CSV or TSV like this:

| Sample_ID | Species | AMR_genes |
|---|---|---|
| S001 | K. pneumoniae | blaKPC-2; blaSHV-11; tet(A) |
| S002 | E. coli | blaCTX-M-15 |

you get this:

| Sample_ID | Species | blaCTX-M-15 | blaKPC-2 | blaSHV-11 | tet(A) |
|---|---|---|---|---|---|
| S001 | K. pneumoniae | 0 | 1 | 1 | 1 |
| S002 | E. coli | 1 | 0 | 0 | 0 |

Every other column is copied through unchanged.

## Features

- Drag and drop CSV or TSV files. Delimiter, encoding, and byte-order mark are detected automatically.
- The sample ID column, the column to split, and the value separator are guessed and can be changed.
- Untick values you do not want as columns. Choose `1/0`, `true/false`, or `yes/no`.
- Order the new columns alphabetically, by frequency, or by first appearance, and add an optional prefix.
- Keep or drop the original list column.
- Detect duplicate sample IDs and optionally merge them into one row, with conflicts reported.
- Preview the result and download it as a UTF-8 CSV that opens cleanly in Excel.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL. Try `samples/example_amr_genes.csv`, or press "Load an example file" in the app. Sample `S010`
appears on two rows with one gene each, the way some typing tools export. Tick "Merge rows" to get one row with both genes marked present and `blaOXA-23; blaOXA-72`
in the original column.

## Build and deploy

```bash
npm run build
```

The `dist/` folder is a static site with relative asset paths, so it can be served from any web server or sub-path, or opened from a local folder. No backend is needed.

Every push to `main` is built and published to GitHub Pages at https://theiagen.github.io/data-transform/ by the workflow in `.github/workflows/deploy.yml`.

## Develop

```bash
npm test          # unit tests for the parsing and transform logic
npm run check     # type-check Svelte and TypeScript
```

## License

GPL-3.0-or-later. See `LICENSE`.

Copyright Theiagen Genomics.
