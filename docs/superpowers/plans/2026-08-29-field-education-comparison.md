# Field Education Comparison Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 2025-only exact-name table with an appointment-event × graduate-event map over the 2009–2025 availability envelope, an inclusive user-selected range, fixed 2025 current-student context, reviewed field keys, and accessible interaction.

**Architecture:** A deterministic Python pipeline owns reviewed field identity, official workbook parsing, national reconciliation, and the versioned `fieldEducationComparison` payload. React derives appointment and education aggregates for an independent URL-persisted range inside 2009–2025, joins rows by `fieldKey`, and renders the scatter map, selected-field annual detail, search, complete rankings, and additive share summaries without consulting non-field cohort filters. Pure geometry helpers keep projection, collision layout, nearest-point hit-testing, and preview-independent chart placement testable outside React.

**Tech Stack:** Python 3.12, `uv`, `xlrd`, `pytest`, React 19, TypeScript, Vite, Vitest, Testing Library, `d3-scale`, `d3-shape`, plain CSS.

**Spec:** `docs/superpowers/specs/2026-08-29-slovak-professors-atlas-design.md`

**Supersession:** This focused plan is the authoritative field-comparison
contract. It supersedes the 2025-only requirements in
`2026-08-29-slovak-professors-atlas.md` Global Constraints 21–23, its
`pipeline/graduates.py` and `graduates-by-field-2025.xls` file entries, and
its former Task 11. When the two plans conflict, implement this plan's
reviewed 2009–2025 graduate history, separate 2025 student stock, schema-2
payload, and clean legacy removal.

## Global Constraints

- The site remains fully static and GitHub Pages-compatible; no runtime upstream requests, backend, database, CMS, or map-tile service.
- The comparison window is exactly calendar years 2009 through 2025.
- Appointment and graduate values are event flows; current students are a stock at 31 October 2025 and never form a ratio with appointments.
- Appointment counts are records of appointment events, not active-professor or unique-person counts.
- The visible section title is **„Profesorské vymenovania × absolventi“**, not **„Profesori × absolventi“**; `vymenovania` prevents a person-count claim.
- Field equivalence is production normalization followed only by the approved 13 spelling aliases. Punctuation, terminology, singular/plural, synonyms, substrings, program codes, and inferred taxonomies remain separate.
- Raw `field` and `sourceVariants[].field` values remain unchanged.
- Missing annual graduate matches and missing current-student matches remain `null`, never fabricated zeroes.
- Every annual graduate sum equals `context[year].graduates`; current students equal `context[2025].students`.
- The field comparison defaults to the 2009–2025 availability envelope and accepts an inclusive `fieldStartYear`–`fieldEndYear` subrange. It recomputes coordinates, ratios, coverage, annual series, rankings, and additive shares from all analytical records and graduate values inside that range; current students remain fixed 2025 stock.
- Build ranged rows from the union of appointment and education keys. A field with graduates but zero appointments remains in rankings and graduate shares with `graduatesPerAppointment: null`, but is excluded from the logarithmic scatter.
- Reviewed field selection plus `fieldStartYear` and `fieldEndYear` synchronize with atlas state and `URLSearchParams`; date, president, city, institution, faculty, appointed-date, and query filters remain independent. Scale mode remains local presentation state.
- React owns the DOM. D3 is limited to scales, ticks, and line generation.
- Visible copy, labels, dates, and number formatting are Slovak.
- Preserve the archival visual system, WCAG AA contrast, non-color selection encoding, keyboard/touch access, and reduced-motion behavior.
- Use Conventional Commits with an explanatory body. Inspect the staged file list and diff before each commit; verify full message and author/committer metadata afterward.

---

### Task 1: Reviewed Field Identity Contract

**Files:**
- Create: `data/config/field-aliases.json`
- Create: `pipeline/fields.py`
- Create: `tests/data/test_fields.py`
- Modify: `pipeline/build.py`
- Modify: `src/data/types.ts`
- Modify: `src/data/load.ts`
- Modify: `src/analysis/selectors.ts`
- Modify: `src/analysis/selectors.test.ts`
- Modify: `src/state/filters.ts`
- Modify: `src/state/filters.test.ts`
- Modify: every TypeScript fixture builder under `src/**/*.test.ts` and `src/**/*.test.tsx` that constructs an `Appointment` or `AtlasData`
- Regenerate: `public/data/atlas.json`

**Interfaces:**
- Produces Python `FieldCatalog` with `key_for(label: str) -> str`, `label_for(field_key: str) -> str`, and `is_alias(label: str) -> bool`.
- Produces JSON `fieldCatalog: {schemaVersion: 1, aliases: Array<{sourceLabel, sourceKey, targetLabel, targetKey}>, labels: Record<string, string>}`.
- Adds `fieldKey: string` to generated `records[]` while leaving raw fields untouched.
- Changes `fieldAppointmentRanking(records, labels)` to group on `Appointment.fieldKey` and display `fieldCatalog.labels[fieldKey]`.

- [ ] **Step 1: Write failing field-catalog tests**

Create `tests/data/test_fields.py` with exact assertions:

```python
from pathlib import Path

import pytest

from pipeline.fields import FieldAliasError, build_field_catalog
from pipeline.professors import load_appointments

ROOT = Path(__file__).resolve().parents[2]


def test_reviewed_aliases_assign_keys_without_mutating_raw_labels() -> None:
    appointments = load_appointments(ROOT / "public/data/source/professors.xls").appointments
    catalog = build_field_catalog(appointments, ROOT / "data/config/field-aliases.json")
    assert len(catalog.aliases) == 13
    assert len(catalog.labels) == 416
    assert catalog.key_for("verejné zravotníctvo") == "verejne zdravotnictvo"
    assert catalog.label_for("verejne zdravotnictvo") == "verejné zdravotníctvo"
    assert catalog.key_for("medzináro+dné vzťahy") == "medzinarodne vztahy"
    assert any(item.field == "verejné zravotníctvo" for item in appointments)


def test_unreviewed_neighbors_remain_separate() -> None:
    appointments = load_appointments(ROOT / "public/data/source/professors.xls").appointments
    catalog = build_field_catalog(appointments, ROOT / "data/config/field-aliases.json")
    assert catalog.key_for("medzinárodné vzťahy") != catalog.key_for("medzinárodné-vzťahy")
    assert catalog.key_for("právo") != catalog.key_for("občianske právo")
```

Add three explicit temporary JSON fixtures asserting `FieldAliasError` for a missing target, a chain, and a cycle.

- [ ] **Step 2: Run the tests and confirm the missing module failure**

```bash
uv run pytest tests/data/test_fields.py -q
```

Expected: collection fails because `pipeline.fields` does not exist.

- [ ] **Step 3: Implement the exact alias registry**

Store only the 13 approved display-label pairs in `data/config/field-aliases.json`. Normalize both sides with `normalize_search(normalize_display(label))`; verify every source and target exists in the analytical appointment universe; reject identities, duplicate normalized sources, chains, and cycles. Expose immutable mappings:

```python
@dataclass(frozen=True, slots=True)
class FieldCatalog:
    aliases: Mapping[str, str]
    labels: Mapping[str, str]
    alias_entries: Sequence[FieldAliasEntry]

    def key_for(self, label: str) -> str:
        normalized = normalize_search(normalize_display(label))
        return self.aliases.get(normalized, normalized)
```

Alias targets display the approved target spelling. Other groups display the most frequent trimmed analytical `appointment.field`; break count ties with a deterministic Slovak token order including `dz`, `dž`, and `ch`, then the original Unicode string.

- [ ] **Step 4: Publish reviewed keys without mutating provenance**

Build the catalog once in `build_atlas()`, pass it to `_appointment_payload()`/`build_payload()`, emit `fieldKey` and top-level `fieldCatalog`, and require every record key to exist in `fieldCatalog.labels` in `src/data/load.ts`.

- [ ] **Step 5: Migrate client grouping and filtering**

Use this selector signature:

```ts
export function fieldAppointmentRanking(
  records: readonly Appointment[],
  labels: Readonly<Record<string, string>>,
): FieldAppointmentRankingRow[]
```

Group event counts on `appointment.fieldKey`. Use `sourceVariants[].field` only for source-row variant provenance; source-row counts may exceed analytical event counts and never alter event shares. Update `createFilterOptions()` and all callsites. Remove field identity based on `normalizeForSearch(appointment.field)`.

- [ ] **Step 6: Pin source invariants and run targeted checks**

Assert 431 analytical display labels, 429 normalization-only keys, 416 reviewed keys, 450 distinct source-variant strings, 13 target spellings, URL options using reviewed keys, and unchanged typo source strings. Run:

```bash
uv run pytest tests/data/test_fields.py tests/data/test_build.py -q
npm test -- --run src/analysis/selectors.test.ts src/state/filters.test.ts src/state/url.test.ts src/App.test.tsx
npm run data:build
```

Expected: all pass and generated records/catalog are stable.

- [ ] **Step 7: Commit**

```bash
git commit -F - <<'EOF'
feat: add reviewed field identities

Previously field groups were derived independently from normalized display
text; this commit assigns one validated reviewed key to every appointment.
Raw appointment and source-variant labels remain unchanged for provenance.

- Add the approved 13-entry alias registry and validation
- Publish canonical field labels and per-record field keys
- Migrate field grouping, filters, and tests to reviewed keys
EOF
```

Use the repository-required staged-diff and post-commit checks.

---

### Task 2: Pinned Historical Education Inputs

**Files:**
- Modify: `public/data/provenance.json`
- Modify: `scripts/update_data.py`
- Modify: `tests/data/test_update_data.py`
- Move: `public/data/source/graduates-by-field-2025.xls` to `public/data/source/graduates-by-field/2025.xls`
- Create: `public/data/source/graduates-by-field/2009.xls`
- Create: `public/data/source/graduates-by-field/2010.xls`
- Create: `public/data/source/graduates-by-field/2011.xls`
- Create: `public/data/source/graduates-by-field/2012.xls`
- Create: `public/data/source/graduates-by-field/2013.xls`
- Create: `public/data/source/graduates-by-field/2014.xls`
- Create: `public/data/source/graduates-by-field/2015.xls`
- Create: `public/data/source/graduates-by-field/2016.xls`
- Create: `public/data/source/graduates-by-field/2017.xls`
- Create: `public/data/source/graduates-by-field/2018.xls`
- Create: `public/data/source/graduates-by-field/2019.xls`
- Create: `public/data/source/graduates-by-field/2020.xls`
- Create: `public/data/source/graduates-by-field/2021.xls`
- Create: `public/data/source/graduates-by-field/2022.xls`
- Create: `public/data/source/graduates-by-field/2023.xls`
- Create: `public/data/source/graduates-by-field/2024.xls`
- Create: `public/data/source/current-students-by-field-2025.xls`
- Modify: `pipeline/build.py` only to point the existing 2025 parser at the moved file until Task 7

**Interfaces:**
- Provenance gains `fieldEducation.graduateSources`, exactly 17 ordered `{year, url, archiveMember, sha256, retrievedOn, localPath}` entries, and `fieldEducation.currentStudentsSource`.
- `archiveMember` is exact for 2009–2024 and `null` for direct 2025.
- `download_sources()` remains atomic across direct downloads and extracted archive members.

- [ ] **Step 1: Write failing updater archive tests**

Create in-memory ZIP responses and assert extracted bytes land at standardized paths. Add failures for renamed member, changed extracted-member checksum, and a late download error; every prior destination and provenance file must remain byte-identical.

```python
assert (destination / "graduates-by-field/2009.xls").read_bytes() == GRADUATE_2009_BYTES
assert (destination / "graduates-by-field/2025.xls").read_bytes() == GRADUATE_2025_BYTES
assert (destination / "current-students-by-field-2025.xls").read_bytes() == STUDENT_BYTES
```

- [ ] **Step 2: Run updater tests and confirm annual sources are unsupported**

```bash
uv run pytest tests/data/test_update_data.py -q
```

- [ ] **Step 3: Implement direct/archive source plans**

```python
@dataclass(frozen=True, slots=True)
class SourcePlan:
    name: str
    url: str
    destination: Path
    sha256: str | None
    archive_member: str | None = None
```

For archives, download to a temporary file, require the exact member, stream the extracted XLS into a staged file, hash extracted bytes, and replace only after all sources/provenance succeed.

- [ ] **Step 4: Pin exact member names and sources**

Use:

```text
2009 abvs2009.XLS   2010 abvs2010.XLS   2011 abvs2011.XLS
2012 abvs2012.XLS   2013 abvs2013.XLS   2014 abvs2014.xls
2015 abvs2015.xls   2016 abvs2016.xls   2017 abvs2017.xls
2018 abvs_2018.xls  2019 abvs_2019.xls  2020 abvs_2020.xls
2021 abvs_2021.xls  2022 abvs2022.xls   2023 abvs2023.xls
2024 abvs2024.xls   2025 null
```

Use archive URLs `https://www.cvtisr.sk/buxus/docs//JC/ROCENKA/VS/vsYYYY.zip`, the direct 2025 URL, and `vs_4.xls` from the spec. Pin current-student SHA-256 `bbe547ad1042521fd71365a1c3b69ab8cfbaed054af295380492268dd9c19ff5`.

- [ ] **Step 5: Download, review, and test inputs**

```bash
npm run data:update -- --accept-new-checksums
uv run pytest tests/data/test_update_data.py tests/data/test_build.py -q
```

Expected: 17 standardized graduate XLS files and one student XLS; no ZIP is committed; updater atomicity and the interim build pass.

- [ ] **Step 6: Commit**

```bash
git commit -F - <<'EOF'
data: pin historical field education sources

Previously the repository retained only the 2025 graduate workbook; this
commit pins the complete common-period graduate series and current students.
Archive extraction remains checksum-verified and transaction-safe.

- Add standardized graduate workbooks for 2009 through 2025
- Add the official 2025 current-student workbook
- Extend provenance and rollback tests for archive members
EOF
```

Inspect and verify as required.

---

### Task 3: Education Workbook Parsers

**Files:**
- Create: `pipeline/field_education.py`
- Create: `tests/data/test_field_education.py`
- Reuse conventions from: `pipeline/graduates.py`, `pipeline/context.py`, `tests/data/test_graduates.py`, `tests/data/test_context.py`

**Interfaces:**
- Produces `ProgramFieldDataset(year, program_row_count, national_total, counts_by_field_key)`.
- Produces `load_graduate_fields(path, year, catalog)` and `load_current_student_fields(path, catalog)`.
- Aggregates repeated program codes/sheets by reviewed key; program codes never establish equivalence.

- [ ] **Step 1: Write failing graduate-era and arithmetic tests**

```python
@pytest.mark.parametrize(
    ("year", "cell", "expected"),
    [
        (2009, "1113700 matematika /Bc/", "matematika"),
        (2013, "1113R00 matematika", "matematika"),
        (2023, "1113R00/        matematika", "matematika"),
    ],
)
def test_graduate_program_row_eras(year: int, cell: str, expected: str) -> None:
    assert graduate_program_label(cell, year) == expected
```

Assert terminal `/Bc/` removal only, punctuation preservation, sum of columns `(2, 4, 6, 8, 10, 12, 14)` exactly once, exclusion of adjacent women subsets, aggregation across three sheets, and rejection of missing/negative/fractional totals.

- [ ] **Step 2: Write failing student subset tests**

Build all six fake program sheets. Put Slovak total `48` in column 3, foreign total `7` in column 12, and large subset values elsewhere. Assert exactly `55`.

- [ ] **Step 3: Run tests and confirm the missing module failure**

```bash
uv run pytest tests/data/test_field_education.py -q
```

- [ ] **Step 4: Implement strict graduate parsing**

Require `Tab2v`, `Tab2s`, `Tab2š`, 16 columns, requested-year title, and validated headers. Parse only the requested era:

```python
LEGACY_PROGRAM_ROW = re.compile(r"^(\d{7})\s+(\S(?:.*?\S)?)(?:\s+/Bc/)?$")
MIDDLE_PROGRAM_ROW = re.compile(r"^(\d{4}[A-Z]\d{2})\s+(\S(?:.*\S)?)$")
CURRENT_PROGRAM_ROW = re.compile(r"^(\d{4}[A-Z]\d{2})/\s*(\S(?:.*\S)?)$")
GRADUATE_TOTAL_COLUMNS = (2, 4, 6, 8, 10, 12, 14)
```

Reject coded rows without labels. Resolve labels through `catalog.key_for()` and retain official zeroes.

- [ ] **Step 5: Implement strict current-student parsing**

Require the workbook's 12-sheet set and parse only `Tab5v`, `Tab12v`, `Tab5s`, `Tab12s`, `Tab5š`, `Tab12š`. Require 14 columns, 2025 titles, and reviewed headers. For matched code-plus-slash program rows compute only:

```python
student_total = source_integer(row[3]) + source_integer(row[12])
```

- [ ] **Step 6: Add pinned national reconciliation**

Load all committed inputs and compare each `national_total` to `load_context()`. Pin:

```python
assert graduates_2025.program_row_count == 1_723
assert graduates_2025.national_total == 37_627
assert graduates_2025.counts_by_field_key["psychologia"] == 1_146
assert current_students.national_total == 148_189
assert current_students.counts_by_field_key["socialna praca"] == 4_505
assert current_students.counts_by_field_key["verejne zdravotnictvo"] == 785
```

- [ ] **Step 7: Run and commit**

```bash
uv run pytest tests/data/test_field_education.py tests/data/test_fields.py -q
git commit -F - <<'EOF'
feat: parse field education workbooks

Previously field-level parsing understood only the current graduate file;
this commit validates every graduate era and the current-student workbook.
All parsed national totals reconcile before field counts are usable.

- Parse 2009 through 2025 graduate program rows and totals
- Parse current students without double-counting subset columns
- Add schema, arithmetic, alias, and reconciliation tests
EOF
```

Perform staged-diff and metadata checks.

---

### Task 4: Fixed Aggregate Client Selector

**Files:**
- Create: `src/analysis/fieldEducation.ts`
- Create: `src/analysis/fieldEducation.test.ts`
- Modify: `src/data/types.ts` to add schema-2 types without replacing the live schema until Task 7

**Interfaces:**
- Consumes all `Appointment[]`, `FieldCatalog`, and schema-2 `FieldEducationComparison`.
- Produces `buildFieldEducationLandscape(records, catalog, comparison)` with `points`, `unmatched`, `allRows`, `coverage`, and annual series.

- [ ] **Step 1: Define the stable generated types**

```ts
export interface FieldEducationComparison {
  schemaVersion: 2
  startYear: 2009
  endYear: 2025
  graduateSources: GraduateFieldYearSource[]
  currentStudentsSource: CurrentStudentFieldSource
  years: FieldEducationYearMetadata[]
  rows: FieldEducationRow[]
}

export interface FieldEducationRow {
  fieldKey: string
  canonicalLabel: string
  graduateCounts: Array<number | null>
  currentStudentCount: number | null
}
```

`graduateCounts[index]` corresponds exactly to `years[index].year`.

- [ ] **Step 2: Write failing fixed-window tests**

Use inside/outside-window records, exact and alias contributions, a null graduate year, a real zero, and an unmatched key. Assert current students never enter the ratio and records from 2008/2026 never enter aggregates.

```ts
expect(landscape.coverage).toEqual({
  exactAppointmentCount: 2,
  aliasAppointmentCount: 1,
  matchedAppointmentCount: 3,
  appointmentCount: 4,
  matchedFieldCount: 1,
  fieldCount: 2,
  yearCount: 17,
})
```

- [ ] **Step 3: Run the test and confirm the missing implementation**

```bash
npm test -- --run src/analysis/fieldEducation.test.ts
```

- [ ] **Step 4: Implement the join and provenance split**

```ts
export interface FieldEducationPoint {
  fieldKey: string
  canonicalLabel: string
  appointmentCount: number
  exactAppointmentCount: number
  aliasAppointmentCount: number
  graduateCount: number
  graduatesPerAppointment: number
  currentStudentCount: number | null
  annual: Array<{ year: number; appointmentCount: number; graduateCount: number | null }>
  variants: FieldLabelVariant[]
}
```

A record is alias-recovered exactly when `normalizeForSearch(record.field) !== record.fieldKey`. A generated row is matched when at least one annual graduate value is non-null. Sum non-null graduate events and divide by appointment events without pre-rounding. Keep unmatched keys with null graduate total/ratio.

- [ ] **Step 5: Pin production coverage and invariance**

```ts
expect(landscape.coverage.exactAppointmentCount).toBe(1_347)
expect(landscape.coverage.aliasAppointmentCount).toBe(7)
expect(landscape.coverage.matchedAppointmentCount).toBe(1_354)
expect(landscape.coverage.appointmentCount).toBe(1_400)
expect(landscape.points).toHaveLength(232)
expect(landscape.coverage.fieldCount).toBe(250)
```

Assert the result is unchanged while the separate atlas cohort receives each non-field filter.

- [ ] **Step 6: Run and commit**

```bash
npm test -- --run src/analysis/fieldEducation.test.ts src/analysis/selectors.test.ts
git commit -F - <<'EOF'
feat: derive fixed field education aggregates

Previously the client had no common-period field join; this commit derives
appointment and graduate event aggregates from the approved fixed window.
The selector keeps reviewed provenance and missing annual values explicit.

- Join schema-2 education rows to reviewed appointment keys
- Split exact and alias-recovered appointment coverage
- Add fixed-window, null-gap, ratio, and invariance tests
EOF
```

Perform required commit checks.

---

### Task 5: Scatter Geometry and Accessible Map

**Files:**
- Create: `src/components/fieldEducationGeometry.ts`
- Create: `src/components/fieldEducationGeometry.test.ts`
- Create: `src/components/FieldEducationScatter.tsx`
- Create: `src/components/FieldEducationScatter.test.tsx`
- Modify: `src/styles/components.css`

**Interfaces:**
- Consumes `FieldEducationPoint[]`, selected key, and `onFieldSelect(fieldKey)`.
- Produces local `ScaleMode = 'log' | 'linear'`.
- Exposes pure `projectFieldPoints`, `nearestProjectedPoint`, `clampPreview`, `nextDirectionalPoint`, and `generatedLabelKeys`.
- The SVG has one keyboard focus target, not 232 tab stops.

- [ ] **Step 1: Write failing geometry tests**

Cover log/linear projection, zero-inclusive linear domains, deterministic exact-coordinate offsets/groups, bounded tolerance, four-edge clamping, directional arrows, and generated labels.

```ts
expect(nearestProjectedPoint(points, { x: 12, y: 10 }, 6)?.fieldKey).toBe('a')
expect(nearestProjectedPoint(points, { x: 80, y: 80 }, 6)).toBeNull()
expect(clampPreview({ x: -20, y: 190, width: 90, height: 60 }, bounds)).toEqual({ x: 8, y: 132 })
expect(nextDirectionalPoint(points, 'center', 'right')).toBe('east')
```

- [ ] **Step 2: Run and confirm the missing geometry module**

```bash
npm test -- --run src/components/fieldEducationGeometry.test.ts
```

- [ ] **Step 3: Implement projection, collision layout, and labels**

Use `scaleLog` for positive count domains and `scaleLinear` with zero-inclusive domains for absolute mode. Preserve analytical coordinates; offset only rendered positions for exact collisions in canonical-key order around a small ring. Include the original coordinate and complete `collisionKeys`. Persistent labels are the union of selected key, top three appointment counts, top three graduate counts, and minimum/maximum ratio.

- [ ] **Step 4: Write failing component interaction tests**

Assert logarithmic default, absolute toggle, all points in both modes, nearest overlay pointer preview, tolerance miss, click/touch selection, Enter/Space selection, directional/Home/End navigation, mixed provenance, collision disclosure, clamped preview, and selection persistence across scale changes.

- [ ] **Step 5: Implement the React-owned SVG**

Render axes/ticks/grid, low-opacity marks, selected ring/crosshair, labels, and one transparent interaction rectangle. Convert client coordinates through `getBoundingClientRect()` into viewBox coordinates and use tolerance equivalent to 24 CSS pixels. The one focus target uses `tabIndex={0}`, an updated Slovak accessible label, arrows/Home/End, Enter/Space, and a polite live region. Preview HTML is clamped inside the plot.

- [ ] **Step 6: Add archival/responsive styles and run tests**

Use existing paper/forest/terracotta/brass/sage tokens, 44-pixel controls, shape plus color selection, narrow-screen containment, and existing reduced-motion rules.

```bash
npm test -- --run src/components/fieldEducationGeometry.test.ts src/components/FieldEducationScatter.test.tsx
```

- [ ] **Step 7: Commit**

```bash
git commit -F - <<'EOF'
feat: add accessible field event map

Previously field comparisons had no visual distribution or dense-point
interaction; this commit adds the approved logarithmic and absolute map.
Its geometry is deterministic and does not depend on tiny visible marks.

- Render the complete matched point cloud in two scale modes
- Add nearest-point, collision, clamping, and label geometry
- Add pointer, touch, and single-target keyboard tests
EOF
```

Perform required commit checks.

---

### Task 6: Selected Detail, Search, and Rankings

**Files:**
- Create: `src/components/FieldEducationDetail.tsx`
- Create: `src/components/FieldEducationDetail.test.tsx`
- Create: `src/components/FieldEducationRankings.tsx`
- Create: `src/components/FieldEducationRankings.test.tsx`
- Create: `src/components/FieldEducationComparison.tsx`
- Create: `src/components/FieldEducationComparison.test.tsx`
- Modify: `src/styles/components.css`

**Interfaces:**
- Parent consumes `{comparison, fieldCatalog, allRecords, selectedField, onFieldSelect}` and never accepts filtered records.
- Detail renders cumulative values and separate annual appointment/graduate mini-charts.
- Rankings search canonical labels and raw source variants and expose every matched/unmatched key.

- [ ] **Step 1: Write failing detail tests**

For `sociálna práca`, assert 46 appointment events, 62 122 graduates, ratio 1 350,48, 4 505 current students, flow/stock wording, 17 appointment bars, and a graduate path split at a null year. For unmatched fields, assert explicit missing text rather than numeric zero.

- [ ] **Step 2: Implement separate annual views**

Render appointments as 17 accessible bars. Render graduates using `line().defined(({graduateCount}) => graduateCount !== null)` so gaps remain gaps. Do not use a dual axis. Label the ratio `opisný pomer dvoch tokov za spoločné obdobie` and students `stav k 31. 10. 2025 · kontext, nie súčasť osi`.

- [ ] **Step 3: Write failing search/ranking tests**

Assert accent-insensitive canonical search and typo-source search both find `verejné zdravotníctvo`. Assert matched and unmatched tables together contain every common-window key; rows select canonical keys; missing education stays absent.

- [ ] **Step 4: Implement complete searchable rankings**

Use local search over canonical label plus variants. Keep separate semantic sortable tables for matched and unmatched fields. Search changes visibility only, not totals/shared filters.

- [ ] **Step 5: Write failing parent composition tests**

Assert pinned coverage (`1 347 + 7`, `1 354 z 1 400`, `232 z 250`, `17 rokov`), leading field as local default without a filter write, URL-selected matched/unmatched fields, complete cloud retention, and one selection callback path from map/search/ranking.

- [ ] **Step 6: Compose the section**

Use title **„Profesorské vymenovania × absolventi“**. Structure: intro, map left, selected detail right, coverage strip, searchable matched/unmatched rankings, caveat, sources. Use `selectedField ?? leadingMatchedFieldKey` only for displayed local detail; only actual user selection calls `onFieldSelect`.

- [ ] **Step 7: Run and commit**

```bash
npm test -- --run src/components/FieldEducationDetail.test.tsx src/components/FieldEducationRankings.test.tsx src/components/FieldEducationComparison.test.tsx
git commit -F - <<'EOF'
feat: add selected field education detail

Previously the aggregate map had no complete accessible companion views;
this commit adds annual detail, canonical search, and full rankings.
Stock and flow values remain visibly separate throughout the section.

- Add selected-field annual appointment and graduate views
- Add current-student context without a stock-to-flow ratio
- Add canonical/source-variant search and unmatched rankings
EOF
```

Perform required commit checks.

---

### Task 7: Schema-2 Pipeline and Application Cutover

**Files:**
- Modify: `pipeline/field_education.py`
- Modify: `pipeline/build.py`
- Remove: `pipeline/graduates.py`
- Remove: `tests/data/test_graduates.py` after moving retained contracts into `tests/data/test_field_education.py`
- Modify: `tests/data/test_build.py`
- Modify: `scripts/update_data.py`
- Modify: `public/data/provenance.json`
- Modify: `src/data/types.ts`
- Modify: `src/data/load.ts`
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Remove: `src/components/FieldGraduateComparison.tsx`
- Remove: `src/components/FieldGraduateComparison.test.tsx`
- Modify: `src/analysis/selectors.ts`
- Modify: `src/analysis/selectors.test.ts`
- Modify: `src/components/Methodology.tsx`
- Modify: every test fixture constructing `AtlasData`
- Regenerate: `public/data/atlas.json`

**Interfaces:**
- Replaces `fieldGraduateComparison` with `fieldEducationComparison`; no compatibility key remains.
- Emits the design spec's exact schema 2.
- Removes `filterAppointmentsExceptField()` and `comparisonRecords`.
- Keeps `filters.field` URL behavior using reviewed keys.

- [ ] **Step 1: Write failing schema-2 build tests**

```python
comparison = payload["fieldEducationComparison"]
assert comparison["schemaVersion"] == 2
assert comparison["startYear"] == 2009
assert comparison["endYear"] == 2025
assert [item["year"] for item in comparison["graduateSources"]] == list(range(2009, 2026))
assert [item["year"] for item in comparison["years"]] == list(range(2009, 2026))
assert comparison["currentStudentsSource"]["year"] == 2025
assert "fieldGraduateComparison" not in payload
```

Assert every `graduateCounts` length is 17, labels equal `fieldCatalog`, nulls remain null, students are nullable, and pin `sociálna práca` (62 122, 4 505) plus `verejné zdravotníctvo` (5 968, 785).

- [ ] **Step 2: Run and confirm old-schema failures**

```bash
uv run pytest tests/data/test_build.py tests/data/test_field_education.py -q
```

- [ ] **Step 3: Build schema 2 with reconciliation**

Implement `build_field_education_comparison(graduate_datasets, current_students, catalog, context, graduate_sources, current_students_source)`. Require exact years 2009–2025, reconcile every national total, and emit one row for every reviewed appointment field key in canonical-label order. Missing labels emit `None`; observed zero emits `0`.

- [ ] **Step 4: Wire all inputs and remove schema 1**

Load catalog, 17 graduate workbooks, current students, and context once. Emit only `fieldEducationComparison`; delete the old module/API/source-key code. Make `data:update` regenerate deterministic JSON after successful source replacement. Leave no wrapper around `build_field_graduate_comparison`.

- [ ] **Step 5: Replace TypeScript types and guards cleanly**

Remove old interfaces. Validate exact schema/bounds, 17 ordered years/sources, SHA-256 values, nullable non-negative integers, array lengths, unique catalog-backed keys, canonical labels, national metadata versus context, and record catalog references. Reject schema 1 and the old key.

- [ ] **Step 6: Integrate the component and delete filter coupling**

Use symbol-aware rename/navigation. Render:

```tsx
<FieldEducationComparison
  comparison={data.fieldEducationComparison}
  fieldCatalog={data.fieldCatalog}
  allRecords={data.records}
  selectedField={atlasState.filters.field}
  onFieldSelect={(field) => atlasState.setFilter('field', field, 'push')}
/>
```

Delete the filtered-record memo, obsolete selector, old component/tests, and schema-1 names. Keep anchor `odbory-absolventi`.

- [ ] **Step 7: Rewrite methodology and source UI**

Document fixed 2009–2025 graduate events, seven-column arithmetic, current students as 2025 stock, 13 reviewed corrections, exact/alias/mixed provenance, event-ratio caveat, no active-professor/unique-person/causal/quality claim, archive/direct/local links, retrieval dates, and checksums.

- [ ] **Step 8: Add application-level invariance and URL tests**

Change each non-field filter and assert accessible map coordinates/coverage/detail remain identical. Select `verejne zdravotnictvo`; assert URL, atlas/explorer filter, Back/Forward restoration, and persistent selection. Assert scale mode never enters URL.

- [ ] **Step 9: Run full automation**

```bash
npm run data:build
npm run test:data
npm test -- --run
npm run build
```

Expected: all generation, Python, UI, TypeScript, and production build checks pass; no schema-1 field comparison name remains.

- [ ] **Step 10: Commit**

```bash
git commit -F - <<'EOF'
feat: integrate historical field education comparison

Previously production exposed a 2025-only field table; this commit cuts the
application over to the reviewed 2009–2025 education contract and map.
Non-field atlas filters cannot change its national fixed-window values.

- Generate reconciled graduate series and current-student context
- Replace the old comparison component and schema without compatibility keys
- Update validation, methodology, URL tests, and generated data
EOF
```

Perform required staged-diff and metadata checks.

---

### Task 8: Real-Browser Verification and Visual Refinement

**Files:**
- Modify only files implicated by an observed defect in `src/components/FieldEducation*.tsx`, `src/components/fieldEducationGeometry.ts`, `src/styles/components.css`, or focused tests
- Do not alter analytical values, aliases, or source inputs during visual refinement

**Interfaces:**
- Verifies the actual `dist` artifact, not source mode or the companion mockup.
- Every browser-discovered behavioral defect receives a failing permanent regression test before its fix.

- [ ] **Step 1: Read verification skills and prove the build**

Read `skill://agent-browser` and `skill://verification-before-completion`. Byte-compare `public/data/atlas.json` before/after `npm run data:build`, then run:

```bash
npm test -- --run
npm run build
```

- [ ] **Step 2: Serve `dist` and verify desktop at 1440 × 1000**

Start `npm run preview -- --host 127.0.0.1` as a managed process and use `agent-browser`. Verify 232 points and all pinned coverage, both scales, dense/corner nearest previews, clamping, coordinate collision disclosure, click selection, URL sync, `sociálna práca` values, mixed `verejné zdravotníctvo` provenance (25 exact + 1 correction), annual null gaps, complete rankings, and accent/typo-source search.

- [ ] **Step 3: Verify keyboard, history, and invariance**

Tab once into the chart; exercise arrows/Home/End/Enter/Space. Confirm one chart tab target, equal focus/pointer previews, every non-field filter leaves aggregates unchanged, and Back/Forward synchronizes URL/chart/detail/atlas/explorer/records.

- [ ] **Step 4: Verify mobile/touch at 390 × 844**

Confirm stacked map/detail/rankings, readable axes, 44-pixel controls, no clipped preview or page overflow, nearest-point touch selection, and no missing desktop function.

- [ ] **Step 5: Verify sources, console, and reduced motion**

Open archive/direct/local links, confirm base-path downloads and no runtime data-provider requests, inspect console errors, and emulate reduced motion.

- [ ] **Step 6: Fix only observed defects test-first**

For each observed defect: add a focused failing test, confirm failure, implement the smallest correction, rerun the focused test, and repeat the browser scenario. If no defect appears, create no empty commit.

- [ ] **Step 7: Commit actual refinements if any**

Use a Conventional Commit whose diagnosis and bullets describe only the staged browser fixes. Stop the preview process afterward.

---

### Task 9: Independent Review and Final Proof

**Files:**
- Modify only files required by reproduced material review findings

**Interfaces:**
- No new product surface; closes correctness, accessibility, performance, and provenance gaps.

- [ ] **Step 1: Request independent review**

Read `skill://requesting-code-review`. Supply the spec, this plan, and implementation range. Ask specifically about source integrity, reconciliation, alias limits, null semantics, fixed-filter invariance, runtime validation, collision/hit geometry, keyboard/touch access, Slovak claims, and avoidable render-time allocation.

- [ ] **Step 2: Reproduce and fix material findings test-first**

Run the narrowest test or browser scenario for each finding. Reject contradicted findings with evidence. For reproduced defects, add a failing regression, implement the smallest fix, rerun the affected check, and commit coherent fixes.

- [ ] **Step 3: Run final automated proof**

Read `skill://verification-before-completion`, then run:

```bash
npm run data:build
npm run test:data
npm test -- --run
npm run build
```

- [ ] **Step 4: Repeat the production smoke path**

Serve `dist` and repeat desktop/mobile scales, dense/corner/collision previews, keyboard/touch, URL history, filter invariance, search/rankings, annual gap, student stock, methodology/source links, console, and reduced motion.

- [ ] **Step 5: Verify delivery state**

Confirm no old `fieldGraduateComparison`, schema-1 comparison type, 2025-only component, obsolete `filterAppointmentsExceptField`, compatibility key, temporary source copy, unfinished marker, or untracked product artifact remains. Verify the final commit metadata and clean delivery state.
