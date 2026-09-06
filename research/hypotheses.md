# Research hypothesis portfolio

Status labels:

- **Deepen** — evidence and an inversion both support further analysis.
- **Audit first** — promising, but a source/linkage defect blocks interpretation.
- **Context only** — useful descriptive context, not a primary finding.
- **Reject** — current evidence falsifies the tempting story or cannot identify it.

## Priority portfolio

| Priority | Question | Preliminary evidence | Inversion or disconfirmation | Status |
|---|---|---|---|---|
| 1 | How does registered academic rank relate to citation, h-index, publication, and collaboration metrics? | The public PortalVS employee register supplies current professor/docent categories and faculty affiliations; OpenAlex supplies CC0 author/work metadata and current summary metrics. Exact normalized names link 222 of 227 appointment names from 2023–2025 to at least one PortalVS record, but name alone is not identity proof. | Require official identity/affiliation evidence, compare professors with same-faculty docents, control observed publication age and broad field, and rerun Gold-only/abstention scenarios. Reject any result that depends on ambiguous profiles, current lifetime exposure, or one field. | **Deepen, controlled aggregate only** |
| 2 | Are annual appointment peaks primarily ceremony batching? | Complete 2000–2025 data contain 2,318 events on only 65 dates. The 2011 maximum of 154 falls to 46 after removing the 108-event ceremony on 24 January. The top ten dates contain 27.31% of all events. | Equal-weight ceremonies, remove each date in turn, and compare with year-preserving random allocations. If annual ordering survives, batching is not the explanation. | **Deepen** |
| 3 | Why is November dominant? | November has 480 events and 13 ceremonies; its mean batch is 36.9, close to the all-ceremony mean. The event share is high because ceremonies are more frequent, not because November batches are unusually large. | Compare ceremony occurrence with eligible weekdays and condition on presidential term and year. A month effect that disappears under calendar/process controls is scheduling, not demand. | **Deepen** |
| 4 | How has women’s representation changed across the academic rank pipeline? | In official national CVTI totals, women’s share rose from 7.14% to 32.88% among internal professors between 2000 and 2025, versus 39.04% to 47.88% among all internal teachers. In 2025 women were 44.25% of docents, 55.24% of odborní assistants, 49.31% of doctoral students, and 51.11% of doctoral graduates. | Treat each rank as a separate aggregate stock/flow, mark the 2007 staff-definition break, and never infer sex among named appointees. If source definitions or rank arithmetic do not reconcile, report the discrepancy instead of smoothing it. | **Deepen** |
| 5 | Is apparent geographic concentration a city effect or institution composition? | 94.92% of resolved events occur in each institution’s dominant city. Annual institution mix predicts Bratislava’s appointment share with r=.969 (R²=.938; mean absolute residual 1.54 percentage points). | Permute city within institution and use institution-year fixed composition. If residual city effects vanish, reject mobility or regional-opportunity language. | **Deepen as institution composition** |
| 6 | Can appointment fields be compared with the full graduate pipeline? | Only 37.53% of 2009–2025 graduates and 35.70% of 2025 students are emitted on appointment-catalog labels. Exact label/code evidence nevertheless covers 96.71% of appointment events, suggesting a reviewed code-level bridge can cover the appointment side well. | Preserve all education-only residuals; map official codes to a versioned ISCED-F ontology; leave 103 unmapped and 14 ambiguous appointment keys explicit. Reject fuzzy label matching. | **Audit first** |
| 7 | Did PhD notation replace CSc notation among appointees? | `titlesAfter` shifts from 18 PhD versus 73 CSc records in 2000 to 51 versus 1 in 2025; the first annual PhD plurality is 2008. A ceremony-bundle permutation still leaves the early/late contrast extreme. | Recompute with exact strings, exclude blanks/combined ambiguities, equal-weight ceremonies, and condition on field/institution composition. Interpret as register credential notation, not ability or reform impact. | **Deepen** |
| 8 | Do appointment events track changes in professor stock? | From 2000 through 2025 there are 2,318 appointment events while internal-professor stock rises by 689. In 13 of 25 year-to-year transitions the stock falls despite positive appointment flow. | Compare only aligned stock dates and annotate 2007. If events were net additions, stock changes would track them much more closely. | **Deepen as a falsification** |
| 9 | Was COVID an appointment collapse or a scheduling delay? | There are no events from 12 March through 30 June 2020, followed by 81 events in two second-half ceremonies; 2021 has 82. These annual totals exceed the 2015–2019 average of 72.2. | Use placebo interruptions in prior years and cluster at ceremony date. If only the within-year timing shifts, reject an annual-volume shock. | **Context only** |
| 10 | Did presidents rush appointments near term end? | The final 180 days of four completed terms contain 226 of 2,242 events. Permuting observed ceremony batch sizes over observed dates within president gives a null mean of 208.2 and one-sided p=.287; only 6 of 62 ceremonies fall in those windows. | Shift boundaries and condition on June/seasonality. The current cluster-aware result does not distinguish a rush from ordinary scheduling. | **Reject current story** |
| 11 | Do national appointments respond to graduates, students, staff, or macroeconomic conditions? | Raw annual correlations change sign or collapse after first differences/detrending. Examples: appointments–graduates r=-.128 raw and +.076 differenced; appointments–professor stock r=-.288 raw and +.191 differenced. GDP, GERD, salary, unemployment, and migration correlations are similarly near zero after differencing. | Use lags, first differences, block nulls, negative controls, and leave-largest-ceremony-out. A level correlation without a change correlation is a common-trend artifact. | **Reject broad causal story** |
| 12 | Does prior graduate supply predict appointments by field? | The crude lag-one field-year correlation is about .309, but falls to .106 after two-way field/year demeaning. Reversing time—appointments predicting future graduates—produces a similar .319 raw and .099 demeaned. | Negative lags, field/year fixed effects, stable-code fields, and label permutations. Similar forward and reverse associations indicate persistent field size, not supply response. | **Audit first; causal story rejected** |
| 13 | Is institutional concentration increasing? | Institution HHI is .0840 in 2000–2004, .1071 in 2015–2019, and .0916 in 2020–2025. Bratislava’s resolved share peaks around 2010–2014 and then declines. | Size-normalize with institution professor/student denominators and leave out large ceremonies. Current pattern is non-monotonic. | **Deepen after denominators** |
| 14 | Can Slovakia’s appointment flow be compared internationally? | Czechia has a closely related presidential process and public ceremony lists; Hungary publishes individual presidential appointment acts; Poland grants the title under a related but different construct; Austria uses rector-led employment contracts. | Compare legal events only where process and annual coverage match. Never substitute academic-staff stock for appointment flow. | **Audit first; Czech pilot** |
| 15 | Is the 2011 peak source-complete? | The atlas/ministry workbook has 108 events on 24 January 2011, while the official presidential release says 111. The 2020 and 2026 official ceremony totals match the atlas. | Reconcile names across sources before using 2011 as an exact maximum. | **Audit first** |

## Bibliometric study hierarchy

### Identifiable now

1. **Current rank association:** among conservatively linked current PortalVS employees, compare current registered professor and docent categories on OpenAlex h-index, citations, works, i10, and recent citation rate. Stratify by faculty/broad field and observed publication age. This is a cross-sectional association, not an appointment effect.
2. **Appointment-time publication profile:** for verified appointees, count works published before 31 December of the year preceding appointment. This does not require historical citation snapshots.
3. **Current impact of the pre-appointment corpus:** current citations and current h-index computed only from pre-appointment works. This must be labeled retrospective because post-appointment citations remain.
4. **Symmetric output trajectories:** publication and collaboration counts in fixed windows before and after appointment for balanced cohorts. Leads and placebo dates are mandatory; the result remains descriptive.
5. **Institution-level research context:** link reviewed institutions to ROR and OpenAlex aggregates, comparing appointment activity with output volume only after full/fractional counting and institution-size denominators.

### Not identified without new evidence

- citations or h-index as they stood at appointment, unless historical citing-work dates are reconstructed from a frozen work graph;
- the causal effect of appointment on research performance;
- the probability of appointment from bibliometrics without an eligible candidate/risk set;
- whether citations justify, validate, or measure the merit of an appointment;
- person or institution quality rankings;
- current-affiliation or current-metric equivalence to the proposing institution/date.

### Source decision

- **OpenAlex:** primary. CC0 metadata, stable author/work/institution IDs, ROR links, works and current `summary_stats`; known split/merge errors require work-level review and a frozen retrieval date.
- **PortalVS employee register:** comparison frame. The Ministry’s dataset page states CC BY and quarterly updates; employment category, workload, faculty, dates, and stable EduID are available. Use only professional rank/employment fields needed for the study.
- **CREPČ:** potential publication and identity bridge via OAI-PMH; public machine access exists, but reuse licensing requires confirmation.
- **ORCID:** identity bridge, not a metric source. Treat an OpenAlex-carried ORCID as corroboration until an official profile or authenticated source confirms it.
- **Google Scholar:** manual validation only. Public profiles are owner-maintained/selective, search requires public status and verified institutional email, bulk access is unavailable, `/citations?` search is disallowed by robots, and no reproducible open author API exists.
- **Scopus/Web of Science:** potentially useful sensitivity sources only with institutional API entitlement and explicit export rights.

## Bibliometric identity gate

A name retrieves candidates; it never establishes identity. A publishable link requires either:

- an official institutional CV/profile connecting the appointee to ORCID or exact works, with appointment-period institution/field agreement; or
- exact full name, at least two exact DOI/title overlaps with an authoritative CV/publication list, appointment-period ROR evidence, coherent topic evidence, no equally plausible candidate, and independent dual review.

Profile splits sharing an independently verified ORCID are unioned only after work-level deduplication. Ambiguous candidates remain unresolved. No candidate lists, failed matches, coauthor evidence, or person-level metrics belong in the public client payload.

A 37-name purposive OpenAlex audit found 22 searches with multiple candidates, 14 with one, and one with none. Four candidates looked provisionally strong from OpenAlex evidence, but strict external-confirmation rules classify all four as manual review: zero automatic links, 34 manual cases, and three abstentions. This is a feasibility diagnostic, not a population match-rate estimate.

## External correlation candidates

### Worth a controlled test

- Higher-education R&D expenditure (`rd_e_gerdtot`, HES, percent GDP or real per-capita expenditure), using 1–3 year lags and changes rather than levels.
- Real GDP growth (`nama_10_gdp`, `B1GQ`, `CLV_PCH_PRE`) as a shock/control, never a level trend.
- Regional mid-year population and real GDP linked only to proposing-workplace NUTS regions, after institution composition and unresolved-location sensitivity.
- Institution-level CVTI students, graduates, internal teachers, and professors from 2009 onward, yielding activity rates rather than quality scores.
- Czech presidential professor appointments as the closest legal-process comparison, after full annual register assembly.

### Useful controls, weak primary stories

- real full-time-adjusted salary, unemployment changes, migration plus statistical adjustment, and tertiary public expenditure;
- Eurostat tertiary students/graduates/academic staff for stock/flow context;
- OECD/UIS as definition checks, not substitutes for Slovak appointment events.

### Reject

- kitchen-sink annual correlations on 26 years;
- city population as a denominator for proposing universities;
- cross-country appointment rankings built from professor stocks;
- name-inferred demographic or protected attributes;
- fuzzy appointment-field to study-program matching;
- Google Scholar bulk scraping or absent-profile-as-zero logic.
