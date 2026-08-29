# Slovak Professors Atlas — Design Specification

## Status

Approved direction. The user selected a balanced public-data story and research explorer, an academic-map editorial frame, the interactive-atlas product model, and the archival visual language. The user then delegated all remaining product decisions and requested implementation without further approval gates.

## Goal

Build a polished Slovak-language static website showing every professor appointment in the Ministry of Education workbook from 2000 onward. The page must explain how the academic map of Slovakia changed across universities, faculties, cities, years, ceremonies, presidential terms, and exact appointment-field labels; support direct person lookup; contextualize annual appointments against official counts of university students, graduates, and academic staff; and compare the 2025 appointment fields with an official 2025 graduate-by-study-program snapshot.

The finished artifact deploys to GitHub Pages. It has no backend, database, CMS, map-tile service, or runtime dependency on an upstream data provider.

## Audience and editorial frame

The product is a balanced hybrid:

- a concise public-facing story for a general Slovak audience;
- a linked visual atlas for journalists, academics, and policy readers;
- a complete accessible record explorer for direct lookup.

The opening question is **„Kde vzniká slovenská profesúra?“** Presidents provide historical periods, but the main editorial subject is the changing map of universities and faculties. The page must not rank presidents, imply institutional quality, or turn appointment totals into causal claims.

All visible interface copy, chart labels, methods, number formatting, and dates are Slovak. Technical source code and repository documentation may be English.

## Sources and provenance

### Primary appointment source

- Ministry workbook: <https://www.minedu.sk/data/att/41c/36688.d8c1fd.xls>
- Pinned SHA-256 at design time: `0730645dfe3310e25665f5daef3126fbe5fe21469c773cd4a6e16b2bdaa69b5d`
- Workbook sheets:
  - `Zoznam vymenovaných profesorov`
  - `Zoznam skratiek vysokých škôl`

Every professor field and every appointment count originates in this workbook. The raw file is committed unchanged so a deployed build never depends on the ministry URL remaining available.

Observed source baseline:

- 2,419 data rows;
- dates from 22 February 2000 through 3 June 2026;
- 67 distinct appointment dates;
- 32 normalized source labels resolving to 22 canonical institutions;
- 439 raw appointment-field labels;
- 11 missing faculty values and no missing names, institutions, fields, or dates.

### Official higher-education context

- CVTI SR time-series catalog: <https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/casove-rady.html?page_id=9724>
- Workbook `radtab10.xls`: <https://www.cvtisr.sk/buxus/docs//JC/rady/radtab10.xls>
- Pinned SHA-256 at design time: `def7a52f5fe139dfcd01d88a141d3d65fafc33581a19082bf07fa62b1d06f59e`

The contextual series supplies national totals for students, first-, second-, and third-degree graduates, internal university teachers, and professors among internal teachers. The product uses academic years 2000/2001 through 2025/2026 and aligns each row to its starting calendar year. CVTI states that the figures are measured at 31 October; annual appointments and graduates are calendar-year flows, while student and staff values are point-in-time stocks. The interface states these distinctions wherever the series are compared.

Student and graduate totals each equal Slovak-citizen daily first/second-degree, foreign daily first/second-degree, external first/second-degree, and third-degree doctoral columns. Each source column is included exactly once. CVTI notes a staff-definition break in 2007: from that year, internal teachers mean teachers working the established full working time. The chart marks this break.

No student, graduate, or staff denominator is shown for 2026 because the official series currently ends at 2025/2026.

### Official 2025 graduates by study program

- CVTI SR statistical-yearbook catalog: <https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/statisticka-rocenka-publikacia/statisticka-rocenka-vysoke-skoly.html?page_id=9596>
- Workbook `abvs_2.xls`: <https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls>
- Pinned SHA-256: `2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729`
- Retrieved: `2026-08-29`
- Exact sheets: `Tab2v` (public universities), `Tab2s` (private universities), and `Tab2š` (state universities)

This workbook is an official snapshot of graduates through 31 December 2025. It supports only a **2025** appointment-field comparison; it does not provide a historical field series. The committed source contains 1,723 study-program rows, which aggregate to 1,302 exact normalized labels and 37,627 graduates.

For each study-program row, the pipeline sums the seven `spolu` columns exactly once: first-/second-degree daily Slovak citizens, first-/second-degree daily other citizens, first-/second-degree external study, third-degree daily Slovak citizens, third-degree daily other citizens, third-degree external study, and external educational institutions. The adjacent `z toho ženy` cells are subsets and are not added. Counts are then summed across repeated program codes and the public, private, and state sheets when the normalized program label is exactly equal.

The workbook can place an identical study-program name under different codes and more than one broad source category. A name therefore does not determine a unique broad taxonomy. The product aggregates identical normalized labels for counting but does not force programs or appointment fields into inferred categories.
### Official national population

- Statistical Office of the Slovak Republic DATAcube table `om7102rr`
- Catalog: <https://datacube.statistics.sk/#!/view/en/VBD_DEM/om7102rr/v_om7102rr_00_00_00_en>
- Pinned API selection: <https://data.statistics.sk/api/v2/dataset/om7102rr/SK0/2000:2025/IN010114/SPOLU?lang=en&type=json>
- Pinned SHA-256: `d09a892509ac4c746fe87ac4f825502d491ad4b2ac5b79e9751b2cec0431efa6`
- Retrieved: `2026-08-29`

The denominator is the national mid-year population at midnight from 30 June to 1 July of each reference calendar year. The series covers 2000–2025 without interpolation. It supports two national descriptive rates: annual appointments per million residents and internal professors per 100,000 residents. The atlas does not divide affiliation-city appointments by city population because workplace is not residence and universities serve wider areas.


### Presidential terms

Appointment dates are assigned to terms using official Presidency pages:

- Rudolf Schuster: <https://www.prezident.sk/rudolf-schuster/>
- Ivan Gašparovič: <https://www.prezident.sk/ivan-gasparovic/>
- Andrej Kiska: <https://www.prezident.sk/andrej-kiska/>
- Zuzana Čaputová: <https://www.prezident.sk/zuzana-caputova/>
- Current presidency information: <https://www.prezident.sk/informacie/>

Term boundaries are stored as explicit inclusive start and exclusive end dates. The application validates that every appointment maps to exactly one term.

### Geographic context

Institution cities and coordinates are a small curated metadata file. Coordinates use Wikidata values and retain entity URLs for attribution. The Slovakia outline is a committed, simplified Natural Earth geometry; Natural Earth data is public domain. Neither source is requested at runtime.

## Source cleaning and analytical record policy

Raw source values remain recoverable. Cleaning is limited to deterministic presentation and identity reconciliation:

1. Convert Excel serial dates to ISO `YYYY-MM-DD`.
2. Replace non-breaking spaces, collapse repeated whitespace, and trim text.
3. Preserve raw title, faculty, institution, and field strings on each source-row variant.
4. Resolve known institution aliases to 22 canonical institutions. The workbook's second sheet is authoritative for 21 institutions; a reviewed alias table handles spelling/history variants and Vysoká škola DTI.
5. Never classify gender or infer a discipline taxonomy from names or source field strings. Field equivalence is limited to case, diacritic, and whitespace normalization; substring, synonym, code, category, and manually guessed mappings are prohibited.

The source contains 41 reviewed likely duplicate appointments: 40 pairs on 20 January 2009 and one pair on 25 January 2010. Each pair has the same normalized first name, surname, and appointment date; many are byte-for-byte duplicates, while others differ in spacing, faculty, institution, or field text inside an evidently repeated source block.

The analytical dataset therefore contains **2,378 appointments**. Deduplication is not an open-ended fuzzy rule. A committed resolution table names the 41 secondary source rows and their retained primary rows. The build fails if a referenced row changes or an unreviewed same-name/same-date collision appears. Record details expose all source variants and row numbers. The methodology reports both 2,419 source rows and 2,378 analytical appointments.

Repeated names on different dates are not merged. The page never claims a count of unique natural persons.

The all-time appointment-field analysis is derived in the client from all 2,378 analytical records. Its grouping key trims text, collapses internal whitespace, case-folds, and removes Unicode diacritics; it performs no broader semantic merge. Each group reports its appointment count and share, first and last appointment year, and every observed trimmed source label variant with its own count. The displayed label is the most frequent variant, with a Slovak lexical tie-break, and groups sort by count descending then displayed label. This analysis covers appointments from 22 February 2000 through 3 June 2026 and contains no graduate measure.

## Product structure

The site is one scrolling page with stable anchor navigation:

1. **Hero** — title, one-paragraph scope, coverage dates, analytical appointment count, number of ceremonies, and source disclosure.
2. **Three verified findings** — compact editorial observations computed from the reconciled appointment records, not hard-coded unsupported claims.
3. **Higher-education context** — selected-year exact values and normalized trends comparing appointments, graduates, students, and internal teachers.
4. **Appointment fields and 2025 graduates** — an all-time exact-normalized appointment-field ranking followed by the complete exact-match 2025 graduate comparison.
5. **Linked academic atlas** — city map, ranked institutions, faculty drill-down, annual timeline, and presidential bands.
6. **Complete explorer** — search, filters, sortable records, details, and filtered CSV download.
7. **Methodology and sources** — definitions, duplicate handling, incomplete years, context caveats, field-matching limits, downloads, checksums, and citations.

There is no carousel, autoplay, route hierarchy, or separate dashboard mode.

## Contextual comparisons

Appointments and graduates are annual flows; students and staff are stocks. The design names those units explicitly and never presents a stock/flow ratio as a conversion, causal effect, or headcount change.

### Exact selected-year scale

The selected-year panel uses an explicitly labelled base-10 logarithmic scale ladder for five exact national magnitudes:

- presidential appointments and graduates as calendar-year flows;
- students, internal university teachers, and professors among internal teachers as 31 October stocks.

Exact values remain printed beside every mark. Dominant callouts show annual appointments per million residents and internal professors per 100,000 residents. Secondary callouts retain appointments per 100 professors in the existing stock and professors as a percentage of internal teachers.

The interface states that the ladder compares only orders of magnitude. It is not a funnel, conversion, or causal chain. Every rate uses the national appointment or professor value stored in the selected `ContextYear`; local atlas filters never change those numerators.

### Indexed trend

A line chart indexes appointments, graduates, students, and internal teachers to 100 in 2000. Indexing makes differently sized series comparable without a misleading dual axis. Exact raw values appear on focus/hover and in the selected-year panel. The 2007 teacher-definition break and the missing 2026 context are visibly annotated.

### Appointment fields at two scales

The field section deliberately keeps two analyses separate:

1. An **all-time appointment ranking** counts every analytical appointment by the appointment workbook's exact normalized `odbor` label. It shows the group's count and share of all appointments, first and last appointment year, and the contributing source-label variants. This ranking contains no graduate values and remains independent of the 2025 payload.
2. A **2025 snapshot comparison** filters appointments to calendar year 2025 and joins each appointment-field label to the official CVTI study-program aggregate only when their normalized labels are exactly equal. Matching normalization removes only case, diacritic, and whitespace differences. Unmatched fields stay visible with `null` graduate counts and ratios.

For the pinned sources, 47 of 55 appointments match, representing 39 of 46 appointment-field labels. The interface presents these as coverage facts, not evidence that unmatched fields had no graduates. It identifies the inputs as two different administrative registers, publishes every matched and unmatched row, and labels graduates per appointment as a descriptive same-year ratio. It never treats that ratio as causation, quality, capacity, or a person-level outcome.

No historical graduate-by-field trend is shown or implied. No substring, synonym, code-family, broad-category, or inferred-taxonomy match is allowed. Identical program names observed under more than one broad source category are aggregated by their names, not used to manufacture a category mapping.

### Linked analytical lenses

The atlas adds compact, filter-aware analyses derived from the reconciled appointment records:

- **Ceremony cadence:** number of ceremonies, median and largest batch size, and median elapsed days between ceremonies;
- **Academic breadth:** distinct cities, canonical institutions, and source faculties represented by the active cohort;
- **Institutional concentration:** the combined appointment share of the three leading institutions, labeled as concentration rather than quality;
- **Era profile:** the leading institution and representation breadth within each presidential term, without ranking presidents by raw totals.

These lenses update from the same shared filter state as the map and records. They describe the shape of appointment activity, not performance or academic quality.

### Editorially useful observations

The current pinned sources support, subject to generated-value tests, these observations:

- student counts peaked in 2008/2009 at 230,519 and were 148,189 in 2025/2026;
- internal teachers changed much less than student totals over the same period;
- professors were 9.8% of internal teachers in 2000 and 17.5% in 2025;
- annual appointment intensity varied substantially, from 2.04 appointments per 10,000 students in 2007 to 8.13 in 2023;
- graduate throughput peaked at 73,970 in 2010; appointment intensity relative to that flow peaked in 2000 at 5.11 appointments per 1,000 graduates, or one appointment per 195.79 graduates;
- the comparison to the existing internal-professor stock peaked in 2001 at 11.5 appointments per 100 professors and is explicitly not a professor-headcount change;
- 108 appointments occurred on 24 January 2011, the largest ceremony in the analytical dataset.

The build computes these statements and their values. If an upstream update changes an extremum, tests force editorial copy review rather than silently publishing a stale claim.

### Explicit exclusions

Do not build:

- citation counts or other per-person bibliometrics in this release; the ministry workbook has no stable scholarly identifiers, and name-only author matching is unsafe;
- a president leaderboard based on raw term totals;
- institution-level student/staff/graduate ratios without a consistent reconciled institution series;
- appointments as a percentage increase in professor headcount;
- a causal claim that appointments produced later staff changes;
- gender analysis inferred from names;
- field clusters or crosswalks created from undocumented keywords, substrings, synonyms, program codes, or inferred broad categories;
- regional choropleths, because records belong to proposing institutions rather than resident populations.

### Future bibliometric layer, explicitly outside this release

This release includes no bibliometric data or claims. Any later layer must resolve people **ORCID-first**. Only unresolved candidates may proceed to manually reviewed OpenAlex author IDs, using affiliation and field evidence; ambiguous names must be excluded rather than forced.

An h-index or total citation count may be presented only as a descriptive measure for the resolved person. Cross-person comparison requires both citations per active career year and field- and publication-year-normalized citation percentiles, with recent impact separated from lifetime impact. Even with those safeguards, the measures remain descriptive and must not be presented as institutional quality, appointment merit, or a causal consequence of appointment.

## Linked atlas interaction

All analytical views share one filter state:

- date range;
- president;
- city;
- canonical institution;
- source faculty label;
- raw appointment-field label;
- free-text query.

The city map uses proportional symbols. Selecting a city filters the institution ranking, timeline, totals, and records. Selecting an institution reveals its faculty distribution. Timeline bars represent annual appointment counts; ceremony markers expose exact dates and sizes; presidential terms appear as labeled background bands.

Search is case-insensitive and accent-insensitive across first name, surname, full display name, institution, faculty, and field. Search normalization affects matching only; displayed Slovak diacritics remain untouched.

Filter state is encoded in `URLSearchParams`. Reload, copy/paste, browser Back/Forward, and direct links preserve the view. A single reset action clears every filter. Invalid URL values are ignored safely and removed on the next state write.

Hover is supplemental. Click, touch, and keyboard provide complete functionality. Focused chart elements expose the same labels as pointers. Result-count updates use a polite live region.

## Records and export

The complete explorer starts with a virtual-free, paginated semantic table; 2,378 records do not justify virtualization complexity. Desktop displays name, institution/faculty, field, date, and president. Mobile uses accessible record cards generated from the same markup/data model.

A detail disclosure shows titles, canonical and source institution labels, faculty, raw field, appointment date, president, source row numbers, and duplicate variants where present.

CSV export contains the currently filtered analytical records in UTF-8 with a BOM for Slovak spreadsheet compatibility. It includes canonical values, original source values, source rows, and a methodology URL. Export never mutates or reclassifies fields.

## Visual system

The selected direction is **Archívny atlas**:

- warm paper background;
- deep forest green data canvas;
- terracotta selection/accent;
- muted brass and sage secondary series;
- editorial serif display face and highly legible sans-serif interface face;
- subtle cartographic contour motifs, never Slovak flag or folkloric ornament clichés.

Use self-hosted open-source WOFF2 fonts so the page has no Google Fonts runtime request. Body contrast meets WCAG AA. Color is never the only series or selection encoding. Motion is short and functional, disabled under `prefers-reduced-motion`.

The desktop content width is approximately 1,200 px. Mobile layouts stack summary, map, ranking, timeline, and records; no analytical function disappears. The map remains a complete SVG with a textual institution ranking as an equivalent view.

## Technical architecture

### Frontend

- React and TypeScript;
- Vite static build;
- D3 modules for scales, shape generation, geography, and ticks only;
- React owns the DOM and interaction state;
- plain CSS with design tokens; no component framework or utility-CSS dependency.

The dataset is small enough for in-browser filtering and aggregation. The app loads one versioned static atlas JSON payload. Aggregates are derived in memoized selectors rather than duplicated across generated endpoints.

### Data pipeline

A Python pipeline managed by `uv` and pinned to `xlrd` reads three committed legacy XLS sources plus one pinned official JSON-stat population extract. The Node frontend never parses source workbooks or contacts upstream services at runtime.

Commands:

- `npm run data:build` — validate every committed raw file and regenerate deterministic JSON;
- `npm run data:update` — download all four official inputs, verify or intentionally refresh checksums, regenerate, and print a review summary;
- `npm run build` — run data validation, TypeScript compilation, and Vite build;
- `npm run test` — run focused pipeline and UI contract tests.

Generated JSON contains:

- source metadata and checksums;
- analytical records with source variants;
- canonical institutions and cities;
- president term metadata;
- the 2000–2025 context series, including national graduate throughput, mid-year population, per-capita rates, and named stock/flow indicators;
- `fieldGraduateComparison`, a versioned 2025-only exact-label comparison with source provenance, coverage counts, and every matched and unmatched appointment-field row;
- build-derived editorial facts and the versioned payload contract.

The exact field-comparison contract is:

```text
{
  schemaVersion: 1,
  year: 2025,
  source: { url, catalogUrl, sha256, retrievedOn },
  appointmentCount,
  matchedAppointmentCount,
  matchedAppointmentShare,
  distinctFieldCount,
  matchedDistinctFieldCount,
  rows: [{
    field,
    appointmentCount,
    graduateCount: number | null,
    graduatesPerAppointment: number | null,
    matchStatus: "exact" | "unmatched"
  }]
}
```

The all-time field ranking is intentionally not duplicated in generated JSON; the client derives it from analytical records so its totals cannot diverge from the explorer.

Timestamps that would make output nondeterministic are excluded. A source retrieval date may live in a committed provenance file updated only by `data:update`.

### Deployment

A GitHub Actions workflow builds on pushes to `main` and deploys the `dist` artifact with the official Pages actions. Vite's base path is relative/project-page safe. The workflow also supports manual dispatch. No deployment commit contains built `dist` output.

## Validation and failure behavior

The data build fails with actionable messages when:

- workbook names, sheet names, or exact headers differ;
- a required appointment name, institution, field, or date is missing;
- a date cannot be converted or is earlier than 2000;
- an appointment maps to zero or multiple presidential terms;
- an institution label lacks an explicit canonical mapping;
- a canonical institution lacks city metadata;
- a reviewed duplicate resolution no longer matches its source rows;
- a new same-name/same-date collision appears;
- contextual year labels or expected total rows are missing;
- context arithmetic does not reconcile with source columns;
- the graduate-by-field workbook's exact sheet set, 2025 titles, multirow headers, or 16-column structure changes;
- a study-program total is missing, negative, fractional, or cannot be reconciled across the seven non-overlapping `spolu` columns;
- graduate source provenance is incomplete or its committed bytes do not match the pinned SHA-256;
- generated headline values disagree with tested pinned-source expectations.

Optional faculty/title fields render as `neuvedené`, never as fabricated values. A client data-load failure replaces the atlas with a Slovak error panel containing source links; the rest of the semantic page shell remains readable.

## Testing and verification

Permanent tests defend observable contracts:

- primary workbook parsing and exact header/date conversion;
- 2,419 source rows, 41 reviewed secondary rows, and 2,378 analytical appointments for the pinned source;
- all records assigned to one president and one canonical institution;
- context parsing for 2000–2025, selected known national totals, graduate subset handling, and stock/flow indicators;
- graduate-by-field schema validation, seven-column arithmetic, aggregation across program codes and public/private/state sheets, and pinned 2025 totals;
- exact normalized field matching, complete matched/unmatched rows, nullable ratios, and reviewed 2025 coverage;
- all-time field grouping across case/diacritic/whitespace variants, deterministic representative labels, variant counts, shares, and first/last years;
- filter intersection, accent-insensitive search, URL round-trip, and CSV escaping/BOM;
- chart and field-table accessible labels, native sorting, keyboard interaction, and source/download links;
- filter-aware ceremony cadence, academic breadth, and top-three institutional concentration;
- incomplete 2026 context behavior;
- deterministic data generation, including all three pinned source checksums.

Before completion:

1. run data generation and compare deterministic output;
2. run focused unit/component tests;
3. run production build;
4. serve the actual `dist` output;
5. browser-test desktop and mobile layouts, the all-time field ranking and variant disclosures, the complete 2025 matched/unmatched comparison, source and pinned-download links, linked map/timeline filters, search with and without diacritics, president and institution filtering, Back/Forward URL state, record details, CSV download, methodology links, console errors, and reduced-motion behavior;
6. inspect the final visual surface at desktop and narrow mobile widths.

## Commit strategy

Commit coherent, working slices with Conventional Commits and explanatory bodies:

1. approved design and repository hygiene;
2. pinned sources and deterministic data pipeline;
3. static application shell and archival design system;
4. contextual series and linked atlas;
5. explorer, URL state, export, and methodology;
6. GitHub Pages deployment and final verification fixes.

Generated companion-session files remain ignored and are not product artifacts.

## Acceptance criteria

The work is complete when:

- the deployed artifact is a fully static GitHub Pages-compatible build;
- every analytical appointment is traceable to committed ministry workbook rows;
- source-row and analytical counts plus duplicate handling are visible;
- map, timeline, rankings, filters, and record list stay synchronized;
- students and academic staff appear as clearly labeled official context with stock/flow caveats;
- the all-time appointment-field ranking is derived from every analytical record using only case/diacritic/whitespace equivalence;
- the official graduate-by-field comparison is confined to 2025, aggregates every required source component once, exposes exact-match coverage and unmatched rows, and makes no historical, causal, quality, or inferred-category claim;
- 2026 is marked partial and has no fabricated context denominator;
- every professor is searchable and exportable;
- the page is Slovak, responsive, keyboard-operable, and visually follows the approved archival-atlas direction;
- data validation, tests, production build, and real-browser smoke scenarios pass;
- GitHub Pages deployment configuration is committed;
- all project work is captured in reviewed Conventional Commits.
