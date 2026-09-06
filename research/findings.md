# Research synthesis

Evidence labels:

- **Measured** — reproduced by a committed analysis module and JSON result.
- **Reconciled** — row-level comparison against an independent official source.
- **Feasibility** — method/data access established, but substantive outcome gates failed.
- **Screening** — broad external diagnostic; not inferential.
- **Deferred** — promising exploratory lead without a synthesis-ready result.

The synthesis covers appointment events through 3 June 2026, but every complete-year comparison ends in 2025. Appointment rows are events, not unique people or net professor-stock additions.

## Prioritized findings

### 1. Appointment flow is not net professor-stock growth — Measured

From 2000 through 2025 the atlas contains 2,318 appointment events. The official internal-professor stock is 938 in 2000 and 1,627 in 2025, a difference of 689; the stock declines in 13 of 25 annual transitions despite positive appointment flow.

**Finding:** the register’s appointment-event flow cannot be read as annual net additions to the professor stock.

This rejects a tempting one-event/one-net-addition interpretation. It does not estimate retirement, mortality, migration, part-time movement, or turnover. Calendar-year appointments and 31 October stocks are not boundary-aligned, and the staff definition changes in 2007; therefore no events-per-net-stock ratio is reported.

Evidence: `research/results/internal.json` and `research/internal_analysis.py`.

### 2. The largest ceremony has a confirmed three-event source shortfall — Reconciled

The official presidential release for 24 January 2011 states and enumerates 111 professors. The atlas and pinned Ministry workbook contain 108. Row comparison finds three official people absent from both workbook and atlas, one `Grzegorz`/`Gregorz` spelling variant, and one substantive field disagreement for an existing event.

**Finding:** the atlas did not drop three rows during transformation; its pinned source is three appointments short of the internally consistent official list.

The atlas should continue to describe 108 source-backed records for that date until a provenance-backed production update supplies reviewed institution/faculty/field values. The 2011 annual peak of 154 is therefore exact for the pinned source, not guaranteed complete against all official evidence.

Evidence: `research/source-reconciliation.md` and the [official release](https://archiv.prezident.sk/ivan-gasparovic/indexff90.html?news_id=12893&rok-2011=).

### 3. Apparent Bratislava concentration is mostly institution composition — Measured, descriptive

Among 2,318 complete-year events, 2,242 have resolved workplace geography and 76 do not. Across the resolved set, 94.92% of events occur in each institution’s dominant city. Applying each institution’s pooled Bratislava share to the annual institution mix accounts descriptively for annual Bratislava share with r=.968, R²=.937, and mean absolute residual 1.58 percentage points.

**Finding:** year-to-year Bratislava share is closely accounted for by which institutions supplied each year’s events.

This is not a city effect, residence measure, opportunity rate, or mobility result. The pooled shares use the same study period; historical institution-location mappings lack effective dates. A publishable geography model still needs institution-conditioned permutations, alternate mapping vintages, and resolved/all-event bounds.

Evidence: `research/results/internal.json` and `research/internal_analysis.py`.

### 4. No term-end appointment excess is detected under a ceremony-batch null — Measured non-finding

The final 180 days of four completed presidential terms contain 226 events across 6 of 62 eligible ceremony dates. In 100,000 seeded randomizations that permute whole observed ceremony batch sizes among observed dates within each completed president, the null mean is 208.25 and the one-sided p-value is .289.

**Non-finding:** this test does not detect a term-end excess relative to the observed within-president ceremony schedule.

It does not prove the absence of political timing. Power is low at only 62 ceremonies, and June/seasonality, alternate windows, term-boundary shifts, proposal timing, and other actors in the legal process remain unmodeled.

Evidence: `research/results/robustness.json` and `research/robustness_analysis.py`.

### 5. National education/staff/macro series do not support a simple demand story — Measured and screening non-finding

Internal annual correlations change materially after first differences or detrending:

| Series | Level r | First-difference r | Detrended r |
|---|---:|---:|---:|
| Graduates | −.128 | +.076 | −.079 |
| Students | +.150 | +.021 | −.053 |
| Internal professors | −.288 | +.191 | +.041 |
| Internal teachers | +.329 | +.297 | +.151 |

Five exact Eurostat slices show the same trend risk. Contemporaneous appointment correlations are +.071 with real GDP growth, −.309 with higher-education GERD share, −.385 with nominal full-time-adjusted salary, +.271 with unemployment, and −.247 with net migration plus adjustment. Their first-difference correlations are −.087, +.101, −.015, −.057, and +.084, respectively.

**Non-finding:** no broad national “more students/graduates/resources/economic growth produces more appointments” story survives as a consistent annual-change pattern.

These are only 16–26 observations, with serial dependence, revisions, ceremony leverage, 2007 definition change, and many inspected lags. Individual lagged-change coefficients are not findings after multiple screening tests. Salary remains nominal; real-wage and leave-largest-ceremony sensitivities are future work.

Evidence: `research/results/robustness.json`, `research/results/external.json`, and exact source/license metadata inside the external result.

### 6. Current field comparisons describe only a minority matched education subset — Measured

The generated field payload covers only appointment-catalog labels. Annual matched-graduate coverage ranges from 34.88% to 40.83% in 2009–2025; matched fields contain 35.70% of the 2025 student stock.

**Finding:** current field graduate/student shares cannot be interpreted as shares of the full higher-education system, and an absent field cannot be interpreted as zero graduates or students.

A safe extension needs official study-program codes, a reviewed versioned code-to-ISCED-F bridge, explicit ambiguous/unmapped categories, and a retained education-only residual. Fuzzy text matching is rejected.

Evidence: `research/results/internal.json` and `research/evidence-map.md`.

### 7. Register credential notation shifts sharply from CSc to PhD — Measured, interpretation limited

Exact `titlesAfter` string counts change from 18 records containing PhD and 73 containing CSc in 2000 to 51 and 1 in 2025. The first year with more PhD than CSc strings is 2008.

**Finding:** the appointment register records a strong notation transition.

This is not a measure of ability, citation impact, appointment standards, or the causal effect of a reform. Before broader publication it needs denominators for blank/combined titles, equal ceremony weighting, and field/institution composition sensitivity.

Evidence: `research/results/internal.json` and `research/internal_analysis.py`.

### 8. Ceremony clustering explains the fragility of annual and monthly event counts — Measured, low novelty

Complete years contain 2,318 events on 65 dates, averaging 35.66 events per ceremony. The top ten dates contain 27.31% of all events. The 2011 annual maximum falls from 154 to 46 when the 108-record atlas ceremony is removed. November contains 480 events on 13 ceremonies: 20.71% of events and 20.00% of ceremonies, with mean batch size 36.92 versus 35.66 overall.

**Finding:** event counts are highly clustered; November’s event share is consistent with having more ceremonies rather than unusually large batches.

The application already exposes cadence and the 108-event anchor, so the novel contribution is the leverage decomposition, not rediscovery of the peak. Every temporal comparison should cluster/equal-weight at ceremony date and include leave-date-out sensitivity.

Evidence: `research/results/internal.json`.

## Priority question: professorship, citations, h-index, and productivity

### What was established — Feasibility

PortalVS provides a public current professor/docent comparison frame; OpenAlex is the best reproducible open bibliometric source; ROR supplies institution keys; official institutional CV/VUPCH pages can adjudicate identity. Google Scholar remains manual validation only because it has selective public profiles, no official open bulk author API, and automated-access restrictions.

A deterministic 12-case, two-university pilot was independently reviewed:

- 11 identities verified;
- one merged OpenAlex profile left unresolved;
- two current PortalVS/official-rank conflicts;
- nine identity-verified, rank-consistent records: five professors and four docents.

This demonstrates technical feasibility and the necessity of manual abstention. It does **not** establish any citation, h-index, i10, works, active-career-rate, or appointment-time association. Outcome metrics are suppressed because the cohort fails the preregistered minimum of 30 per rank, faculty/field common support, active-career and recent-window construction, citation normalization, work-membership audit, and current-versus-appointment-time separation.

Evidence: `research/bibliometric-study.md` and `research/results/bibliometric-pilot.json`.

### Highest-value next study

1. Freeze PortalVS and OpenAlex snapshots; build a substantially larger rank-balanced sample across institutions, faculties, broad fields, collision risk, and diacritic risk.
2. Use separate development and holdout samples with two independent identity/work reviewers.
3. Require identity precision ≥98% with 95% lower bound ≥95%, weighted sensitivity ≥80%, and audited work precision ≥97%.
4. Require at least 30 verified people per displayed rank cell and effective sample size ≥20 after weighting/common-support restriction.
5. Separate current lifetime context, active-career rates, synchronized recent five-year metrics, field/year/type-normalized impact, current citations to pre-appointment works, and true appointment-time citation reconstruction.
6. Run Gold-only, split/merge, hyperauthorship/fractional counting, leave-field/institution-out, coverage, and placebo-date sensitivities.
7. If any gate fails, publish linkage feasibility only—no directional rank contrast.

## Deferred leads

1. **Aggregate women’s rank pipeline:** official CVTI workbooks contain women-by-rank and doctoral student/graduate counts, but no committed parser/result yet reproduces the exploratory percentages. Add a versioned source extraction; never infer sex from names.
2. **Field supply/demand lag:** exploratory associations shrink after field/year demeaning and look similar when time is reversed, but the final package deliberately withholds exact statistics until a deterministic ontology-aware result exists.
3. **Institution concentration:** exploratory period HHI is non-monotonic; add size denominators and a versioned result before synthesis.
4. **COVID timing:** the apparent interruption/catch-up pattern needs a committed placebo analysis at ceremony level.
5. **Cross-country legal events:** Czechia is the closest comparison; Hungary is feasible but sparse; Poland is a title-grant near match; Austria is not comparable. Assemble complete annual legal-event registers before normalization by Eurostat staff/graduate stocks.

## Action order

1. Expand and preregister the controlled PortalVS–OpenAlex study.
2. Submit the 2011 three-event and field discrepancy to the production-source review process.
3. Fix field payload completeness and build the official-code/ISCED-F ontology.
4. Add the aggregate women-by-rank parser and versioned result.
5. Add institution-size denominators and ceremony-conditioned geography tests.
6. Build a complete Czech appointment-event comparison before attempting broader country rankings.
