# Slovak Professors Atlas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a polished Slovak-language static atlas of presidential professor appointments, with official higher-education context, linked visual analysis, complete person lookup, and transparent methodology.

**Architecture:** A Python/`uv` build-time pipeline validates three committed legacy XLS workbooks and one pinned official JSON-stat population extract, then emits one deterministic JSON payload. A React/TypeScript/Vite client loads that payload, derives the all-time appointment-field ranking from analytical records, and performs all filtering, aggregation, SVG rendering, URL synchronization, and CSV export in the browser; GitHub Actions publishes only the static `dist` artifact to GitHub Pages.

**Tech Stack:** Python 3.12+, `uv`, `xlrd`, `pytest`, React 19, TypeScript, Vite, D3 modules (`d3-array`, `d3-geo`, `d3-scale`, `d3-shape`), Vitest, React Testing Library, plain CSS, GitHub Actions/Pages.

**Spec:** `docs/superpowers/specs/2026-08-29-slovak-professors-atlas-design.md`

## Global Constraints

- Every professor field and appointment count must derive from the committed ministry workbook at `https://www.minedu.sk/data/att/41c/36688.d8c1fd.xls`.
- The application must be fully static: no backend, database, CMS, map tiles, or runtime upstream requests.
- Visible product copy, dates, labels, number formatting, methodology, and errors must be Slovak.
- Use React for DOM ownership and D3 only for scales, geometry, shapes, and ticks.
- Preserve all raw source variants while using exactly 41 reviewed duplicate resolutions to produce 2,378 analytical appointments from 2,419 source rows.
- Treat appointments and graduates as calendar-year flows and CVTI student/staff counts as 31 October stocks; annotate the 2007 staff-definition break and omit context ratios for 2026.
- Treat the graduate-by-field workbook as a 2025-only snapshot. Make no historical graduate-by-field claim, and never substitute national time-series totals for field-level history.
- Match appointment fields to study programs only by exact equality after case, diacritic, and whitespace normalization. Never infer synonyms, substrings, code families, or broad categories; identical program names can span source categories.
- Aggregate the 2025 graduate source across every required `spolu` column, repeated program codes, and public/private/state sheets exactly once; never add the `z toho ženy` subset columns.
- Use only the national mid-year population for per-capita rates. Publish annual appointments per million residents and internal professors per 100,000 residents; do not divide workplace-city appointments by city population.
- Never infer gender, discipline clusters, institutional quality, causality, or a president leaderboard.
- Use self-hosted open-source fonts, WCAG AA contrast, keyboard-equivalent interactions, semantic records, and `prefers-reduced-motion`.
- Store filter state in `URLSearchParams`; reload and Back/Forward must preserve the selected view.
- Use Conventional Commits with explanatory bodies and verify the author, committer, and full message after every commit.
- Context cards and trends always consume national appointment counts stored in `ContextYear`; local atlas filters never alter those numerators.
- Do not publish citation counts or other per-person bibliometrics in this release. Any later work must resolve ORCID first, manually review OpenAlex IDs with affiliation/field evidence, and exclude ambiguous names; descriptive h-index/total citations are not cross-person comparisons without active-year and field/publication-year normalization that separates recent from lifetime impact.

## File structure

### Data and pipeline

- `pyproject.toml`, `uv.lock` — pinned Python pipeline and test environment.
- `scripts/update_data.py` — atomic downloads, checksums, and source review summary.
- `pipeline/models.py` — immutable appointment/context data classes and serialization.
- `pipeline/text.py` — whitespace and search normalization.
- `pipeline/professors.py` — primary workbook schema validation, canonicalization, duplicate resolution, and president assignment.
- `pipeline/graduates.py` — strict 2025 CVTI study-program parsing, seven-column aggregation, and exact normalized field matching.
- `pipeline/population.py` — strict official JSON-stat parsing for national mid-year population.
- `pipeline/context.py` — CVTI workbook parsing and stock/flow indicators.
- `pipeline/build.py` — payload assembly, editorial facts, deterministic JSON output, and CLI.
- `data/config/institutions.json` — canonical institutions, aliases, cities, coordinates, and citation URLs.
- `data/config/presidents.json` — exact term boundaries and official citations.
- `data/config/duplicate-resolutions.json` — 41 retained/secondary source-row pairs with a review note.
- `data/config/slovakia.geojson` — simplified Natural Earth Slovakia geometry.
- `public/data/source/professors.xls` — pinned ministry workbook, also downloadable from the page.
- `public/data/source/higher-education.xls` — pinned CVTI time series, also downloadable.
- `public/data/source/graduates-by-field-2025.xls` — pinned official CVTI 2025 graduate-by-study-program workbook, also downloadable.
- `public/data/source/population.json` — pinned official DATAcube national mid-year population extract.
- `public/data/provenance.json` — source/catalog URLs, retrieval dates, and expected SHA-256 values.
- `public/data/atlas.json` — deterministic generated client payload, including versioned 2025 field comparison and national per-capita context.
- `tests/data/` — parser, reconciliation, context, population, graduate-field, and deterministic-build contracts.

### Client

- `package.json`, `package-lock.json`, `tsconfig*.json`, `vite.config.ts`, `index.html` — Vite/React project and scripts.
- `src/main.tsx`, `src/App.tsx` — application bootstrap and section composition.
- `src/styles/tokens.css`, `src/styles/global.css`, `src/styles/components.css` — archival-atlas tokens, base rules, and responsive components.
- `src/data/types.ts`, `src/data/load.ts` — JSON contract and guarded loading.
- `src/analysis/selectors.ts` — pure filtering, aggregation, ranking, and chart-series selectors.
- `src/state/filters.ts`, `src/state/url.ts`, `src/state/useAtlasState.ts` — filter model and browser-history synchronization.
- `src/utils/search.ts`, `src/utils/csv.ts`, `src/utils/format.ts` — accent-insensitive matching, export, and Slovak formatting.
- `src/components/Hero.tsx`, `Findings.tsx`, `ContextSection.tsx`, `ContextTrend.tsx`, `FieldGraduateComparison.tsx` — story, official context, all-time field analysis, and the 2025 exact comparison.
- `src/components/AtlasSection.tsx`, `SlovakiaMap.tsx`, `AppointmentTimeline.tsx`, `InstitutionRanking.tsx` — linked centerpiece.
- `src/components/Explorer.tsx`, `RecordList.tsx`, `Methodology.tsx`, `ErrorPanel.tsx` — lookup, source detail, failures, and limits.
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
- Produces: `build_payload(...) -> dict[str, object]` and deterministic `public/data/atlas.json` with top-level `meta.schemaVersion === 1`.
- `ContextYear` fields: `year`, `academic_year`, `students`, `internal_teachers`, `internal_professors`, `appointments`, `appointments_per_10k_students`, `appointments_per_1k_teachers`, `professor_share`.

- [ ] **Step 1: Write CVTI parsing tests**

Assert years 2000–2025, use only `spolu` total rows, and test known values:

```python
assert context[0].students == 137908
assert context[0].internal_teachers == 9535
assert context[0].internal_professors == 938
assert context[-1].students == 148189
assert context[-1].internal_teachers == 9296
assert context[-1].internal_professors == 1627
```

Assert student arithmetic equals Slovak-citizen daily plus foreign daily plus external plus doctoral columns, with each column included exactly once.

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

### Task 10: Add graduate and stock-flow analytical lenses

**Files:**
- Modify: `pipeline/context.py`
- Modify: `pipeline/build.py`
- Modify: `public/data/atlas.json`
- Modify: `tests/data/test_context.py`
- Modify: `tests/data/test_build.py`
- Modify: `docs/superpowers/specs/2026-08-29-slovak-professors-atlas-design.md`
- Modify: `docs/superpowers/plans/2026-08-29-slovak-professors-atlas.md`

**Interfaces:**
- Consumes: the exact CVTI graduate columns from Task 3 and national appointment counts from Task 2.
- Extends `ContextYear` with `graduates`, `appointments_per_1k_graduates`, `graduates_per_appointment`, and `appointments_per_100_professors`.
- Produces generated graduate-throughput and professor-stock editorial facts without per-person bibliometric claims.

- [ ] **Step 1: Write failing graduate and ratio tests**

Assert graduate arithmetic equals Slovak-citizen daily plus foreign daily plus external plus doctoral graduates, with each source column included exactly once:

```python
assert context[0].graduates == 20558
assert context[-1].graduates == 37627
assert context[0].appointments_per_1k_graduates == round(105 * 1000 / 20558, 2)
assert context[-1].appointments_per_100_professors == round(55 * 100 / 1627, 2)
```

Assert the inverse `graduates_per_appointment` is `None` rather than infinite when a synthetic year has zero appointments. Assert every ratio uses the national `ContextYear.appointments` count and no local-filter input exists in the parser or payload.

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `uv run pytest tests/data/test_context.py tests/data/test_build.py -q`
Expected: FAIL because graduate fields and ratios do not exist.

- [ ] **Step 3: Parse graduate flow columns and compute named indicators**

Read columns 10, 12, 14, and 16 from the exact `spolu` row. Retain the same strict non-negative integer validation used for student components. Round public rates to two decimals. Keep labels and documentation explicit that appointments and graduates are flows, while the internal-professor comparison uses a stock denominator and is not a headcount-change claim.

- [ ] **Step 4: Generate verified analytical facts**

Add deterministic build-derived facts for graduate throughput and appointments relative to the existing professor stock. Tests pin the selected years and extrema so source updates cannot silently change editorial claims. Do not add runtime API calls, guessed scholarly identifiers, or citation counts.

- [ ] **Step 5: Verify deterministic output**

Run: `uv run pytest tests/data/test_context.py tests/data/test_build.py -q`
Run `uv run python -m pipeline.build --output public/data/atlas.json` twice and verify identical SHA-256 bytes and no second-build diff.
Expected: PASS.

- [ ] **Step 6: Commit the analytical extension**

Commit subject: `feat: add graduate comparison lenses`. The body must distinguish flows from stocks, name the exact graduate arithmetic, and explain why citation metrics are excluded without reliable entity resolution. Verify the full commit.

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
- Consumes: `ContextYear[]`, `selectedYear`, and `setSelectedYear(year, 'push')`; appointment values come only from the national context series.
- Produces: exact selected-year metric cards and a four-series indexed SVG trend.

- [ ] **Step 1: Write context behavior tests**

Assert 2000 values, graduate arithmetic and ratios, selected-year changes, 2007 definition annotation, index baseline 100, exact accessible labels, 2025 latest context, and a 2026 message that no denominator exists. Assert local city/institution filters cannot alter any context numerator.

- [ ] **Step 2: Run the context test and verify failure**

Run: `npm test -- --run src/components/ContextSection.test.tsx`
Expected: FAIL because context components do not exist.

- [ ] **Step 3: Implement selected-year cards**

Show appointments, graduates, students, internal teachers, internal professors, appointments per 1,000 graduates, graduates per appointment, appointments per 10,000 students, appointments per 1,000 teachers, appointments per 100 professors in the existing stock, and professor share. Labels explicitly distinguish calendar-year flows from academic-year stocks at 31 October.

- [ ] **Step 4: Implement the indexed SVG trend**

Use D3 scales and line generation only. React renders paths for appointments, graduates, students, and internal teachers; labeled series marks, axes, and one keyboard-focusable transparent hit target per year. Use dash pattern plus color to distinguish each line. The accessible label for a year includes all four raw values and indices.

- [ ] **Step 5: Add responsive and reduced-motion behavior**

Keep the selected-year panel readable at 320 px. On narrow screens, the chart scrolls inside a labeled region without clipping its y-axis. Disable transitions under reduced motion.

- [ ] **Step 6: Run tests/build and commit context**

Run: `npm test -- --run src/components/ContextSection.test.tsx`
Run: `npm run build`
Expected: PASS.

Commit subject: `feat: contextualize appointments`. Mention official CVTI stocks and graduate flows, normalized trend, exact national ratios, and definition/coverage annotations. Verify the commit.

### Task 7: Build the linked map, timeline, and ranking

**Files:**
- Create: `src/components/AtlasSection.tsx`
- Create: `src/components/SlovakiaMap.tsx`
- Create: `src/components/AppointmentTimeline.tsx`
- Create: `src/components/InstitutionRanking.tsx`
- Create: `src/components/AnalysisLenses.tsx`
- Create: `src/components/AtlasSection.test.tsx`
- Modify: `src/analysis/selectors.ts`
- Modify: `src/App.tsx`
- Modify: `src/styles/components.css`

**Interfaces:**
- Consumes: shared `FilterState`, filter actions, filtered selectors, institutions, presidents, and Slovakia geometry.
- Produces: synchronized city/institution/year/president selection plus filter-aware ceremony cadence, academic breadth, and top-three institutional concentration using the Task 5 state API.

- [ ] **Step 1: Write linked-atlas component tests**

Render a compact fixture and assert city selection filters ranking/totals, institution selection reveals faculty rows, year selection filters records, president selection changes timeline/map, reset clears all, and keyboard Enter/Space matches pointer clicks. Assert analytical lenses compute ceremony count, median/largest batch, median elapsed days, distinct cities/institutions/faculties, top-three institution share, and the leading institution from the same filtered records.

- [ ] **Step 2: Run atlas tests and verify failure**

Run: `npm test -- --run src/components/AtlasSection.test.tsx`
Expected: FAIL because linked components do not exist.

- [ ] **Step 3: Implement the proportional-symbol Slovakia map**

Use `geoMercator().fitExtent()` and `geoPath()` for the committed geometry. Project city coordinates once per viewport. Use square-root radius scale, minimum 5 px target mark plus an invisible 44 px interaction target, and a visible selected ring. Each city label announces appointment count and selection state.

- [ ] **Step 4: Implement institution and faculty ranking**

Render native buttons and horizontal proportional bars. Sorting is count descending then Slovak display label. Selected institution expands a nested faculty distribution; missing faculty displays `neuvedené`.

- [ ] **Step 5: Implement timeline and presidential bands**

Render annual bars from 2000–2026, labeled half-open term bands, and ceremony dots positioned within each year. Mark 2026 as incomplete. Each year and ceremony is keyboard-focusable and has an exact Slovak label.

- [ ] **Step 6: Compose shared controls and analytical lenses**

Add president and date-range controls above the visual. Reflect active filters as removable chips. Add compact Slovak-labeled cards for ceremony cadence, academic breadth, top-three institutional concentration, and the leading institution in the active cohort. Ensure every view and lens consumes the same filtered selector result and never maintains private filter state. Label concentration as distribution, never quality.
- [ ] **Step 7: Run linked tests/build and commit centerpiece**

Run: `npm test -- --run src/components/AtlasSection.test.tsx`
Run: `npm run build`
Expected: PASS.

Commit subject: `feat: add the linked academic atlas`. Mention SVG geography, presidential timeline, faculty drill-down, filter-aware ceremony/concentration lenses, and common accessible selection state. Verify the commit.

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

Assert person lookup with and without accents, all filter dimensions, 25-row pagination, reset, empty state, record detail with duplicate variants, downloadable CSV filename, 2,419/2,378 methodology counts, source/checksum links, 2026 partial-year note, stock/flow caveat, and the explicit bibliometric exclusion.

- [ ] **Step 2: Run explorer tests and verify failure**

Run: `npm test -- --run src/components/Explorer.test.tsx`
Expected: FAIL because explorer components do not exist.

- [ ] **Step 3: Implement search and filter controls**

Use associated labels, native inputs/selects, visible active filters, and one clear-all button. Announce result counts in a polite live region without announcing on every keystroke until the input value settles for 150 ms.

- [ ] **Step 4: Implement paginated semantic records**

Desktop uses a real table with sortable button headers. Narrow screens use CSS display changes while retaining the same DOM labels and reading order. Each row has a `details` disclosure containing titles, raw/canonical institutions, faculty, field, president, source rows, and variant differences.

- [ ] **Step 5: Implement CSV download and methodology**

Create a Blob only on activation, download as `profesori-filter-YYYY-MM-DD.csv`, then revoke the object URL. Methodology includes direct downloads for every committed XLS file, source/catalog page links, hashes, duplicate resolution, aliases, term sources, geographic sources, and GitHub repository link when available from package metadata. It explicitly states that this release includes no bibliometrics. Any later layer must resolve ORCID first, then manually review OpenAlex author IDs using affiliation and field evidence and exclude ambiguous names. H-index and total citations remain descriptive; cross-person comparison additionally requires citations per active career year and field- and publication-year-normalized percentiles, with recent impact separated from lifetime impact.

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

### Task 11: Add exact appointment-field depth and the official 2025 graduate comparison

**Official source contract:**

- Catalog: `https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/statisticka-rocenka-publikacia/statisticka-rocenka-vysoke-skoly.html?page_id=9596`
- Workbook: `https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls`
- Destination: `public/data/source/graduates-by-field-2025.xls`
- Source key: `graduates_by_field_2025`
- SHA-256: `2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729`
- Retrieved on: `2026-08-29`

**Files:**

- Create: `public/data/source/graduates-by-field-2025.xls`
- Create: `pipeline/graduates.py`
- Create: `tests/data/test_graduates.py`
- Create: `src/components/FieldGraduateComparison.tsx`
- Create: `src/components/FieldGraduateComparison.test.tsx`
- Modify: `scripts/update_data.py`
- Modify: `public/data/provenance.json`
- Modify: `pipeline/build.py`
- Modify: `public/data/atlas.json`
- Modify: `tests/data/test_update_data.py`
- Modify: `tests/data/test_build.py`
- Modify: `src/data/types.ts`
- Modify: `src/data/load.ts`
- Modify: `src/analysis/selectors.ts`
- Modify: `src/analysis/selectors.test.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Modify: `src/components/Findings.tsx`
- Modify: `src/components/Methodology.tsx`
- Modify: `src/components/Explorer.test.tsx`
- Modify: `src/styles/components.css`
- Modify: `docs/superpowers/specs/2026-08-29-slovak-professors-atlas-design.md`
- Modify: `docs/superpowers/plans/2026-08-29-slovak-professors-atlas.md`

**Interfaces:**

- Adds `graduates_by_field_2025` to `SOURCE_DESTINATIONS`, atomic downloads, provenance validation, and build-time checksum verification.
- Produces `load_graduates_by_field(path: Path) -> GraduateFieldDataset` for calendar year 2025. The parser requires sheets `Tab2v`, `Tab2s`, and `Tab2š`, their exact 2025 titles, six exact multirow headers, and 16 columns.
- A study-program row is identified from its `code / label` first cell. For that row, sum only zero-based columns `2, 4, 6, 8, 10, 12, 14`: the seven non-overlapping `spolu` totals for first-/second- and third-degree forms/citizenship groups plus external educational institutions. Validate every cell as a non-negative integer. Do not add the adjacent `z toho ženy` subsets.
- Aggregate the exact normalized label across repeated program codes and all public/private/state sheets. Normalization trims and collapses whitespace, case-folds, and removes Unicode diacritics; it does not infer synonyms or categories.
- Produces this exact top-level payload contract:

```text
fieldGraduateComparison: {
  schemaVersion: 1,
  year: 2025,
  source: {
    url: string,
    catalogUrl: string,
    sha256: string,
    retrievedOn: string
  },
  appointmentCount: number,
  matchedAppointmentCount: number,
  matchedAppointmentShare: number,
  distinctFieldCount: number,
  matchedDistinctFieldCount: number,
  rows: Array<{
    field: string,
    appointmentCount: number,
    graduateCount: number | null,
    graduatesPerAppointment: number | null,
    matchStatus: "exact" | "unmatched"
  }>
}
```

- `rows` contains every distinct 2025 appointment-field label. An exact normalized label match receives the fully aggregated graduate count and a two-decimal `graduatesPerAppointment`; an unmatched row keeps both values `null`. Sort appointment count descending, then normalized field, then displayed field. The versioned source block is copied from committed provenance.
- The client independently derives the all-time appointment-field ranking from every analytical `record`. It groups only trim/internal-whitespace/case/diacritic equivalents; chooses the highest-frequency raw label as display text with a Slovak lexical tie-break; reports count, share, first/last appointment year, and all trimmed raw variants with counts; and sorts count descending then Slovak display label.
- The all-time ranking contains no graduate counts. The 2025 comparison contains no inferred history. Neither analysis uses substring, synonym, code-family, broad-taxonomy, quality, or causal claims.

- [ ] **Step 1: Extend source acquisition and pin the official bytes**

Add `graduates_by_field_2025` to the updater without weakening atomic replacement or checksum-failure behavior. Commit the catalog URL, workbook URL, retrieval date, and exact SHA above to provenance. The direct workbook remains a subpath-safe public download; the deployed client makes no runtime CVTI request.

Extend `tests/data/test_update_data.py` to assert all three source names and destinations, successful replacement, checksum reporting, and preservation of the prior graduate workbook when downloaded bytes fail integrity.

- [ ] **Step 2: Write strict parser and aggregation tests**

In `tests/data/test_graduates.py`, construct a three-sheet workbook fixture with the exact titles and six header rows. Prove that only the seven `spolu` cells are added, while every `z toho ženy` value is ignored. Repeat `Právo` with whitespace/case/diacritic variants, different codes, and different public/private/state sheets and assert one exact normalized total.

Add failing cases for a changed sheet set, 2025 title, header cell, column count, missing/fractional/negative total, and a workbook with no study-program rows. Pin the official source facts: 1,723 program rows, 1,302 normalized labels, 37,627 graduates, `psychológia` = 1,146, and `strojárske technológie a materiály` = 17.

- [ ] **Step 3: Prove exact matching and its limits**

Test a 2025 appointment field `PRÁVO` against graduate label `Právo` and assert an exact match after normalization. Put `občianske právo` beside it and assert `unmatched`; no substring or broader legal-category rule is permitted. Include an identical program name under different source categories and aggregate its graduate number without claiming that the name belongs to one inferred category.

Pin the reviewed 2025 coverage: 55 appointments, 46 distinct appointment-field labels, 47 matched appointments (85.45%), and 39 matched labels. Assert all 46 rows are emitted, the seven reviewed unmatched labels retain `null` values, and zero appointments produce a finite `0.0` coverage rather than division by zero.

- [ ] **Step 4: Implement the parser and deterministic payload**

Implement strict workbook validation and immutable sorted graduate aggregates in `pipeline/graduates.py`. Wire the third input and provenance checksum into `pipeline/build.py`, call the exact comparison builder against analytical appointments, and emit `fieldGraduateComparison` without a timestamp. Reject missing `url`, `catalogUrl`, `sha256`, or `retrievedOn`.

Update TypeScript types and fail-closed payload guards for the exact schema above, including `schemaVersion === 1`, row `matchStatus`, nullable graduate values, and source metadata. Do not generate an all-time field aggregate in JSON; the records are its single source of truth.

- [ ] **Step 5: Add the all-time appointment-field analysis**

Add a pure selector over all analytical records with fixtures that cover case, Unicode diacritics, repeated/internal whitespace, representative-label ties, variant counts, count/share arithmetic, first/last year, deterministic order, input immutability, and an empty dataset. Prove with non-equivalent labels that no synonym, substring, code, or taxonomy mapping occurs.

Render a semantic all-time ranking table/disclosure before the 2025 snapshot. Show appointment count, share, first/last year, and every raw label variant. Keep all-time scope independent of shared filters and identify its coverage as the complete appointment archive through 3 June 2026.

- [ ] **Step 6: Render the complete 2025 comparison and methodology**

Render source coverage (`47 z 55`, `85,45 %`, `39 zo 46 odborov`), every matched and unmatched row, sortable native column-header buttons, `aria-sort`, null values as visibly unavailable, and a keyboard-scrollable table region. Link the official catalog, upstream workbook, and the committed download through `new URL('data/source/graduates-by-field-2025.xls', new URL(import.meta.env.BASE_URL, window.location.href))` so the link remains safe at a Pages subpath.

The adjacent note and methodology must say that the inputs are two different administrative registers, matches require exact normalized names, unmatched does not mean zero graduates, the source is only a 2025 snapshot, and no historical, causal, quality, or broad-taxonomy conclusion follows. Explain that identical study-program names can occur under more than one broad source category, which is why the release does not force a category crosswalk.

Keep bibliometrics explicitly outside this release. Document the only acceptable future route: ORCID-first identity; then manually reviewed OpenAlex author IDs supported by affiliation and field evidence; ambiguous names excluded. Treat h-index and total citations as descriptive only. Any cross-person view additionally requires citations per active year plus field- and publication-year-normalized percentiles, with recent and lifetime impact separated.

- [ ] **Step 7: Run focused and deterministic verification**

Run:

```bash
sha256sum public/data/source/graduates-by-field-2025.xls
uv run pytest tests/data/test_update_data.py tests/data/test_graduates.py tests/data/test_build.py -q
npm test -- --run src/analysis/selectors.test.ts src/components/FieldGraduateComparison.test.tsx src/App.test.tsx src/components/Explorer.test.tsx
npm run data:build
sha256sum public/data/atlas.json
npm run data:build
sha256sum public/data/atlas.json
npm run build
```

Expected: the source hash exactly equals `2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729`; focused tests and production build pass; both generated payload hashes are identical; the second build changes no generated bytes.

- [ ] **Step 8: Browser-verify the actual production artifact**

Serve the built `dist` beneath a temporary `/slovak-professors/` subpath. At desktop and narrow mobile widths:

- confirm the all-time ranking totals all analytical records and exposes field variants, share, and first/last year;
- confirm the 2025 comparison shows all 46 rows, including matched ratios and seven visibly unmatched rows;
- activate each native sort header by pointer and keyboard and confirm `aria-sort` follows the visible order;
- open the all-time variant disclosures and scroll the comparison region with the keyboard;
- follow the catalog, upstream XLS, and committed subpath-safe XLS links without a 404;
- confirm methodology states 2025-only coverage, exact normalized matching, multi-code/multi-sector aggregation, unmatched-not-zero, no forced broad taxonomy, and no causal or quality claim;
- inspect the mobile table/overflow surface, focus visibility, console errors, and failed network requests.

- [ ] **Step 9: Commit the completed field analysis**

After the focused commands and browser scenarios pass, stage only Task 11 files and inspect the staged diff. Commit subject: `feat: compare appointment fields with 2025 graduates`. The body must name the official CVTI snapshot and SHA, exact matching/aggregation rules, all-time appointment-only ranking, tested 2025 coverage, deterministic payload, and explicit analytical limits. Verify the full commit message.
