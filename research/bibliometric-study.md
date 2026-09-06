# Professorship and bibliometric metrics

## Question and estimand

The atlas appointment register cannot identify whether professorship causes citations, h-index, publications, or collaboration. It has appointment events but no complete eligible/rejected/never-appointed risk set. Current PortalVS employment data make a narrower cross-sectional question feasible:

> Among conservatively identity-linked current academic employees, how do current registered professor and docent ranks associate with field- and career-normalized research-output and impact measures?

Even this is an association, not an appointment probability, merit score, or causal effect. A separate appointee-only analysis can reconstruct output accumulated before appointment and descriptive event-time trajectories, but later appointees are selected comparison cases rather than untreated controls.

## Source decision

- PortalVS: current/datestamped professional rank, university, faculty, workload, and employment intervals.
- OpenAlex: work/citation graph, author candidates, ORCID, ROR affiliations, and current metrics.
- Official university CV/VUPCH/staff pages: decisive identity and work-overlap evidence.
- ROR: reviewed institution bridge.
- Google Scholar: manual validation only; no bulk extraction or absent-profile-as-zero coding.
- CREPČ: possible validation source only after reuse rights and historical system breaks are resolved.

## Feasibility sample

A deterministic sample selected three PortalVS professors and three docents from each of Comenius University (`uniba`) and Slovak University of Technology (`stuba`). Selection used the smallest SHA-256 values of `atlas-bibliometric-pilot-v1`, reviewed institution, rank, and normalized name after excluding mixed-rank and duplicate-normalized-name records. The 2026-09-05 PortalVS JSON export is pinned by SHA-256 `092905d60df1bd0bf67c2ca7ec9b19257d5a408947d218a733b2eb26114bfdef` (45,361,812 bytes). Hash selection is deterministic for that snapshot; it does not make 12 cases representative. Because live OpenAlex candidate responses and the private adjudication crosswalk are not committed, this remains a feasibility record rather than a fully rerunnable outcome study.

Names generated candidates only. First reviewers required either an official institution-to-ORCID bridge or exact name, recent target-ROR evidence, at least two exact official-CV/OpenAlex work overlaps, coherent field, and no equivalent competitor. An independent reviewer then rechecked all 12 decisions and the Rule B evidence.

Aggregate attrition:

| Gate | Count |
|---|---:|
| Selected | 12 |
| Identity verified after independent review | 11 |
| OpenAlex merge contamination left unresolved | 1 |
| Current PortalVS versus official-rank conflicts | 2 |
| Primary rank-consistent, identity-verified records | 9 |
| Primary professors | 5 |
| Primary docents | 4 |

No person crosswalk, candidate list, failed match, ORCID, OpenAlex author ID, or individual metric is committed or emitted to the client.

## What the pilot established

OpenAlex linkage is technically feasible but not automatic. One profile combined a current Slovak researcher’s work with unrelated historical work. Two otherwise verified people had conflicting current professional-rank labels across PortalVS and official university pages. Other cases exposed split-profile risk even when official ORCID evidence resolved the main identity.

The pilot therefore supports a manual, abstention-capable workflow. It rejects exact normalized name plus institution as an automatic identity rule.

## Why no rank–metric association is reported

The internal diagnostic was deliberately withheld from public results. The primary cohort has only five professors and four docents, versus a preregistered minimum of 30 per displayed rank cell. It also lacks:

- faculty/field common support;
- field and publication-year normalized citation impact;
- active-career publication and citation rates;
- separate recent and lifetime impact measures;
- appointment-time citation reconstruction;
- balanced linkage coverage and work-membership audit;
- stable results across institutions and profile split/merge corrections.

Current lifetime h-index and citation totals mechanically combine field norms, publication age, database coverage, and all output after any appointment. Publishing their tiny-sample contrast—even with a disclaimer—would answer the wrong question. `research/results/bibliometric-pilot.json` therefore contains linkage feasibility and failed gates only.

## Required full study

### Cohort and audit

1. Freeze a PortalVS snapshot and select a substantially larger rank-balanced cohort across institution-size, faculty/field, name-collision, and diacritic-risk strata.
2. Use separate development and holdout identity samples; two reviewers independently adjudicate each holdout identity and sampled work membership.
3. Require at least 98% point precision with a 95% lower bound of at least 95%, at least 80% weighted identity sensitivity, and at least 97% audited work precision.
4. Require at least 30 verified people and effective sample size 20 per displayed comparison cell; absent OpenAlex profiles remain missing, never zero.
5. Report coverage by rank, institution, broad field, cohort, and linkage-risk stratum. Keep weights at or below 10 and effective sample size at least half the linked count.

### Metrics

Keep these quantities separate:

1. **Current lifetime snapshot:** works, citations, h-index, i10, collaboration. Context only.
2. **Active-career rates:** annual full and fractional works, citation inflow, and collaboration per observed active year.
3. **Recent fixed window:** synchronized five-year publications/citation inflow, excluding works too new for comparable citation exposure.
4. **Field/year/type-normalized impact:** work-level citation percentiles or mean normalized citation score, including explicit unknown-field coverage.
5. **Current impact of the pre-appointment corpus:** current citations/h-index using only works published by 31 December before appointment. Retrospective, not “at appointment.”
6. **True appointment-time impact:** reconstruct citations and h-index from citing-work dates bounded by the appointment cutoff.

### Models and inversions

- Standardize professor/docent comparisons on broad field, institution/faculty common support, observed publication age, and documented database coverage.
- Report distributions and standardized contrasts, not institution/person rankings.
- Compare Gold-only versus all verified links; union only verified split profiles and remove reviewed contaminating works.
- Exclude hyperauthored works, use fractional counting, leave one field/institution out, and run unmatched-outcome sensitivity.
- Use placebo dates and leads for event trajectories. If changes precede appointment or occur at shifted dates, call the pattern selection/trajectory rather than appointment-associated.
- Withhold any directional claim when conservative identity, timing, coverage, field-normalized, and fixed-window analyses disagree materially.

## Current conclusion

The feasible result is the linkage method and its failure modes, not a correlation coefficient. A credible professor–bibliometrics association requires a larger controlled cohort and work-level time normalization. Google Scholar cannot substitute for that design: it adds selective public-profile coverage and non-reproducible access without solving identity, field, or citation-window confounding.
