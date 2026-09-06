# Internal evidence map

## Units and coverage

| Evidence family | Unit | Coverage | Useful dimensions | Hard limit |
|---|---|---|---|---|
| Ministry appointment register | Appointment event | 2,378 analytical events, 2000-02-22 through 2026-06-03 | Date, ceremony, proposing institution/faculty, reviewed field key, president in office, source title strings | Not a unique-person panel or professor-stock change; 2026 is partial |
| Ceremony table | Distinct appointment date | 67 dates | Batch size, month, weekday, elapsed time | Administrative batching makes individual events non-independent |
| CVTI national context | Country-year | 2000–2025 | Students, graduates, internal teachers, internal professors, population, appointment flow | Stocks and flows use different reference dates; staff definition changes in 2007 |
| CVTI graduate workbooks | Study-program label × year | 2009–2025 | Graduate flow, source ownership sheet, program-row coverage | Text keys are not a stable program-code ontology across three workbook regimes |
| CVTI current students | Study-program label × snapshot | 31 October 2025 | Current student stock | One snapshot, never a historical series |
| Reviewed workplace geography | Appointment event → affiliation → city | 2,302 resolved; 76 unresolved | 14 cities, 22 institutions, faculty-specific rules | Proposing workplace, not residence or ceremony venue; mappings have no effective dates |
| Presidential terms | Date interval | Five terms since 1999 | President in office at event date | Deterministic calendar attribution does not establish presidential control |

The generated contract is `public/data/atlas.json`. Source parsing and joins live in `pipeline/`; pinned downloaded-source provenance is in `public/data/provenance.json`; reviewed configuration is in `data/config/`.

## Source lineage

1. `professors.xls` → strict sheet/header validation → normalized appointment events → reviewed same-name/same-date duplicate decisions → canonical institution, president, field, and affiliation IDs.
2. `higher-education.xls` → national 2000–2025 context totals. Appointment and graduate counts are calendar flows; students and staff are 31 October stocks; population is a mid-year stock.
3. Seventeen annual CVTI graduate workbooks → exact row-regime parsing → normalized text field keys → annual totals reconciled to national context.
4. The 2025 CVTI student workbook → normalized text field keys → fixed student stock reconciled to national context.
5. Statistical Office JSON-stat → the reviewed national, total-sex, mid-year population series.

Downloaded files are SHA-256 pinned. Most reviewed configuration files are protected by version control and tests but do not carry their own provenance hashes. Only the Natural Earth geometry currently exposes explicit license metadata in the generated payload.

## Existing analyses — do not rediscover as new

The application already reports:

- annual appointment counts and ceremony bubbles;
- national stock/flow context and normalized appointment rates;
- institution, city, faculty, and field rankings;
- five-year city shares, academic breadth, and top-three institutional concentration;
- presidential-era descriptive profiles;
- ceremony cadence and month concentration;
- field graduate/appointment ratios with minimum-coverage guards;
- field appointment-versus-graduate shares and a 2025 student-stock context;
- source normalization, reviewed aliases, duplicate disagreements, and unresolved geography.

Existing editorial anchors include the 2008/09 student-stock peak, 2010 graduate-flow peak, 2023 appointment/student-rate maximum, 2000 appointment/graduate-rate maximum, 2001 appointment/professor-stock-rate maximum, and the 108-event ceremony on 2011-01-24.

## Highest-severity analytical constraints

### Field payload omits most education-only keys

`pipeline/field_education.py` parses and nationally reconciles every graduate and current-student program row, but `build_field_education_comparison()` emits only keys present in the appointment-derived catalog. The raw workbooks contain thousands of normalized education-only labels. Measured against the pinned local sources, omitted education-only keys account for roughly 59–65% of annual graduates and 64% of the 2025 student stock.

Therefore:

- national totals remain correct;
- visible field-level totals are a matched subset, not the full education system;
- shares among matched fields are valid only when explicitly labeled as matched-subset shares;
- absence from the comparison cannot be interpreted as zero graduates or zero students;
- broad field-level correlations require a reviewed ontology or an explicit unmatched residual, not a fuzzy join.

### Other comparability breaks

- Internal-teacher definitions change in 2007 to established full-time work. Never interpret the raw break as exits without external evidence.
- The 60 appointment events in 2026 end on 3 June and have no national context denominator. Exclude 2026 from complete-year comparisons.
- Missing annual graduate observations are `null`; observed zeros are `0`.
- Program-row formats change in 2013 and 2023. Apparent field entry or exit may be taxonomy drift.
- Forty-one source rows are reviewed secondary duplicates. The retained primary controls analytical institution, faculty, and field values even when variants disagree.
- The 76 unresolved workplace records remain in national and institution totals but are absent from city counts.
- Institution IDs and workplace rules are historical consolidations without effective dates.

## Safe internal linkage keys

- Appointment event: stable event `id`, backed by normalized name plus exact appointment date and reviewed duplicate handling.
- Ceremony: exact `appointedOn` date.
- Institution: reviewed `institutionId`.
- Field: reviewed `fieldKey`, only within the pinned catalog and only with explicit coverage accounting.
- Geography: resolved `affiliationId` followed by its city; never join by free-text city or infer residence.
- National context: exact year, with reference-date and stock/flow semantics carried into interpretation.
- President: explicit inclusive-start, exclusive-end date interval.

Unsafe joins include name-only OpenAlex/ORCID matching, fuzzy field semantics, city-as-residence population denominators, current-student stock as historical demand, and cross-country substitution of professor stock for appointment flow.

## Required disconfirmation checks

- **Ceremonies:** equal-weight each ceremony and leave out the largest ceremony before interpreting annual or monthly concentration.
- **Institutions/cities:** report resolved-only and all-record denominators; bound unresolved records; condition geography tests on institution.
- **Fields:** report matched graduate coverage, vary minimum observed years/events, switch reviewed aliases off, and use negative-lag/placebo permutations.
- **Time series:** exclude 2026, split or annotate 2007, first-difference trending series, test placebo break years, and account for serial dependence.
- **Presidential terms:** normalize exposure, use complete years, condition on ceremony timing, and shift boundaries as a placebo.
- **External data:** require equivalent units and reference dates, a documented many-to-one linkage, source licensing, and a result that survives reasonable alternate denominators.

## Underused evidence worth deepening

- Ceremony-level rather than event-level variance.
- Institution and city concentration trajectories with size and missing-location sensitivity.
- Aggregate women counts already present in official CVTI staff/student columns, without inferring traits from names.
- Rank-specific internal academic staff stocks and doctoral student/graduate components.
- Exact source title-string transitions over time, interpreted as register notation rather than personal identity.
- Duplicate-primary sensitivity and graduate-key coverage loss.
- Field/year lag tests after a reviewed ontology is available.
