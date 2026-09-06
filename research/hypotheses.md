# Research hypothesis portfolio

Status labels:

- **Deepen** — evidence and an inversion both support further analysis.
- **Audit first** — promising, but a source/linkage defect blocks interpretation.
- **Context only** — useful descriptive context, not a primary finding.
- **Reject** — current evidence falsifies the tempting story or cannot identify it.

## Priority portfolio

| Priority | Question | Preliminary evidence | Inversion or disconfirmation | Status |
|---|---|---|---|---|
| 1 | How does registered academic rank relate to citation, h-index, publication, and collaboration metrics? | PortalVS supplies current professor/docent categories and faculty affiliations; OpenAlex supplies CC0 author/work metadata. A 12-case feasibility sample yielded 11 independently verified identities, one unresolved merged profile, two current-rank conflicts, and nine rank-consistent links. | Require at least 30 verified people per rank, official identity evidence, field/year normalization, active-career and recent metrics, and Gold-only/split-merge sensitivity. Current lifetime metrics and ambiguous profiles cannot support an outcome claim. | **Feasibility only; expand cohort** |
| 2 | Are annual appointment peaks primarily ceremony batching? | Complete 2000–2025 data contain 2,318 events on only 65 dates. The 2011 maximum of 154 falls to 46 after removing the 108-event ceremony on 24 January. The top ten dates contain 27.31% of all events. | Equal-weight ceremonies, remove each date in turn, and compare with year-preserving random allocations. If annual ordering survives, batching is not the explanation. | **Deepen** |
| 3 | Why is November dominant? | November has 480 events and 13 ceremonies; its mean batch is 36.9, close to the all-ceremony mean. The event share is high because ceremonies are more frequent, not because November batches are unusually large. | Compare ceremony occurrence with eligible weekdays and condition on presidential term and year. A month effect that disappears under calendar/process controls is scheduling, not demand. | **Deepen** |
| 4 | How has women’s representation changed across the academic rank pipeline? | An unversioned workbook screen indicates materially different 2000–2025 representation trajectories across professors, docents, assistants, doctoral students, and graduates. It is not synthesis-ready until a parser/result artifact reproduces the values. | Treat each rank as a separate aggregate stock/flow, mark the 2007 staff-definition break, and never infer sex among named appointees. If source definitions or rank arithmetic do not reconcile, report the discrepancy instead of smoothing it. | **Audit first** |
| 5 | Is apparent geographic concentration a city effect or institution composition? | 94.92% of resolved events occur in each institution’s dominant city. Annual institution mix accounts descriptively for Bratislava’s appointment share with r=.968 (R²=.937; mean absolute residual 1.58 percentage points). | Permute city within institution and use institution-year fixed composition. If residual city effects vanish, reject mobility or regional-opportunity language. | **Deepen as institution composition** |
| 6 | Can appointment fields be compared with the full graduate pipeline? | Versioned annual matched-graduate coverage ranges from 34.88% to 40.83%; only 35.70% of the 2025 student stock is emitted on appointment-catalog labels. | Preserve all education-only residuals and map official codes to a versioned ISCED-F ontology. Reject fuzzy label matching and unmatched-as-zero logic. | **Audit first** |
| 7 | Did PhD notation replace CSc notation among appointees? | Versioned exact-string counts shift from 18 PhD versus 73 CSc records in 2000 to 51 versus 1 in 2025; the first annual PhD plurality is 2008. | Add blank/combined-title denominators, equal ceremony weighting, and field/institution composition sensitivity. Interpret as register notation, not ability or reform impact. | **Deepen** |
| 8 | Do appointment events track changes in professor stock? | From 2000 through 2025 there are 2,318 appointment events while internal-professor stock rises by 689. In 13 of 25 year-to-year transitions the stock falls despite positive appointment flow. | The calendar-year flow and 31 October stocks are not boundary-aligned and cross the 2007 definition break. Use this only to reject one-event/one-net-addition interpretation, never as a turnover ratio. | **Descriptive falsification** |
| 9 | Was COVID an appointment collapse or a scheduling delay? | An unversioned screen finds no events from 12 March through 30 June 2020 followed by two large second-half ceremonies. | Add a versioned result, prior-year placebo interruptions, and ceremony clustering before treating the timing pattern as a finding. | **Context only** |
| 10 | Did presidents rush appointments near term end? | The final 180 days of four completed terms contain 226 events across 6 of 62 ceremonies. Permuting whole ceremony batches within president gives a null mean of 208.25 and one-sided p=.289. | Shift boundaries and condition on June/seasonality. The test detects no excess against this null; it does not prove no rush. | **Non-finding** |
| 11 | Do national appointments respond to graduates, students, staff, or macroeconomic conditions? | Raw annual correlations change sign or collapse after first differences/detrending. Examples: appointments–graduates r=-.128 raw and +.076 differenced; appointments–professor stock r=-.288 raw and +.191 differenced. GDP, GERD, salary, unemployment, and migration correlations are similarly weak in changes. | Use lagged differences, block nulls, negative controls, and leave-largest-ceremony-out. A level correlation without a change correlation is a common-trend artifact. | **Reject broad causal story** |
| 12 | Does prior graduate supply predict appointments by field? | An unversioned exploratory screen suggests crude lag associations shrink substantially after field/year demeaning and look similar when time is reversed. No result enters the synthesis until a deterministic field-year artifact reproduces sample sizes, coverage, aliases, and negative lags. | Negative lags, field/year fixed effects, stable-code fields, and label permutations. Similar forward and reverse associations would indicate persistent field size, not supply response. | **Untested in final package** |
| 13 | Is institutional concentration increasing? | An unversioned period screen looks non-monotonic rather than steadily increasing. | Add a versioned period-HHI result, size-normalize with institution professor/student denominators, and leave out large ceremonies. | **Audit first** |
| 14 | Can Slovakia’s appointment flow be compared internationally? | Czechia has a closely related presidential process and public ceremony lists; Hungary publishes individual presidential appointment acts; Poland grants the title under a related but different construct; Austria uses rector-led employment contracts. | Compare legal events only where process and annual coverage match. Never substitute academic-staff stock for appointment flow. | **Audit first; Czech pilot** |
| 15 | Is the 2011 peak source-complete? | No. The official release states and enumerates 111 professors on 24 January; atlas and pinned workbook contain 108. Row reconciliation finds three official people absent from both, one spelling variant, and one substantive field disagreement. | Preserve the 108 source-backed atlas records, label the three-event shortfall, and require a provenance-backed source update before production additions. | **Source caveat confirmed** |

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
