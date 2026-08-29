# Slovak Professors Atlas — Design Specification

## Status

Approved direction. The user selected a balanced public-data story and research explorer, an academic-map editorial frame, the interactive-atlas product model, and the archival visual language. The user then delegated all remaining product decisions and requested implementation without further approval gates.

## Goal

Build a polished Slovak-language static website showing every professor appointment in the Ministry of Education workbook from 2000 onward. The page must explain how the academic map of Slovakia changed across universities, faculties, cities, years, ceremonies, and presidential terms; support direct person lookup; and contextualize annual appointments against official counts of university students, graduates, and academic staff.

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
5. Never classify gender or infer a discipline taxonomy from names or the 439 source field strings.

The source contains 41 reviewed likely duplicate appointments: 40 pairs on 20 January 2009 and one pair on 25 January 2010. Each pair has the same normalized first name, surname, and appointment date; many are byte-for-byte duplicates, while others differ in spacing, faculty, institution, or field text inside an evidently repeated source block.

The analytical dataset therefore contains **2,378 appointments**. Deduplication is not an open-ended fuzzy rule. A committed resolution table names the 41 secondary source rows and their retained primary rows. The build fails if a referenced row changes or an unreviewed same-name/same-date collision appears. Record details expose all source variants and row numbers. The methodology reports both 2,419 source rows and 2,378 analytical appointments.

Repeated names on different dates are not merged. The page never claims a count of unique natural persons.

## Product structure

The site is one scrolling page with stable anchor navigation:

1. **Hero** — title, one-paragraph scope, coverage dates, analytical appointment count, number of ceremonies, and source disclosure.
2. **Three verified findings** — compact editorial observations derived by the build, not hard-coded unsupported claims.
3. **Higher-education context** — selected-year exact values and normalized trends comparing appointments, graduates, students, and internal teachers.
4. **Linked academic atlas** — city map, ranked institutions, faculty drill-down, annual timeline, and presidential bands.
5. **Complete explorer** — search, filters, sortable records, details, and filtered CSV download.
6. **Methodology and sources** — definitions, duplicate handling, incomplete years, context caveats, downloads, checksums, and citations.

There is no carousel, autoplay, route hierarchy, or separate dashboard mode.

## Contextual comparisons

Appointments and graduates are annual flows; students and staff are stocks. The design names those units explicitly and never presents a stock/flow ratio as a conversion, causal effect, or headcount change.

### Exact selected-year panel

For a selected calendar year from 2000 through 2025, show:

- presidential appointments that year;
- first-, second-, and third-degree graduates that year;
- total students in the corresponding academic year;
- internal university teachers;
- professors among internal teachers;
- appointments per 1,000 graduates and the inverse graduates-per-appointment lens;
- appointments per 10,000 students;
- appointments per 1,000 internal teachers;
- appointments per 100 professors in the existing internal-professor stock;
- professors as a percentage of internal teachers.

Units and measurement dates are present in labels or adjacent notes, not hidden only in tooltips. Ratios always use the national appointment count stored in the selected `ContextYear`; local atlas filters never change these numerators.

### Indexed trend

A line chart indexes appointments, graduates, students, and internal teachers to 100 in 2000. Indexing makes differently sized series comparable without a misleading dual axis. Exact raw values appear on focus/hover and in the selected-year panel. The 2007 teacher-definition break and the missing 2026 context are visibly annotated.

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

- citation counts or other per-person bibliometrics without stable scholarly identifiers and manual entity-resolution review; names in the ministry workbook are insufficient to match authors safely, and unnormalized citation totals are biased by field and career length;
- a president leaderboard based on raw term totals;
- institution-level student/staff/graduate ratios without a consistent reconciled institution series;
- appointments as a percentage increase in professor headcount;
- a causal claim that appointments produced later staff changes;
- gender analysis inferred from names;
- field clusters created by undocumented keyword rules;
- regional choropleths, because records belong to proposing institutions rather than resident populations.

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

A Python pipeline managed by `uv` and pinned to `xlrd` reads the two legacy XLS sources. The Node frontend never parses spreadsheets.

Commands:

- `npm run data:build` — validate committed raw files and regenerate deterministic JSON;
- `npm run data:update` — download both upstream workbooks, record URLs/checksums, regenerate, and print a review summary;
- `npm run build` — run data validation, TypeScript compilation, and Vite build;
- `npm run test` — run focused pipeline and UI contract tests.

Generated JSON contains:

- source metadata and checksums;
- analytical records with source variants;
- canonical institutions and cities;
- president term metadata;
- the 2000–2025 context series, including graduate throughput and named stock/flow indicators;
- build-derived editorial facts and the versioned payload contract.

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
- generated headline values disagree with tested pinned-source expectations.

Optional faculty/title fields render as `neuvedené`, never as fabricated values. A client data-load failure replaces the atlas with a Slovak error panel containing source links; the rest of the semantic page shell remains readable.

## Testing and verification

Permanent tests defend observable contracts:

- primary workbook parsing and exact header/date conversion;
- 2,419 source rows, 41 reviewed secondary rows, and 2,378 analytical appointments for the pinned source;
- all records assigned to one president and one canonical institution;
- context parsing for 2000–2025, selected known totals, graduate subset handling, and stock/flow indicators;
- filter intersection, accent-insensitive search, URL round-trip, and CSV escaping/BOM;
- chart accessible labels and keyboard selection;
- filter-aware ceremony cadence, academic breadth, and top-three institutional concentration;
- incomplete 2026 context behavior;
- deterministic data generation.

Before completion:

1. run data generation and compare deterministic output;
2. run focused unit/component tests;
3. run production build;
4. serve the actual `dist` output;
5. browser-test desktop and mobile layouts, linked map/timeline filters, search with and without diacritics, president and institution filtering, Back/Forward URL state, record details, CSV download, methodology links, console errors, and reduced-motion behavior;
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
- 2026 is marked partial and has no fabricated context denominator;
- every professor is searchable and exportable;
- the page is Slovak, responsive, keyboard-operable, and visually follows the approved archival-atlas direction;
- data validation, tests, production build, and real-browser smoke scenarios pass;
- GitHub Pages deployment configuration is committed;
- all project work is captured in reviewed Conventional Commits.
