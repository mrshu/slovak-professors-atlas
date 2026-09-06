# External research source inventory

This inventory separates appointment **events**, academic-employment **stocks**, student/graduate **stocks and flows**, and bibliometric **records**. They are not interchangeable denominators.

## Decision table

| Source | Unit and coverage | Intended linkage | Reuse/access | Decision |
|---|---|---|---|---|
| [PortalVS public employee register](https://www.portalvs.sk/regzam/) and [Ministry dataset record](https://www.minedu.sk/dataset-register-zamestnancov-vysokych-skol/) | Current/dated higher-education employee assignment, with university, faculty, employment category, workload, begin/end dates, and EduID | Reviewed atlas institution/faculty; person linkage only after identity adjudication | Ministry record states CC BY and quarterly updates; XML and JSON exports are public | Use as a current professor/docent comparison frame, never as the historical stock at appointment |
| [OpenAlex](https://help.openalex.org/access/overview/) | Author, work, institution, topic, and citation graph; continuously revised API and quarterly snapshot | ROR institution; conservatively verified person/ORCID/work | CC0 data; limited free API budget; free snapshot | Primary bibliometric source; pin extraction date, query, IDs, and hashes |
| [ROR](https://ror.org/) | Research-organization identifiers, names, domains, and external IDs | One reviewed institution to one ROR record | CC0 | Institution bridge, not a person identifier |
| [CREPČ](https://crepc.cvtisr.sk/o-registri/) / [person OAI-PMH](https://app.crepc.sk/oai/person?verb=ListRecords&metadataPrefix=xml-crepc2&from=2026-01-01) | Slovak publication/person register; OAI records expose stable CREPČ person IDs, occupations, research areas, and some external identifiers | Potential institutional CV/work/identity bridge | Public machine endpoint; no blanket open-data reuse license found; privacy policy limits disclosure to necessary scope | Validation only until reuse rights are clarified; do not republish person records |
| [Google Scholar profiles](https://scholar.google.com/intl/us/scholar/citations.html) | Owner-maintained public author profile with current citations, h-index, i10 | Independently verified public profile ID only | No official open bulk API; profile search visibility is selective; automated access restricted | Manual validation sample only; never bulk scrape or code absence as zero |
| Crossref | DOI/work metadata and deposited author affiliation/citation counts | DOI and exact ROR where publisher deposited them | Public API with etiquette requirements | Work-identity sensitivity only; ROR coverage is too sparse for institutional output |
| Scopus / Web of Science | Curated subscription bibliometrics | Verified author IDs | Paid/contractual APIs and export restrictions | Optional licensed sensitivity source, not a reproducible public dependency |
| [CVTI SK CRIS](https://www.cvtisr.sk/cvti-sr-vedecka-kniznica/podpora-vedy/sk-cris.html?page_id=492) | Slovak CERIF person/project/result/organization registers, operating since 2013 | Potential research-person and project context | No public export/API described | Contact/data-access lead only |
| Eurostat | Harmonized country/region annual statistics | Year, country, NUTS region, ISCED/ISCED-F | [Reuse allowed with acknowledgement](https://ec.europa.eu/eurostat/help/copyright-notice) | Primary cross-country and macro control source |
| Statistical Office of the Slovak Republic DATAcube | National/regional annual statistics | Exact code/year/region/sex/measure | Terms permit reuse under CC BY 4.0 but prohibit robot/spider extraction | Use low-frequency cached slices with exact attribution, not bulk crawling |
| OECD UOE | International education students/graduates/staff | Country/year/ISCED/field | Public SDMX; identified investigated flows are marked preliminary/non-production | Definition sensitivity only |
| UNESCO UIS | International education stocks/flows | Country/year/ISCED/field | Bulk CSV archives; CC BY-SA 4.0 with URL/extraction-date credit | Secondary cross-country check |
| Official presidential/ministry releases | Ceremony or legal appointment/title event | Exact date, person, field, proposing body where published | Public official pages; page-specific terms need recording | Source reconciliation and comparable legal-event pilot |

## Bibliometric source protocol

### OpenAlex extraction

For every request or snapshot analysis retain:

- retrieval timestamp and API/snapshot release;
- `core` versus `all` corpus choice;
- exact URL/filter/select parameters;
- response SHA-256;
- author, work, institution, ORCID, and ROR IDs used;
- the candidate set and non-sensitive decision reason codes;
- missing/unknown buckets (`:include_unknown` where grouped output is used).

Current author `works_count`, `cited_by_count`, `summary_stats.h_index`, and `i10_index` are snapshot metrics. They are not values at the appointment date. A historical h-index requires reconstructing each included work and citation edge with both publication dates bounded by the analysis cutoff.

The institution crosswalk is:

| Atlas ID | ROR |
|---|---|
| `au` | `02evg3h34` |
| `dti` | `00xk3ch77` |
| `euba` | `0310h1546` |
| `ku` | `05ra6d150` |
| `pevs` | `016zyd315` |
| `spu` | `03rfvyw43` |
| `stuba` | `0561ghm58` |
| `tnuni` | `04v8db398` |
| `truni` | `05nj8rv48` |
| `tuke` | `05xm08015` |
| `tuzvo` | `00j75pt62` |
| `ucm` | `04xdyq509` |
| `ukf` | `038dnay05` |
| `umb` | `016e5hy63` |
| `uniba` | `0587ef340` |
| `unipo` | `02ndfsn03` |
| `uniza` | `031wwwj55` |
| `upjs` | `039965637` |
| `uvlf` | `05btaka91` |
| `vsmu` | `05hna7313` |
| `vsvu` | `0443y6a81` |
| `vszsp` | `05ha26626` |

### PortalVS comparison frame

A live 2026 export contained 30,972 employee records, including 1,743 current `Profesor`, 3,262 `Docent`, and 4,956 `Odborný asistent` category records. These are employee records in the export, not necessarily unique people or full-time-equivalent stocks. The atlas’s national 2025 professor stock is a different definition and reference date.

Candidate comparison:

1. Select current assignments with valid institution, faculty, dates, and rank.
2. Separate multi-school/multi-rank employees; do not duplicate them silently.
3. Label docents only as “no matching appointment event in the atlas window” after an exact reviewed institution/faculty anti-join. Never call them never appointed or eligible non-appointees.
4. Link bibliometrics under the frozen identity rule in `research/hypotheses.md`.
5. Publish aggregate cells only after minimum linkage coverage/precision and common-support gates pass.

Exact normalized name overlap is useful only as a feasibility count. It finds at least one current PortalVS record for 222 of 227 unique atlas names in 2023–2025; 166 also have a current professor assignment at the proposing institution. This does not establish person identity, employment continuity, or current faculty equivalence.

### Google Scholar boundary

Official help states that bulk access is unavailable and automated software must respect robots.txt. Profiles can be private, are manually editable, can contain merged/misattributed works, and only public profiles with verified institutional email appear in author search. Therefore:

- no unattended Scholar name search;
- no absent-profile-as-zero coding;
- no combining Scholar and OpenAlex into one metric;
- no redistribution of Scholar records without clear permission;
- any manual sample records profile URL, verified domain, observation date, and work-level agreement.

## Demographic and economic candidates

### National annual series

| Question | Dataset/filter | Preferred transform | Main caveat |
|---|---|---|---|
| Economic cycle | Eurostat `nama_10_gdp`, `B1GQ`, real growth `CLV_PCH_PRE` | contemporaneous and 1–3 year lagged changes | 26 complete annual observations; low power and serial dependence |
| Higher-education research intensity | Eurostat `rd_e_gerdtot`, HES | change in percent GDP; real per-capita sensitivity | research spending is not appointment funding |
| Public tertiary spending | Eurostat `educ_uoe_fine06` | real/per-student level and change | missing/revised years and denominator alignment |
| Salary environment | Eurostat `nama_10_fte`, deflated by `prc_hicp_ainr` | real annual change | economy-wide full-time-adjusted salary, not academic pay |
| Labour market | Eurostat `une_rt_a` | percentage-point change | appointment process lags and small sample |
| Migration | Eurostat `demo_gind` | net migration plus statistical adjustment | definition/revision breaks; not researcher mobility |
| Population | Eurostat `demo_pjan`; Slovak `om7102rr` | exposure denominator | Eurostat January 1 and Slovak mid-year series are not interchangeable |

Exploratory correlations with appointments largely collapse after differencing: GDP growth (+.071 raw, −.087 differenced), higher-education GERD share (−.309, +.101), nominal salary (−.385, −.015), unemployment (+.271, −.057), and migration (−.247, +.084). These are screening diagnostics, not estimates; no broad macro story currently survives. The versioned output also reports zero-to-three-year lagged changes, but the salary screen remains nominal until HICP deflation is implemented.

For regional denominators, use the Slovak mid-year series to match the atlas national convention. The API example for Bratislava is:

`https://data.statistics.sk/api/v2/dataset/om7102rr/SK010/2000:2025/IN010114/SPOLU?lang=en&type=json`

Eurostat’s all-NUTS3 January 1 population sensitivity endpoint is:

`https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/demo_r_pjanaggr3?lang=en&geoLevel=nuts3&age=TOTAL&sex=T&unit=NR&sinceTimePeriod=2000`

Regional appointment rates remain institution-location exposure measures, not resident opportunity rates.

## Cross-country appointment-event comparability

### Closest candidates

- **Slovakia:** the [President’s powers](https://www.prezident.sk/pravomoci) explicitly include appointing university professors. Official releases may list exact person, field, date, and ceremony.
- **Czechia:** the [MŠMT process](https://msmt.gov.cz/vzdelavani/vysoke-skolstvi/habilitacni-rizeni-a-rizeni-ke-jmenovani-profesorem) describes presidential appointment and public procedure results. A [1 June 2026 ceremony list](https://msmt.gov.cz/aktuality/v-karolinu-prevzali-dekrety-novi-profesori-a-profesorky) gives 93 people, fields, proposing scientific councils, and workplaces. This is the best pilot comparator after annual completeness is established.
- **Hungary:** Magyar Közlöny publishes individual presidential university-teacher appointment acts with person, effective date, and proposer; field/workplace can be absent. Feasible but laborious.
- **Poland:** Monitor Polski publishes presidential grants of the professor title with scientific discipline. This is a related title-grant construct, not necessarily appointment to staff rank; do not pool it with Slovak events.
- **Austria:** Universities Act §98 places public advertisement, selection, and employment contract with the rector; there is no comparable presidential event. Use stocks only.

### Harmonized education context

Eurostat’s 2024 `educ_uoe_perp01` academic-staff counts are CZ 19,854; AT 30,618; HU 65,299; PL 100,191; SK 11,789. `educ_uoe_grad01` tertiary graduate counts are CZ 75,470; AT 69,652; HU 90,736; PL 404,685; SK 37,725. These harmonized stocks/flows may normalize legal-event counts only after full-year event coverage and definition reconciliation. They cannot replace appointment-event registers.

Relevant Eurostat field tables are `educ_uoe_enra03` (students by ISCED-F 2013) and `educ_uoe_grad02` (graduates by level/programme/sex/field). A reviewed appointment-field-to-ISCED-F bridge is required.

## Source and linkage red flags

- CREPČ evidence begins around 2007–2008, has a 2012 regulation boundary and a system break after 2017; coverage cannot be assumed stable.
- OpenAlex author records can split or merge; one verified person may require a reviewed union of profiles and removal of contaminating works.
- Crossref affiliation metadata are publisher-deposited and sparse; a five-year Comenius ROR probe returned only 103 works, far below OpenAlex coverage.
- OpenAlex topics, Slovak appointment fields, CVTI study-program labels/codes, Crossref subjects, and CREPČ science codebooks are not the same ontology.
- Citation counts are cumulative and delayed. Freeze a citation observation date and use comparable windows.
- Current rank, current affiliation, and current metrics are post-appointment variables for past appointees.
- Public accessibility does not by itself authorize a new person-level public database. Minimize fields and publish aggregate research outputs.
