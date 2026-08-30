# Slovak Professors Atlas — Design Specification

## Status

Approved direction. The user selected a balanced public-data story and research explorer, an academic-map editorial frame, the interactive-atlas product model, and the archival visual language. The user subsequently approved an aggregate-first field comparison for 2009–2025, logarithmic and absolute scale modes, hover/focus previews with persistent click selection, and a reviewed 13-entry spelling-alias map.

## Goal

Build a polished Slovak-language static website showing every professor appointment in the Ministry of Education workbook from 2000 onward. The page must explain how the academic map of Slovakia changed across universities, faculties, cities, years, ceremonies, presidential terms, and reviewed appointment-field keys; support direct person lookup without claiming unique-person counts; contextualize annual appointments against official counts of university students, graduates, and academic staff; and compare appointment events with graduate events by exactly matched field over the common 2009–2025 period, with current students as secondary field context.

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
- 431 distinct cleaned analytical-record field labels, producing 429 normalization-only keys before reviewed spelling aliases;
- 450 distinct source-variant field strings, retained verbatim for provenance;
- 11 missing faculty values and no missing names, institutions, fields, or dates.

### Official higher-education context

- CVTI SR time-series catalog: <https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/casove-rady.html?page_id=9724>
- Workbook `radtab10.xls`: <https://www.cvtisr.sk/buxus/docs//JC/rady/radtab10.xls>
- Pinned SHA-256 at design time: `def7a52f5fe139dfcd01d88a141d3d65fafc33581a19082bf07fa62b1d06f59e`

The contextual series supplies national totals for students, first-, second-, and third-degree graduates, internal university teachers, and professors among internal teachers. The product uses academic years 2000/2001 through 2025/2026 and aligns each row to its starting calendar year. CVTI states that the figures are measured at 31 October; annual appointments and graduates are calendar-year flows, while student and staff values are point-in-time stocks. The interface states these distinctions wherever the series are compared.

Student and graduate totals each equal Slovak-citizen daily first/second-degree, foreign daily first/second-degree, external first/second-degree, and third-degree doctoral columns. Each source column is included exactly once. CVTI notes a staff-definition break in 2007: from that year, internal teachers mean teachers working the established full working time. The chart marks this break.

No student, graduate, or staff denominator is shown for 2026 because the official series currently ends at 2025/2026.

### Official graduates by study program, 2009–2025

- CVTI SR statistical-yearbook catalog: <https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/informacie-o-skolstve/statistiky/statisticka-rocenka-publikacia/statisticka-rocenka-vysoke-skoly.html?page_id=9596>
- Archived yearbooks for 2009/2010 through 2024/2025: `https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/vsYYYY.zip`
- Current 2025 workbook `abvs_2.xls`: <https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/abvs_2.xls>
- Pinned 2025 SHA-256: `2bfc9bf67bcf7c1d4ed5e80296d498f634a9c8c9b949bf70f839a9bf90ba7729`
- Exact sheets: `Tab2v` (public universities), `Tab2s` (private universities), and `Tab2š` (state universities)

The pipeline extracts the graduate workbook member from each 2009–2024 archive and uses the pinned direct workbook for 2025. Program-row identifiers have three validated eras: seven-digit legacy codes in 2009–2012, seven-character degree-bearing codes in 2013–2022, and the same codes followed by `/` from 2023. Legacy terminal `/Bc/` markers are removed from the program label; other punctuation remains significant.

For every program row, the pipeline sums the seven `spolu` columns exactly once: first-/second-degree daily Slovak citizens, first-/second-degree daily other citizens, first-/second-degree external study, third-degree daily Slovak citizens, third-degree daily other citizens, third-degree external study, and external educational institutions. Adjacent `z toho ženy` cells are subsets and are never added. Counts are summed across repeated program codes and the public, private, and state sheets only when the production-normalized program label is exactly equal after the reviewed spelling aliases.

Each annual parsed sum must equal the official national graduate total already stored in `context[year]`; generation fails on any mismatch. A label absent in a year remains `null`, producing a chart gap rather than a fabricated zero. Cumulative values sum graduation events across 2009–2025; they are not counts of unique natural persons.

### Official current students by study program

- Workbook `vs_4.xls`: <https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/vs_4.xls>
- Pinned SHA-256: `bbe547ad1042521fd71365a1c3b69ab8cfbaed054af295380492268dd9c19ff5`
- Public/private/state daily and external study-program sheets: `Tab5v`, `Tab12v`, `Tab5s`, `Tab12s`, `Tab5š`, and `Tab12š`

The parser adds only each row's Slovak-citizen total and foreign-citizen total; year, gender, and other subset columns are not added again. The national sum must reconcile to the official 2025/2026 student stock in `context[2025]`. Canonically matched current students appear only as secondary selected-field context, with exact-versus-alias provenance retained. An absent program-label match remains `null`, never zero.

Identical study-program names can appear under multiple codes and source categories. The product aggregates identical reviewed field keys for counting but does not infer a broad discipline taxonomy.

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
5. Never classify gender or infer a discipline taxonomy from names or source field strings. Field equivalence first applies case, diacritic, and whitespace normalization, then only the 13 explicitly reviewed spelling aliases below. Substring, synonym, code-family, punctuation-insensitive, category, singular/plural, and other guessed mappings are prohibited.

The source contains 41 reviewed likely duplicate appointments: 40 pairs on 20 January 2009 and one pair on 25 January 2010. Each pair has the same normalized first name, surname, and appointment date; many are byte-for-byte duplicates, while others differ in spacing, faculty, institution, or field text inside an evidently repeated source block.

The analytical dataset therefore contains **2,378 appointments**. Deduplication is not an open-ended fuzzy rule. A committed resolution table names the 41 secondary source rows and their retained primary rows. The build fails if a referenced row changes or an unreviewed same-name/same-date collision appears. Record details expose all source variants and row numbers. The methodology reports both 2,419 source rows and 2,378 analytical appointments.

Repeated names on different dates are not merged. The page never claims a count of unique natural persons.

The all-time appointment-field analysis is derived in the client from all 2,378 analytical records. Every record receives a deterministic `fieldKey`: production normalization followed by the committed alias map. The 431 analytical labels produce 429 normalization-only keys and 416 reviewed keys after the 13 singleton typos collapse into existing canonical targets. Raw `field` and `sourceVariants[].field` values never change. Alias groups display the approved target spelling; all other groups display the most frequent trimmed source variant with a Slovak lexical tie-break. Groups report appointment count and share, first and last appointment year, and every source-label variant with its own count.

The approved spelling aliases are:

| Source label | Canonical label |
| --- | --- |
| `mikobiológia` | `mikrobiológia` |
| `folkoristika` | `folkloristika` |
| `elektoenergetika` | `elektroenergetika` |
| `medzináro+dné vzťahy` | `medzinárodné vzťahy` |
| `fyzikálna metalutgia` | `fyzikálna metalurgia` |
| `verejné zravotníctvo` | `verejné zdravotníctvo` |
| `medziárodné podnikanie` | `medzinárodné podnikanie` |
| `silnoprúdová eletrotechnika` | `silnoprúdová elektrotechnika` |
| `teória vyučovcania matematiky` | `teória vyučovania matematiky` |
| `slovenské deijny` | `slovenské dejiny` |
| `odborová dadiktika` | `odborová didaktika` |
| `otorynolaringológia` | `otorinolaryngológia` |
| `tretsné právo` | `trestné právo` |

The build validates that every alias source and target still exists in the appointment universe and that the map contains no chain or cycle. Review-only terminology, punctuation, singular/plural, and taxonomy neighbors remain separate.

## Product structure

The site is one scrolling page with stable anchor navigation:

1. **Hero** — title, one-paragraph scope, coverage dates, analytical appointment count, number of ceremonies, and source disclosure.
2. **Three verified findings** — compact editorial observations computed from the reconciled appointment records, not hard-coded unsupported claims.
3. **Higher-education context** — selected-year exact values and normalized trends comparing appointments, graduates, students, and internal teachers.
4. **Appointment fields and education activity** — an aggregate 2009–2025 appointment-event × graduate-event map, selected-field annual detail, current-student context, and complete matched/unmatched rankings.
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

### Appointment fields: aggregate comparison and selected detail

The field section leads with one aggregate map over the common 2009–2025 period:

- each point is one reviewed appointment `fieldKey` with a canonical graduate-program key match; underlying appointment events retain whether the join was exact-normalized or recovered through an approved spelling alias;
- the x-axis is cumulative appointment events and the y-axis is cumulative graduation events;
- logarithmic axes are the default so the full distribution remains legible;
- an **Absolútna** control switches both axes to linear counts without changing selection, labels, or detail;
- low-opacity marks render the complete matched point cloud, while only the selected and a small generated set of leading/outlying fields receive persistent labels;
- generated coverage splits exact-normalized appointment matches from reviewed-alias recoveries, then reports their combined total and matched reviewed field keys; unmatched keys remain available in the ranking and are never plotted at zero.

The exploratory pinned-source baseline contains 1,347 exact-normalized appointment matches plus 7 reviewed-alias recoveries, or 1,354 of 1,400 appointment events in total. These form 232 plotted reviewed keys out of 250 appointment keys in the common period. The deterministic build and component tests must reproduce those values.

Hover or keyboard focus opens a clamped preview card containing the field label, both cumulative counts, graduates per appointment event, current 2025/2026 students when canonically matched, and match provenance. Provenance is `presná zhoda`, `schválená oprava`, or a mixed exact-plus-alias contribution with separate counts. The ratio divides two flows over the same period and is labelled descriptive; it is never called graduates per professor and never presented as causation, quality, capacity, or a person-level outcome. No student-stock/appointment-flow ratio is computed.

Click, touch, Enter, or Space persist the field selection, update the right-hand detail, and write the canonical field key to the URL. The detail shows cumulative totals, the descriptive ratio, current student context, and aligned annual appointment and graduate series. Missing annual graduate matches remain gaps. The current student stock is a separate context card, not a plotted axis or cumulative total.

The visual point radius may remain small, but interaction does not depend on that radius. Pointer and touch use nearest-point screen-space hit testing with a bounded tolerance. Exact-coordinate collisions form a deterministic group disclosed in the preview rather than silently hiding fields. The preview is clamped inside the plot. Keyboard access uses one roving chart focus target with directional arrow navigation, not 232 sequential tab stops; search and ranked views provide equivalent direct selection.

The register does not support active-professor headcounts by field and repeated names on different dates are not identity-merged. The section therefore says `záznamy o vymenovaní`, never total or current professors. National internal-professor stock remains contextual and cannot be disaggregated by field.

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

The linked atlas, findings, explorer, and records share one filter state:

- date range;
- president;
- city;
- canonical institution;
- source faculty label;
- reviewed appointment-field key;
- free-text query.

The aggregate field-education comparison is deliberately outside the active cohort. Its appointment axis, annual series, coverage, and ratio always use every analytical appointment from 2009–2025, matching the fixed national graduate window. Date, president, city, institution, faculty, and free-text filters never change those values. Only the reviewed field selection synchronizes both ways: an atlas/explorer field filter selects and pins the corresponding map point, while a map selection updates the shared field filter and URL without removing the rest of the point cloud.

The city map uses proportional symbols. Selecting a city filters the institution ranking, timeline, totals, and records. Selecting an institution reveals its faculty distribution. Timeline bars represent annual appointment counts; ceremony markers expose exact dates and sizes; presidential terms appear as labeled background bands.

Global search is case-insensitive and accent-insensitive across first name, surname, full display name, institution, faculty, and field. Search normalization affects matching only; displayed Slovak diacritics and punctuation remain untouched. The aggregate map has a separate field-only search over canonical labels and source variants; choosing a result sets the shared reviewed field key and pins it in the detail even when it has no graduate match.

Filter state, including selected field, is encoded in `URLSearchParams`. Reload, copy/paste, browser Back/Forward, and direct links preserve the view. The chart scale mode is presentational component state and does not alter analytical filters. A single reset action clears every filter. Invalid URL values are ignored safely and removed on the next state write.

Hover is supplemental. Click, touch, and keyboard provide complete functionality. Focused chart points expose the same preview as pointers. Result-count updates use a polite live region.

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

The desktop content width is approximately 1,200 px. Mobile layouts stack summary, aggregate field map, selected-field detail, map, ranking, timeline, and records; no analytical function disappears. Touch uses the same nearest-point selection as pointer input, and equivalent searchable rankings remain available when dense graphics are inconvenient.

## Technical architecture

### Frontend

- React and TypeScript;
- Vite static build;
- D3 modules for scales, shape generation, geography, and ticks only;
- React owns the DOM and interaction state;
- plain CSS with design tokens; no component framework or utility-CSS dependency.

The dataset is small enough for in-browser filtering and aggregation. The app loads one versioned static atlas JSON payload. Aggregates are derived in memoized selectors rather than duplicated across generated endpoints.

### Data pipeline

A Python pipeline managed by `uv` and pinned to `xlrd` reads committed official XLS inputs plus one pinned official JSON-stat population extract. The inputs include the appointment register, national context workbook, 2009–2025 graduate-by-program workbooks, and current student-by-program workbook. The Node frontend never parses source workbooks or contacts upstream services at runtime.

Commands:

- `npm run data:build` — validate every committed raw file and regenerate deterministic JSON;
- `npm run data:update` — download current direct inputs and annual archives, extract the named graduate members, pin checksums, regenerate, and print a review summary;
- `npm run build` — run data validation, TypeScript compilation, and Vite build;
- `npm run test` — run focused pipeline and UI contract tests.

Generated JSON contains:

- source metadata and checksums for every direct input and archive member;
- analytical records with raw source variants and deterministic reviewed `fieldKey` values;
- the reviewed field-alias map and canonical display labels;
- canonical institutions and cities;
- president term metadata;
- the 2000–2025 national context series;
- `fieldEducationComparison`, a versioned 2009–2025 graduate series plus current-student context keyed by reviewed field key;
- build-derived editorial facts and the versioned payload contract.

The field-education contract is:

```text
{
  schemaVersion: 2,
  startYear: 2009,
  endYear: 2025,
  graduateSources: [{
    year,
    url,
    archiveMember: string | null,
    sha256,
    retrievedOn
  }],
  currentStudentsSource: { year: 2025, url, catalogUrl, sha256, retrievedOn },
  years: [{
    year,
    programRowCount,
    nationalGraduateTotal
  }],
  rows: [{
    fieldKey,
    canonicalLabel,
    graduateCounts: Array<number | null>,
    currentStudentCount: number | null
  }]
}
```

The client derives fixed 2009–2025 appointment counts and annual appointment series from all analytical records, never from the active filtered cohort, then joins generated education rows by `fieldKey`. It computes cumulative graduate totals, descriptive same-period ratios, and coverage split into exact-normalized versus reviewed-alias appointment contributions. A record contributes to reviewed-alias coverage only when its production-normalized raw field differs from its committed `fieldKey`. This avoids duplicating appointment aggregates in generated JSON and prevents divergence from the explorer.

Timestamps that would make output nondeterministic are excluded. Retrieval dates live in committed provenance updated only by `data:update`.

### Deployment

A GitHub Actions workflow builds on pushes to `main` and deploys the `dist` artifact with the official Pages actions. Vite's base path is relative/project-page safe. The workflow also supports manual dispatch. No deployment commit contains built `dist` output.

## Validation and failure behavior

The data build fails with actionable messages when:

- workbook names, archive member names, sheet names, or validated headers differ;
- a required appointment name, institution, field, or date is missing;
- a date cannot be converted or is earlier than 2000;
- an appointment maps to zero or multiple presidential terms;
- an institution label lacks an explicit canonical mapping;
- a canonical institution lacks city metadata;
- a reviewed duplicate resolution no longer matches its source rows;
- a new same-name/same-date collision appears;
- a reviewed field alias source or target disappears, aliases chain or cycle, or an unreviewed alias appears;
- contextual year labels or expected total rows are missing;
- context arithmetic does not reconcile with source columns;
- an annual graduate workbook's expected sheets, year title, 16-column structure, or supported program-code schema changes;
- a graduate program total is missing, negative, fractional, or uses anything beyond the seven non-overlapping `spolu` columns;
- any annual graduate sum differs from `context[year].graduates`;
- the current student workbook schema changes or its parsed national sum differs from `context[2025].students`;
- source provenance is incomplete or committed bytes do not match pinned SHA-256 values;
- generated headline or coverage values disagree with tested pinned-source expectations.

Optional faculty/title fields render as `neuvedené`, never as fabricated values. A client data-load failure replaces the atlas with a Slovak error panel containing source links; the rest of the semantic page shell remains readable.

## Testing and verification

Permanent tests defend observable contracts:

- primary workbook parsing and exact header/date conversion;
- 2,419 source rows, 41 reviewed secondary rows, and 2,378 analytical appointments for the pinned source;
- all records assigned to one president, one canonical institution, and one deterministic reviewed field key;
- exact enforcement of the 13 approved spelling aliases, raw-label preservation, target display spelling, and rejection of punctuation/terminology/taxonomy neighbors;
- context parsing for 2000–2025, selected known national totals, subset handling, and stock/flow indicators;
- all three historical graduate program-code eras, seven-column arithmetic, aggregation across program codes and public/private/state sheets, and exact national-total reconciliation for every year 2009–2025;
- current student parsing, subset exclusion, exact national-total reconciliation, and nullable field matches;
- canonical reviewed-key joins, exact-versus-alias provenance counts, complete matched/unmatched coverage, annual `null` gaps, cumulative totals, and descriptive ratios;
- all-time field grouping, deterministic representative labels, variant counts, shares, and first/last years;
- active date, president, city, institution, faculty, and free-text filters leave field-map coordinates, coverage, ratios, and annual series unchanged while reviewed field selection still synchronizes through URL state;
- filter intersection, accent-insensitive search, field URL round-trip, and CSV escaping/BOM;
- aggregate chart accessible labels, log/absolute scale switching, complete point-cloud rendering, nearest-point hit testing, deterministic collision handling, clamped previews, persistent click selection, and roving arrow-key navigation;
- filter-aware ceremony cadence, academic breadth, and top-three institutional concentration;
- incomplete 2026 context behavior;
- deterministic data generation, including every pinned source checksum.

Before completion:

1. run data generation and compare deterministic output;
2. run focused unit/component tests;
3. run production build;
4. serve the actual `dist` output;
5. browser-test desktop and mobile layouts, both aggregate field-map scales, dense and corner point previews, collision handling, hover/focus versus persistent selection, direct touch selection, field URL state, complete matched/unmatched rankings, annual gaps, source and pinned-download links, linked map/timeline filters, search with and without diacritics, president and institution filtering, Back/Forward state, record details, CSV download, methodology links, console errors, and reduced-motion behavior;
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
- city map, timeline, rankings, shared filters, and record list stay synchronized;
- students and academic staff appear as clearly labelled official context with stock/flow caveats;
- the fixed aggregate field map compares all appointment and graduation events only over 2009–2025, offers logarithmic and absolute scales, separates exact matches from reviewed-alias recoveries, exposes unmatched keys, remains invariant under non-field cohort filters, and makes no active-professor, unique-person, causal, quality, or inferred-category claim;
- every appointment record uses the reviewed field key while retaining raw field and source-variant values;
- 2026 is marked partial and has no fabricated context denominator;
- every appointment record is searchable and exportable;
- the page is Slovak, responsive, keyboard-operable, and visually follows the approved archival-atlas direction;
- data validation, tests, production build, and real-browser smoke scenarios pass;
- GitHub Pages deployment configuration is committed;
- all project work is captured in reviewed Conventional Commits.
