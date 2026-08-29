# Slovak Professors Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a polished Slovak-language static atlas of presidential professor appointments, with official higher-education context, linked visual analysis, complete person lookup, and transparent methodology.

**Architecture:** A Python/`uv` build-time pipeline validates two committed legacy XLS workbooks and emits one deterministic JSON payload. A React/TypeScript/Vite client loads that payload and performs all filtering, aggregation, SVG rendering, URL synchronization, and CSV export in the browser; GitHub Actions publishes only the static `dist` artifact to GitHub Pages.

**Tech Stack:** Python 3.12+, `uv`, `xlrd`, `pytest`, React 19, TypeScript, Vite, D3 modules (`d3-array`, `d3-geo`, `d3-scale`, `d3-shape`), Vitest, React Testing Library, plain CSS, GitHub Actions/Pages.

**Spec:** `docs/superpowers/specs/2026-08-29-slovak-professors-atlas-design.md`

## Global Constraints

- Every professor field and appointment count must derive from the committed ministry workbook at `https://www.minedu.sk/data/att/41c/36688.d8c1fd.xls`.
- The application must be fully static: no backend, database, CMS, map tiles, or runtime upstream requests.
- Visible product copy, dates, labels, number formatting, methodology, and errors must be Slovak.
- Use React for DOM ownership and D3 only for scales, geometry, shapes, and ticks.
- Preserve all raw source variants while using exactly 41 reviewed duplicate resolutions to produce 2,378 analytical appointments from 2,419 source rows.
- Treat appointments as calendar-year flows and CVTI student/staff counts as 31 October stocks; annotate the 2007 staff-definition break and omit context ratios for 2026.
- Never infer gender, discipline clusters, institutional quality, causality, or a president leaderboard.
- Use self-hosted open-source fonts, WCAG AA contrast, keyboard-equivalent interactions, semantic records, and `prefers-reduced-motion`.
- Store filter state in `URLSearchParams`; reload and Back/Forward must preserve the selected view.
- Use Conventional Commits with explanatory bodies and verify the author, committer, and full message after every commit.

## File structure

### Data and pipeline

- `pyproject.toml`, `uv.lock` — pinned Python pipeline and test environment.
- `scripts/update_data.py` — atomic downloads, checksums, and source review summary.
- `pipeline/models.py` — immutable appointment/context data classes and serialization.
- `pipeline/text.py` — whitespace and search normalization.
- `pipeline/professors.py` — primary workbook schema validation, canonicalization, duplicate resolution, and president assignment.
- `pipeline/context.py` — CVTI workbook parsing and stock/flow indicators.
- `pipeline/build.py` — payload assembly, editorial facts, deterministic JSON output, and CLI.
- `data/config/institutions.json` — canonical institutions, aliases, cities, coordinates, and citation URLs.
- `data/config/presidents.json` — exact term boundaries and official citations.
- `data/config/duplicate-resolutions.json` — 41 retained/secondary source-row pairs with a review note.
- `data/config/slovakia.geojson` — simplified Natural Earth Slovakia geometry.
- `public/data/source/professors.xls` — pinned ministry workbook, also downloadable from the page.
- `public/data/source/higher-education.xls` — pinned CVTI time series, also downloadable.
- `public/data/provenance.json` — source URLs, retrieval date, and expected SHA-256 values.
- `public/data/atlas.json` — deterministic generated client payload.
- `tests/data/` — parser, reconciliation, context, and deterministic-build contracts.

### Client

- `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `index.html` — Vite/React project and scripts.
- `src/main.tsx`, `src/App.tsx` — application bootstrap and section composition.
- `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/components.css` — archival-atlas tokens, base rules, and responsive components.
- `src/data/types.ts`, `src/data/load.ts` — JSON contract and guarded loading.
- `src/analysis/selectors.ts` — pure filtering, aggregation, ranking, and chart-series selectors.
- `src/state/filters.ts`, `src/state/url.ts`, `src/state/useAtlasState.ts` — filter model and browser-history synchronization.
- `src/utils/search.ts`, `src/utils/csv.ts`, `src/utils/format.ts` — accent-insensitive matching, export, and Slovak formatting.
- `src/components/Hero.tsx`, `Findings.tsx`, `ContextSection.tsx`, `ContextTrend.tsx` — story and official context.
- `src/components/AtlasSection.tsx`, `SlovakiaMap.tsx`, `AppointmentTimeline.tsx`, `InstitutionRanking.tsx` — linked centerpiece.
- `src/components/Explorer.tsx`, `RecordList.tsx`, `Methodology.tsx`, `ErrorPanel.tsx` — lookup, source detail, and failures.
- `src/**/*.test.ts(x)` — pure and component behavior contracts.
- `.github/workflows/pages.yml` — test, build, and GitHub Pages deployment.

---

### Task 1: Pin and validate official data sources

**Files:**
- Create: `pyproject.toml`
- Create: `scripts/update_data.py`
- Create: `public/data/provenance.json`
- Create: `public/data/source/professors.xls`
- Create: `public/data/source/higher-education.xls`
- Create: `tests/data/test_update_data.py`
- Modify: `.gitignore`

**Interfaces:**
- Produces: `download_sources(provenance_path: Path, destination: Path) -> list[DownloadedSource]`
- Produces: two committed workbooks whose SHA-256 values match `public/data/provenance.json`.
- Consumes: no earlier implementation tasks.

- [ ] **Step 1: Define the Python environment and acquisition contract**

Create `pyproject.toml` with Python `>=3.12`, runtime dependency `xlrd>=2.0.2,<3`, and development dependency `pytest>=8.3,<9`. Configure pytest with `testpaths = ["tests"]` and `pythonpath = ["."]`.

- [ ] **Step 2: Write the failing atomic-download tests**

In `tests/data/test_update_data.py`, mock `urllib.request.urlopen` and assert that `download_sources()`:

```python
assert [item.name for item in result] == ["professors", "higher_education"]
assert result[0].sha256 == hashlib.sha256(PROFESSOR_BYTES).hexdigest()
assert (tmp_path / "source" / "professors.xls").read_bytes() == PROFESSOR_BYTES
```

Add a second test where the expected checksum is wrong and assert `SourceIntegrityError` while the prior destination file remains unchanged.

- [ ] **Step 3: Run the acquisition tests and verify failure**

Run: `uv run pytest tests/data/test_update_data.py -q`
Expected: FAIL because `scripts.update_data` does not exist.

- [ ] **Step 4: Implement atomic source acquisition**

Implement frozen `DownloadedSource(name, url, sha256, size)` and `SourceIntegrityError`. Download to a sibling temporary file, calculate SHA-256 while writing, compare with the provenance expectation when present, and `Path.replace()` only after validation. Use these exact source keys and destinations:

```python
SOURCE_DESTINATIONS = {
    "professors": "professors.xls",
    "higher_education": "higher-education.xls",
}
```

The CLI accepts `--accept-new-checksums`; without it, changed upstream content fails. With it, update the checksum and `retrievedOn` date, then print old/new hash, byte size, and destination for review.

- [ ] **Step 5: Run acquisition tests and download pinned files**

Run: `uv run pytest tests/data/test_update_data.py -q`
Expected: PASS.

Run: `uv run python scripts/update_data.py --accept-new-checksums`
Expected: two files downloaded; professor hash `0730645d...69b5d`; CVTI hash `def7a52f...59e`.

- [ ] **Step 6: Lock dependencies and verify source bytes**

Run: `uv lock`
Run: `sha256sum public/data/source/professors.xls public/data/source/higher-education.xls`
Expected: hashes equal `public/data/provenance.json`.

- [ ] **Step 7: Commit the source contract**

Stage only the files named in this task, inspect `git diff --staged --name-only` and `git diff --staged`, then commit:

```bash
git commit -F - <<'EOF'
chore: pin official atlas sources

Previously the atlas had no reproducible source inputs; this commit pins
the ministry and CVTI workbooks behind verified acquisition metadata.
Updates now fail safely unless checksum changes are explicitly accepted.

- Add atomic source download and integrity checks
- Commit the two official XLS inputs and provenance
- Pin the Python data-pipeline environment
EOF
```

Verify with `git show -s --format='%H%n%an <%ae>%n%cn <%ce>%n%n%B' HEAD`.

### Task 2: Build the appointment reconciliation pipeline

**Files:**
- Create: `pipeline/__init__.py`
- Create: `pipeline/models.py`
- Create: `pipeline/text.py`
- Create: `pipeline/professors.py`
- Create: `data/config/institutions.json`
- Create: `data/config/presidents.json`
- Create: `data/config/duplicate-resolutions.json`
- Create: `tests/data/test_professors.py`
- Create: `tests/data/test_text.py`

**Interfaces:**
- Consumes: `public/data/source/professors.xls` from Task 1.
- Produces: `load_appointments(...) -> ProfessorDataset`.
- Produces model fields: `Appointment(id, name, titles_before, titles_after, faculty, institution_id, institution_source, field, appointed_on, president_id, source_variants)`.
- Produces: `normalize_display(value: object) -> str` and `normalize_search(value: str) -> str`.

- [ ] **Step 1: Write text-normalization tests**

Assert that non-breaking spaces and repeated whitespace collapse for display, while search removes accents and case distinctions:

```python
assert normalize_display(" doc.\u00a0  RNDr. ") == "doc. RNDr."
assert normalize_search("Ľubomír Šoltés") == "lubomir soltes"
```

- [ ] **Step 2: Write workbook schema and pinned-count tests**

In `tests/data/test_professors.py`, assert exact sheet/header validation, date conversion, canonical institution coverage, one-president assignment, and:

```python
assert dataset.source_row_count == 2419
assert dataset.duplicate_source_row_count == 41
assert len(dataset.appointments) == 2378
assert dataset.date_min.isoformat() == "2000-02-22"
assert dataset.date_max.isoformat() == "2026-06-03"
assert len({item.appointed_on for item in dataset.appointments}) == 67
```

Add a synthetic collision not listed in resolutions and assert `UnreviewedDuplicateError`.

- [ ] **Step 3: Run appointment tests and verify failure**

Run: `uv run pytest tests/data/test_text.py tests/data/test_professors.py -q`
Expected: FAIL because pipeline modules/config do not exist.

- [ ] **Step 4: Add explicit institution and president metadata**

Populate `institutions.json` with 22 canonical institutions. Each entry has `id`, `shortName`, `fullName`, `city`, `latitude`, `longitude`, `sourceLabels`, and `citationUrl`. Cover all 32 normalized source labels, including DTI and historical acronym variants.

Populate `presidents.json` with half-open terms:

```json
{"id":"schuster","name":"Rudolf Schuster","from":"1999-06-15","to":"2004-06-15"}
{"id":"gasparovic","name":"Ivan Gašparovič","from":"2004-06-15","to":"2014-06-15"}
{"id":"kiska","name":"Andrej Kiska","from":"2014-06-15","to":"2019-06-15"}
{"id":"caputova","name":"Zuzana Čaputová","from":"2019-06-15","to":"2024-06-15"}
{"id":"pellegrini","name":"Peter Pellegrini","from":"2024-06-15","to":null}
```

Populate `duplicate-resolutions.json` with all 41 reviewed pairs. Each object stores `primaryRow`, `secondaryRow`, `normalizedName`, `date`, and `reason`.

- [ ] **Step 5: Implement immutable models and normalization**

Use frozen dataclasses in `models.py`. Preserve each source variant as `SourceVariant(row_number, titles_before, titles_after, faculty, institution, field)`. Generate stable appointment IDs from the first 12 hexadecimal characters of SHA-256 over normalized name plus ISO date, and fail on ID collision.

- [ ] **Step 6: Implement strict workbook reconciliation**

Validate sheet names and eight exact headers. Build source-row objects, resolve reviewed duplicates only, merge their variants, canonicalize institution labels, and assign exactly one presidential term. Keep the primary variant as the displayed record while retaining every secondary variant.

- [ ] **Step 7: Run appointment tests and inspect reconciliation summary**

Run: `uv run pytest tests/data/test_text.py tests/data/test_professors.py -q`
Expected: PASS.

Run: `uv run python -m pipeline.professors public/data/source/professors.xls`
Expected summary: `2419 source rows -> 2378 appointments; 41 reviewed duplicate rows; 22 institutions; 67 appointment dates`.

- [ ] **Step 8: Commit appointment reconciliation**

Use the repository-safe staged-diff and commit-message workflow. Commit subject: `feat: reconcile professor appointments`. The body must diagnose duplicate/institution inconsistency and list strict schema validation, reviewed resolutions, and presidential assignment. Verify the full commit message afterward.

### Task 3: Parse context and generate deterministic atlas data

**Files:**
- Create: `pipeline/context.py`
- Create: `pipeline/build.py`
- Create: `data/config/slovakia.geojson`
- Create: `public/data/atlas.json`
- Create: `tests/data/test_context.py`
- Create: `tests/data/test_build.py`
- Modify: `pyproject.toml`

**Interfaces:**
- Consumes: `ProfessorDataset` from Task 2 and `higher-education.xls` from Task 1.
- Produces: `load_context(path: Path) -> tuple[ContextYear, ...]`.
- Produces: `build_payload(...) -> dict[str, object]` and deterministic `public/data/atlas.json`.
- `ContextYear` fields: `year`, `academic_year`, `students`, `internal_teachers`, `internal_professors`, `appointments`, `appointments_per_10k_students`, `appointments_per_1k_teachers`, `professor_share`.

- [ ] **Step 1: Write CVTI parsing tests**

Assert years 2000–2025, use only `spolu` total rows, and test known values:

```python
assert context[0].students == 136348
assert context[0].internal_teachers == 9535
assert context[0].internal_professors == 938
assert context[-1].students == 122598
assert context[-1].internal_teachers == 9296
assert context[-1].internal_professors == 1627
```

Assert student arithmetic equals daily plus external plus doctoral columns and foreign students are not added.

- [ ] **Step 2: Write deterministic payload tests**

Build twice into separate temporary paths and assert identical SHA-256 bytes. Assert editorial facts include the 2008 student peak, 2023 appointment-rate maximum, 2011-01-24 largest ceremony, and no 2026 context ratio.

- [ ] **Step 3: Run context/build tests and verify failure**

Run: `uv run pytest tests/data/test_context.py tests/data/test_build.py -q`
Expected: FAIL because context/build modules do not exist.

- [ ] **Step 4: Implement context parsing and indicators**

Carry the year through each category block and consume only the `spolu` row. Read exact sheet names `Učitelia VŠ` and `Študujúci, absolventi VŠ`. Round public rates to two decimals and professor share to one decimal after retaining full-precision values for internal comparison.

- [ ] **Step 5: Add reviewed Slovakia geometry**

Extract Slovakia from Natural Earth's `ne_10m_admin_0_countries.geojson` at `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_admin_0_countries.geojson`, simplify without changing topology, retain source/license properties, and verify the geometry is `Polygon` or `MultiPolygon`. Commit only the Slovakia feature.

- [ ] **Step 6: Assemble and write the payload**

Sort records by date descending, surname using Slovak display text as a stable secondary key, and source row. Serialize dates as ISO strings, use `ensure_ascii=False`, compact separators, sorted object keys, and a trailing newline. Do not include a build timestamp.

- [ ] **Step 7: Wire package scripts and run the complete pipeline suite**

Configure `npm run data:build` later to invoke `uv run python -m pipeline.build`; for now run:

`uv run python -m pipeline.build --output public/data/atlas.json`

Run: `uv run pytest tests/data -q`
Expected: PASS and deterministic JSON regenerated without diff on the second run.

- [ ] **Step 8: Commit generated atlas data**

Commit subject: `feat: generate verified atlas data`. The body must describe CVTI stock metrics, deterministic output, geometry provenance, and generated editorial facts. Verify the full commit message.

### Task 4: Create the archival static application shell

**Files:**
- Create: `package.json`, `package-lock.json`
- Create: `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `vite.config.ts`, `index.html`
- Create: `src/main.tsx`, `src/App.tsx`
- Create: `src/data/types.ts`, `src/data/load.ts`
- Create: `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/components.css`
- Create: `src/components/Hero.tsx`, `src/components/Findings.tsx`, `src/components/ErrorPanel.tsx`
- Create: `src/App.test.tsx`

**Interfaces:**
- Consumes: the Pages-base-safe URL produced by `new URL('data/atlas.json', new URL(import.meta.env.BASE_URL, window.location.href))` from Task 3.
- Produces: `loadAtlas(signal?: AbortSignal) -> Promise<AtlasData>`.
- Produces shared `AtlasData`, `Appointment`, `ContextYear`, `Institution`, and `President` TypeScript types matching JSON exactly.

- [ ] **Step 1: Initialize exact frontend dependencies**

Create the Vite React/TypeScript configuration and install React, D3 modules, `@fontsource-variable/newsreader`, and `@fontsource-variable/instrument-sans`. Install TypeScript, Vite, Vitest, jsdom, React Testing Library, and matching type packages as development dependencies. Commit the generated lockfile; do not use a CDN.

- [ ] **Step 2: Write the failing shell test**

Set the test location to `https://example.test/slovak-professors/index.html`, mock the URL `https://example.test/slovak-professors/data/atlas.json` with a minimal valid payload, and assert the document renders Slovak title text, analytical count `2 378`, three findings, source coverage, and semantic landmark order. Add a failed-fetch case asserting the Slovak error panel and source link. The test must fail if the loader requests domain-root `/data/atlas.json`.

- [ ] **Step 3: Run the shell test and verify failure**

Run: `npm test -- --run src/App.test.tsx`
Expected: FAIL because the app shell does not exist.

- [ ] **Step 4: Define the exact JSON contract and guarded loader**

Model nullable faculty/title values explicitly. Build the request with `new URL('data/atlas.json', new URL(import.meta.env.BASE_URL, window.location.href))`, never a domain-root path. Validate required top-level arrays and `meta.schemaVersion === 1` before returning. Throw `AtlasLoadError` with a safe Slovak-facing message and log the detailed cause once.

- [ ] **Step 5: Implement the archival shell and tokens**

Import bundled variable fonts. Define paper, forest, terracotta, brass, sage, ink, and focus-ring tokens; type scales; 1,200 px content width; AA contrast; and reduced-motion overrides. Build skip link, sticky anchor navigation, hero, findings, loading state, error state, and empty section anchors for context/atlas/explorer/methodology.

- [ ] **Step 6: Run shell tests and production build**

Run: `npm test -- --run src/App.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: Vite emits `dist/index.html` and hashed assets with no remote font request in built CSS.

- [ ] **Step 7: Commit the application shell**

Commit subject: `feat: add the archival atlas shell`. The body must describe the static React load path, Slovak story shell, bundled typography, and guarded errors. Verify the commit.

### Task 5: Implement shared filtering, URL state, search, and CSV

**Files:**
- Create: `src/state/filters.ts`
- Create: `src/state/url.ts`
- Create: `src/state/useAtlasState.ts`
- Create: `src/analysis/selectors.ts`
- Create: `src/utils/search.ts`
- Create: `src/utils/csv.ts`
- Create: `src/utils/format.ts`
- Create: corresponding `*.test.ts` files

**Interfaces:**
- Produces: `FilterState` with `startYear`, `endYear`, `presidentId`, `city`, `institutionId`, `faculty`, `field`, `query`, and `selectedYear`.
- Produces: `filterAppointments(data, filters)`, `institutionRanking(records)`, `cityCounts(records)`, and `yearCounts(records)` pure selectors.
- Produces: `parseFilters(search, options)`, `serializeFilters(filters, defaults)`, and `useAtlasState(data)`.
- Produces: `matchesSearch(appointment, query)` and `recordsToCsv(records) -> string`.

- [ ] **Step 1: Write selector and search tests**

Use fixtures containing Slovak diacritics. Assert filter intersection, accent-insensitive `Caputova`/`Čaputová` matching, raw field matching, stable ranking ties, and no mutation of source arrays.

- [ ] **Step 2: Write URL round-trip and history tests**

Assert valid filters serialize and parse losslessly, defaults disappear from the query, invalid IDs/years are ignored, selection actions push history, typing replaces history, and `popstate` restores state.

- [ ] **Step 3: Write CSV tests**

Assert UTF-8 BOM, semicolon delimiter, CRLF rows, Slovak header names, doubled quotes, source variants, and prevention of spreadsheet formula execution by prefixing cells beginning with `=`, `+`, `-`, or `@` with an apostrophe.

- [ ] **Step 4: Run utility tests and verify failure**

Run: `npm test -- --run src/state src/analysis src/utils`
Expected: FAIL because modules do not exist.

- [ ] **Step 5: Implement pure filter and aggregate functions**

Normalize search once per record at load time in a non-exported index. Keep selector outputs deterministic. An empty filter returns the original record order; aggregate functions return new sorted arrays.

- [ ] **Step 6: Implement browser-history synchronization**

Clicks and select changes use `history.pushState`; free-text input uses `replaceState`; the hook subscribes once to `popstate`. Serialize with `URLSearchParams` and never manually concatenate query strings.

- [ ] **Step 7: Implement safe Slovak CSV and formatting**

Use `Intl.NumberFormat('sk-SK')` and `Intl.DateTimeFormat('sk-SK')`. Export canonical and source values plus source rows. Keep download creation separate from string generation so the pure serializer is fully tested.

- [ ] **Step 8: Run tests and commit shared analysis state**

Run: `npm test -- --run src/state src/analysis src/utils`
Expected: PASS.

Commit subject: `feat: add shareable atlas filtering`. Mention intersecting selectors, Back/Forward-safe URL state, accent-insensitive search, and formula-safe CSV. Verify the commit.

### Task 6: Add official context visualization

**Files:**
- Create: `src/components/ContextSection.tsx`
- Create: `src/components/ContextTrend.tsx`
- Create: `src/components/ContextSection.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/components.css`

**Interfaces:**
- Consumes: `ContextYear[]`, current filtered annual appointment counts, `selectedYear`, and `setSelectedYear(year, 'push')`.
- Produces: exact selected-year metric cards and a three-series indexed SVG trend.

- [ ] **Step 1: Write context behavior tests**

Assert 2000 values, selected-year changes, 2007 definition annotation, index baseline 100, exact accessible labels, 2025 latest context, and a 2026 message that no denominator exists.

- [ ] **Step 2: Run the context test and verify failure**

Run: `npm test -- --run src/components/ContextSection.test.tsx`
Expected: FAIL because context components do not exist.

- [ ] **Step 3: Implement selected-year cards**

Show appointments, students, internal teachers, internal professors, appointments per 10,000 students, appointments per 1,000 teachers, and professor share. Labels explicitly say calendar year versus academic-year stock at 31 October.

- [ ] **Step 4: Implement the indexed SVG trend**

Use D3 scales and line generation only. React renders paths, labeled series marks, axes, and one keyboard-focusable transparent hit target per year. Use dash pattern plus color to distinguish each line. The accessible label for a year includes all three raw values and indices.

- [ ] **Step 5: Add responsive and reduced-motion behavior**

Keep the selected-year panel readable at 320 px. On narrow screens, the chart scrolls inside a labeled region without clipping its y-axis. Disable transitions under reduced motion.

- [ ] **Step 6: Run tests/build and commit context**

Run: `npm test -- --run src/components/ContextSection.test.tsx`
Run: `npm run build`
Expected: PASS.

Commit subject: `feat: contextualize appointments`. Mention official CVTI stocks, normalized trend, exact ratios, and definition/coverage annotations. Verify the commit.

### Task 7: Build the linked map, timeline, and ranking

**Files:**
- Create: `src/components/AtlasSection.tsx`
- Create: `src/components/SlovakiaMap.tsx`
- Create: `src/components/AppointmentTimeline.tsx`
- Create: `src/components/InstitutionRanking.tsx`
- Create: `src/components/AtlasSection.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/components.css`

**Interfaces:**
- Consumes: shared `FilterState`, filter actions, filtered selectors, institutions, presidents, and Slovakia geometry.
- Produces: synchronized city/institution/year/president selection using the Task 5 state API.

- [ ] **Step 1: Write linked-atlas component tests**

Render a compact fixture and assert city selection filters ranking/totals, institution selection reveals faculty rows, year selection filters records, president selection changes timeline/map, reset clears all, and keyboard Enter/Space matches pointer clicks.

- [ ] **Step 2: Run atlas tests and verify failure**

Run: `npm test -- --run src/components/AtlasSection.test.tsx`
Expected: FAIL because linked components do not exist.

- [ ] **Step 3: Implement the proportional-symbol Slovakia map**

Use `geoMercator().fitExtent()` and `geoPath()` for the committed geometry. Project city coordinates once per viewport. Use square-root radius scale, minimum 5 px target mark plus an invisible 44 px interaction target, and a visible selected ring. Each city label announces appointment count and selection state.

- [ ] **Step 4: Implement institution and faculty ranking**

Render native buttons and horizontal proportional bars. Sorting is count descending then Slovak display label. Selected institution expands a nested faculty distribution; missing faculty displays `neuvedené`.

- [ ] **Step 5: Implement timeline and presidential bands**

Render annual bars from 2000–2026, labeled half-open term bands, and ceremony dots positioned within each year. Mark 2026 as incomplete. Each year and ceremony is keyboard-focusable and has an exact Slovak label.

- [ ] **Step 6: Compose the shared atlas controls**

Add president and date-range controls above the visual. Reflect active filters as removable chips. Ensure every view consumes the same filtered selector result and never maintains private filter state.

- [ ] **Step 7: Run linked tests/build and commit centerpiece**

Run: `npm test -- --run src/components/AtlasSection.test.tsx`
Run: `npm run build`
Expected: PASS.

Commit subject: `feat: add the linked academic atlas`. Mention SVG geography, presidential timeline, faculty drill-down, and common accessible selection state. Verify the commit.

### Task 8: Complete explorer, methodology, and responsive accessibility

**Files:**
- Create: `src/components/Explorer.tsx`
- Create: `src/components/RecordList.tsx`
- Create: `src/components/Methodology.tsx`
- Create: `src/components/Explorer.test.tsx`
- Modify: `src/App.tsx`
- Modify: `src/styles/global.css`
- Modify: `src/styles/components.css`

**Interfaces:**
- Consumes: Task 5 search/filter/export utilities and current analytical records.
- Produces: paginated semantic results, record details/source variants, filter controls, CSV download, and complete source/method text.

- [ ] **Step 1: Write explorer and methodology tests**

Assert person lookup with and without accents, all filter dimensions, 25-row pagination, reset, empty state, record detail with duplicate variants, downloadable CSV filename, 2,419/2,378 methodology counts, source/checksum links, 2026 partial-year note, and stock/flow caveat.

- [ ] **Step 2: Run explorer tests and verify failure**

Run: `npm test -- --run src/components/Explorer.test.tsx`
Expected: FAIL because explorer components do not exist.

- [ ] **Step 3: Implement search and filter controls**

Use associated labels, native inputs/selects, visible active filters, and one clear-all button. Announce result counts in a polite live region without announcing on every keystroke until the input value settles for 150 ms.

- [ ] **Step 4: Implement paginated semantic records**

Desktop uses a real table with sortable button headers. Narrow screens use CSS display changes while retaining the same DOM labels and reading order. Each row has a `details` disclosure containing titles, raw/canonical institutions, faculty, field, president, source rows, and variant differences.

- [ ] **Step 5: Implement CSV download and methodology**

Create a Blob only on activation, download as `profesori-filter-YYYY-MM-DD.csv`, then revoke the object URL. Methodology includes direct downloads for both committed XLS files, source page links, hashes, duplicate resolution, aliases, term sources, geographic sources, and GitHub repository link when available from package metadata.

- [ ] **Step 6: Finish responsive/focus/print rules**

Verify 320 px through wide desktop, visible `:focus-visible`, skip link, touch targets, no horizontal page overflow, readable print methodology/table, and no information encoded only by color. Add a visually-hidden utility only for genuinely nonvisual labels.

- [ ] **Step 7: Run focused and full tests/build**

Run: `npm test -- --run src/components/Explorer.test.tsx`
Run: `npm test -- --run`
Run: `npm run build`
Expected: all pass.

- [ ] **Step 8: Commit complete public explorer**

Commit subject: `feat: complete the professor explorer`. Mention lookup/filtering, source-level detail, safe export, methodology, and responsive accessibility. Verify the commit.

### Task 9: Add GitHub Pages deployment and verify the actual site

**Files:**
- Create: `.github/workflows/pages.yml`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: any source/test file only when verification exposes a concrete defect

**Interfaces:**
- Consumes: complete static application from Tasks 1–8.
- Produces: reproducible CI build and Pages artifact.

- [ ] **Step 1: Add a Pages-safe production contract**

Set Vite `base: './'` so the build works at a project subpath. Add package scripts:

```json
{
  "data:build": "uv run python -m pipeline.build --output public/data/atlas.json",
  "data:update": "uv run python scripts/update_data.py",
  "test:data": "uv run pytest tests/data -q",
  "test": "vitest",
  "build": "npm run data:build && npm run test:data && tsc -b && vite build"
}
```

- [ ] **Step 2: Add the official GitHub Pages workflow**

Use `actions/checkout`, `astral-sh/setup-uv`, `actions/setup-node` with npm cache, `npm ci`, `npm test -- --run`, `npm run build`, `actions/upload-pages-artifact`, and `actions/deploy-pages`. Grant only `contents: read`, `pages: write`, and `id-token: write`; use the `github-pages` environment and concurrency cancellation.

- [ ] **Step 3: Run deterministic data and automated verification**

Run: `npm run data:build && sha256sum public/data/atlas.json`
Run the same command again and confirm identical hash.
Run: `npm test -- --run`
Run: `npm run build`
Expected: all commands succeed and the second data build has no repository diff.

- [ ] **Step 4: Serve the real production artifact**

Copy the built `dist` contents beneath a temporary `slovak-professors/` directory, start a managed static server at the temporary parent on an available local port, and navigate to `/slovak-professors/`. Readiness requires the page title and an accepting TCP port; do not test only a root-served artifact or the Vite development server.

- [ ] **Step 5: Browser-test desktop behavior**

At approximately 1440×1000, exercise the actual page at `/slovak-professors/`:

- verify hero, three findings, context, map, timeline, explorer, and methodology;
- select a city and confirm ranking, totals, timeline, and result count update together;
- select president and institution, then use Back/Forward and reload;
- search `Caputova` and a professor surname without accents;
- open a duplicate-resolved record and inspect both source variants;
- download CSV and verify filename/content begins with UTF-8 BOM;
- follow internal navigation and source links without 404s;
- inspect console for errors and failed network requests.

- [ ] **Step 6: Browser-test narrow and accessibility behavior**

At approximately 390×844 and 320×700, verify no page overflow, complete stacked map/ranking/timeline, usable filter controls, readable record cards, keyboard focus order, skip link, Escape behavior where applicable, and reduced-motion rendering. Take screenshots for visual inspection but keep them outside version control.

- [ ] **Step 7: Fix only reproduced verification defects and rerun affected checks**

For each defect, add or strengthen the smallest failing behavioral test before the fix. Rerun that test, production build, and the affected browser scenario. Do not add speculative abstractions or unrelated cleanup.

- [ ] **Step 8: Commit deployment and verified fixes**

Stage only deployment and verified-fix files; inspect the staged diff. Commit subject: `ci: deploy the static atlas to Pages`. The body must describe the exact workflow and any concrete verified browser fixes present in the diff. Verify the commit message.

- [ ] **Step 9: Final evidence check**

Run the full deterministic data, test, and build commands once. Verify `git status --short` is clean, inspect the latest commit metadata, and record exact command results plus browser scenarios for the final delivery response.
