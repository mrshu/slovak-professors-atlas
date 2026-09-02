# Compact Atlas Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the atlas page around direction A — a full-width annotated map with a period switch as the hero, three finding cards with a compact context row, the field comparison as its own screen, and a paginated register — so the page answers its question on the first screen and stays under 3 000 px on desktop.

**Architecture:** The data pipeline, `atlas.json` contract, `useAtlasState`, URL serialisation, selectors, and `fieldEducation` analysis stay untouched. New pure analysis modules (`periods.ts`, `findings.ts`) derive period shares and finding series from all records. New presentational components (`Masthead`, `MapStage`, `CityStrip`, `FindingCards`, `ContextStrip`, `FieldSection`, `Register`) compose the existing `SlovakiaMap`, `InstitutionRanking`, `FieldEducationScatter`, `FieldEducationDetail`, `FieldEducationRankings`, `RecordList`, `AppointmentTimeline`, `ContextSectionBody`, and `Methodology`. Removed components and their CSS are deleted in the task that replaces them so every task leaves the suite green.

**Tech Stack:** React 19, TypeScript, Vite 8, Vitest 4 + Testing Library, `d3-scale`, `d3-shape`, `d3-geo`, plain CSS with tokens. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-02-compact-atlas-redesign.md` (page model) on top of `docs/superpowers/specs/2026-08-29-slovak-professors-atlas-design.md` (data, editorial rules, visual system).

## Global Constraints

- Fully static, GitHub Pages-compatible; no runtime upstream requests, backend, or map tiles.
- All visible copy, labels, dates, and number formatting are Slovak; use `formatNumber`, `formatDate`, `formatAppointmentCount` from `src/utils/format.ts`.
- Appointment counts are appointment events, never unique persons; no ranking of presidents; institution counts describe activity, not quality.
- One shared filter state (`useAtlasState`) drives map, strip, register, and chips. Period buttons call `setDateRange`; city clicks call `setFilter('city', …)`; field selection uses the `field` filter. No new URL parameters.
- Findings and strip sparklines derive from **all** records; the strip's shares for the active period use the active selection.
- React owns the DOM; D3 only for scales, ticks, shapes, and geography.
- Colour is never the only encoding; keyboard and touch parity; `prefers-reduced-motion` respected; WCAG AA contrast.
- Chart text uses ink tokens, never series colours. Links are ink with a 1 px underline; terracotta is for data marks and selection only.
- Page height with all folds closed: under 3 000 px at 1440 px width, under 6 000 px at 390 px; no horizontal scroll at 390 px.
- Conventional Commits with a body (why, what); write commit messages with `git commit -F - <<'MSG' … MSG`; no AI attribution. Work on branch `redesign/compact-atlas` off `main`.
- Before every commit run `npx vitest --run` and `npx tsc -b`; both must pass.

---

## File map

| File | Responsibility |
|---|---|
| `src/styles/tokens.css` | Add spacing scale, compact type scale, series colours |
| `src/styles/components.css` | Delete replaced blocks; add new component blocks per task |
| `src/test/atlasFixture.ts` (new) | Shared typed fixture builders for component tests |
| `src/components/Masthead.tsx` (new) | Title, ledger, anchor nav |
| `src/analysis/periods.ts` (new) | Five-year periods, city shares per period, period lookup |
| `src/components/MapStage.tsx` (new) | Period switch + `SlovakiaMap` + `CityStrip` + institutions fold |
| `src/components/CityStrip.tsx` (new) | Seven-cell strip with share, delta, sparkline |
| `src/components/SlovakiaMap.tsx` | Label threshold, size key, hover highlight, selected ring |
| `src/analysis/findings.ts` (new) | Title shares by year, month totals, field share mismatch |
| `src/components/FindingCards.tsx` (new) | Three cards composing `TitlesChart`, `MonthsChart`, `FieldDumbbell` |
| `src/components/charts/TitlesChart.tsx`, `MonthsChart.tsx`, `FieldDumbbell.tsx`, `SmallLine.tsx` (new) | Pure SVG charts |
| `src/components/ContextStrip.tsx` (new) | Two small charts + fold with `ContextSectionBody` |
| `src/components/FieldSection.tsx` (new) | Header, search, toggle, range; scatter + detail; rankings fold |
| `src/components/FieldEducationScatter.tsx` | Ratio guides, zero rail, external scale mode |
| `src/components/Register.tsx` (new) | Replaces `Explorer.tsx` |
| `src/components/RecordList.tsx` | Date grouping, load-more |
| `src/App.tsx` | New assembly and section order |
| Deleted | `Hero.tsx`, `Findings.tsx(+test)`, `AnalysisLenses.tsx`, `AtlasSection.tsx(+test)`, `Explorer.tsx(+test)`, `FieldEducationComparison.tsx(+test)`, `FieldEducationRankingDonuts.tsx`; `ContextTrend` stays (used by the fold) |

---

### Task 0: Branch and fixture helper

**Files:**
- Create: `src/test/atlasFixture.ts`

**Interfaces:**
- Produces `appointment(overrides)`, `institution(overrides)`, `affiliation(overrides)`, `city(overrides)`, `president(overrides)`, `contextYear(overrides)` — each returns a fully typed object with sensible Slovak defaults.

- [ ] **Step 1: Create the branch**

```bash
git checkout -b redesign/compact-atlas main
```

- [ ] **Step 2: Write the fixture module**

```ts
// src/test/atlasFixture.ts
import type {
  Affiliation,
  Appointment,
  City,
  ContextYear,
  Institution,
  President,
} from '../data/types'

let sequence = 0

export function appointment(
  overrides: Partial<Appointment> & Pick<Appointment, 'appointedOn'>,
): Appointment {
  sequence += 1
  return {
    id: `apt-${sequence}`,
    name: 'Jana Nováková',
    titlesBefore: 'doc. Ing.',
    titlesAfter: 'PhD.',
    faculty: 'Prírodovedecká fakulta',
    institutionId: 'uniba',
    affiliationId: 'uniba-default',
    institutionSource: 'UK v Bratislave',
    field: 'fyzika',
    fieldKey: 'fyzika',
    presidentId: 'gasparovic',
    sourceVariants: [],
    ...overrides,
  }
}

export function institution(overrides: Partial<Institution> = {}): Institution {
  return {
    id: 'uniba',
    shortName: 'UK v Bratislave',
    fullName: 'Univerzita Komenského v Bratislave',
    sourceLabels: ['UK v Bratislave'],
    citationUrl: 'https://www.wikidata.org/wiki/Q332881',
    ...overrides,
  }
}

export function affiliation(overrides: Partial<Affiliation> = {}): Affiliation {
  return {
    id: 'uniba-default',
    institutionId: 'uniba',
    facultyKeys: [],
    status: 'resolved',
    city: 'Bratislava',
    sourceUrl: null,
    sourceLabel: 'Kanonické sídlo inštitúcie',
    note: null,
    ...overrides,
  }
}

export function city(overrides: Partial<City> = {}): City {
  return {
    name: 'Bratislava',
    latitude: 48.1486,
    longitude: 17.1077,
    affiliationIds: ['uniba-default'],
    ...overrides,
  }
}

export function president(overrides: Partial<President> = {}): President {
  return {
    id: 'gasparovic',
    name: 'Ivan Gašparovič',
    from: '2004-06-15',
    to: '2014-06-15',
    citationUrl: 'https://www.prezident.sk/ivan-gasparovic/',
    ...overrides,
  }
}

export function contextYear(
  overrides: Partial<ContextYear> & Pick<ContextYear, 'year'>,
): ContextYear {
  const { year } = overrides
  return {
    academicYear: `${year}/${year + 1}`,
    students: 150_000,
    graduates: 30_000,
    internalTeachers: 10_000,
    internalProfessors: 1_200,
    appointments: 90,
    population: 5_400_000,
    appointmentsPerMillionResidents: 16.67,
    professorsPer100kResidents: 22.22,
    appointmentsPer1kGraduates: 3,
    graduatesPerAppointment: 333.33,
    appointmentsPer10kStudents: 6,
    appointmentsPer1kTeachers: 9,
    appointmentsPer100Professors: 7.5,
    professorShare: 12,
    ...overrides,
  }
}
```

- [ ] **Step 3: Type-check and commit**

Run: `npx tsc -b`
Expected: no errors.

```bash
git add src/test/atlasFixture.ts
git commit -F - <<'MSG'
test: add shared atlas fixture builders

Component tests each rebuilt Appointment, Institution and Affiliation
objects by hand. The redesign adds several components that need the same
shapes, so this commit centralises typed builders with Slovak defaults.

- Add `src/test/atlasFixture.ts` with appointment, institution,
  affiliation, city, president and contextYear builders
MSG
```

---

### Task 1: Tokens and Masthead

**Files:**
- Modify: `src/styles/tokens.css`
- Create: `src/components/Masthead.tsx`
- Create: `src/components/Masthead.test.tsx`
- Modify: `src/App.tsx` (replace `<Hero>` and `<nav class="anchor-nav">`)
- Modify: `src/App.test.tsx:326-355` (ledger and navigation assertions)
- Delete: `src/components/Hero.tsx`
- Modify: `src/styles/components.css` (delete `.hero` block lines 1–155 and `.anchor-nav` block 156–214; add `.mast` block)
- Modify: `src/styles/global.css` (`scroll-padding-top`, `.visually-hidden`)

**Interfaces:**
- Produces `Masthead({ status, meta, institutionCount, cityCount })` with `status: 'loading' | 'ready' | 'error'`, `meta: AtlasMeta | null`.
- Section ids used by every later task: `hore`, `mapa`, `zistenia`, `kontext`, `odbory`, `register`, `metodika`.

- [ ] **Step 1: Add tokens**

Append inside `:root` in `src/styles/tokens.css`:

```css
  --sp-1: 4px;
  --sp-2: 8px;
  --sp-3: 12px;
  --sp-4: 16px;
  --sp-5: 24px;
  --sp-6: 32px;
  --sp-7: 48px;

  --t-1: 1.6rem;
  --t-2: 1.3rem;
  --t-3: 1.05rem;
  --t-body: 0.875rem;
  --t-small: 0.8rem;
  --t-label: 0.7rem;

  --series-1: #b0452c;
  --series-2: #0a8aa6;
  --series-3: #a0721a;
  --series-1-on-dark: #d9704e;
  --series-2-on-dark: #3fb0c9;
  --series-3-on-dark: #d4a83a;
```

In `src/styles/global.css` change `scroll-padding-top: 5.5rem;` to `scroll-padding-top: 1rem;` and append:

```css
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}
```

- [ ] **Step 2: Write the failing Masthead test**

```tsx
// src/components/Masthead.test.tsx
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Masthead from './Masthead'

const meta = {
  schemaVersion: 1 as const,
  sourceRowCount: 2419,
  duplicateSourceRowCount: 41,
  analyticalAppointmentCount: 2378,
  ceremonyCount: 67,
  appointmentDateMin: '2000-02-22',
  appointmentDateMax: '2026-06-03',
}

describe('Masthead', () => {
  it('shows the question, the four ledger figures and the five anchors', () => {
    render(<Masthead status="ready" meta={meta} institutionCount={22} cityCount={14} />)
    expect(
      screen.getByRole('heading', { level: 1, name: /Kde vzniká slovenská profesúra\?/ }),
    ).toBeVisible()
    const ledger = screen.getByLabelText('Rozsah analytického súboru')
    expect(within(ledger).getByText(/2[\s ]378/)).toBeVisible()
    expect(within(ledger).getByText('67')).toBeVisible()
    expect(within(ledger).getByText('22')).toBeVisible()
    expect(within(ledger).getByText('14')).toBeVisible()
    const nav = screen.getByRole('navigation', { name: 'Navigácia atlasu' })
    expect(within(nav).getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '#mapa',
      '#zistenia',
      '#odbory',
      '#register',
      '#metodika',
    ])
  })

  it('keeps the shell while loading', () => {
    render(<Masthead status="loading" meta={null} institutionCount={0} cityCount={0} />)
    expect(screen.getByRole('status')).toHaveTextContent('Otváram overený dátový archív…')
  })
})
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest --run src/components/Masthead.test.tsx`
Expected: FAIL — cannot resolve `./Masthead`.

- [ ] **Step 4: Implement Masthead**

```tsx
// src/components/Masthead.tsx
import type { AtlasMeta } from '../data/types'
import { formatNumber } from '../utils/format'

interface MastheadProps {
  status: 'loading' | 'ready' | 'error'
  meta: AtlasMeta | null
  institutionCount: number
  cityCount: number
}

const ANCHORS: readonly [string, string][] = [
  ['#mapa', 'Mapa'],
  ['#zistenia', 'Zistenia'],
  ['#odbory', 'Odbory'],
  ['#register', 'Register'],
  ['#metodika', 'Metodika'],
]

export default function Masthead({ status, meta, institutionCount, cityCount }: MastheadProps) {
  return (
    <header className="mast" id="hore" aria-labelledby="hero-title">
      <h1 id="hero-title">
        Kde vzniká slovenská profesúra? <small>Archívny atlas 2000–2026</small>
      </h1>
      {meta === null ? (
        <p className="mast__status" role="status">
          {status === 'loading'
            ? 'Otváram overený dátový archív…'
            : 'Textová osnova atlasu zostáva dostupná.'}
        </p>
      ) : (
        <dl className="mast__ledger" aria-label="Rozsah analytického súboru">
          <div>
            <dd>{formatNumber(meta.analyticalAppointmentCount)}</dd>
            <dt>vymenovaní</dt>
          </div>
          <div>
            <dd>{formatNumber(meta.ceremonyCount)}</dd>
            <dt>slávností</dt>
          </div>
          <div>
            <dd>{formatNumber(institutionCount)}</dd>
            <dt>škôl</dt>
          </div>
          <div>
            <dd>{formatNumber(cityCount)}</dd>
            <dt>miest</dt>
          </div>
        </dl>
      )}
      <nav aria-label="Navigácia atlasu">
        {ANCHORS.map(([href, label]) => (
          <a key={href} href={href}>
            {label}
          </a>
        ))}
      </nav>
    </header>
  )
}
```

- [ ] **Step 5: Wire into App and delete Hero**

In `src/App.tsx` replace the `<header aria-labelledby="hero-title">…</header>` and the whole `<nav className="anchor-nav">…</nav>` with:

```tsx
<Masthead
  status={state.status}
  meta={state.data?.meta ?? null}
  institutionCount={state.data?.institutions.length ?? 0}
  cityCount={state.data?.cities.length ?? 0}
/>
```

Remove the `Hero` import, add `import Masthead from './components/Masthead'`, and `git rm src/components/Hero.tsx`.

- [ ] **Step 6: Replace CSS**

Delete `.hero` … `.anchor-nav__inner ol a:hover` blocks from `src/styles/components.css` (everything before `.section--findings`). Add at the top:

```css
.mast {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: baseline;
  gap: var(--sp-6);
  max-width: var(--content-width);
  margin: 0 auto;
  padding: var(--sp-4) var(--page-gutter);
  border-bottom: var(--rule);
}
.mast h1 {
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--t-1);
  font-weight: 500;
  line-height: 1.08;
}
.mast h1 small {
  font-size: 1em;
  font-style: italic;
  font-weight: 400;
  color: var(--color-ink-muted);
}
.mast__ledger {
  display: flex;
  gap: var(--sp-5);
  margin: 0;
  justify-self: center;
  color: var(--color-ink-muted);
  font-variant-numeric: tabular-nums;
}
.mast__ledger div { display: flex; gap: 0.3rem; align-items: baseline; white-space: nowrap; }
.mast__ledger dd { margin: 0; font-family: var(--font-display); font-size: 1.15rem; color: var(--color-ink); }
.mast nav { display: flex; gap: var(--sp-4); font-size: var(--t-label); font-weight: 600; letter-spacing: 0.09em; text-transform: uppercase; }
.mast nav a { text-decoration: none; border-bottom: 2px solid transparent; padding-bottom: 2px; }
.mast nav a:hover, .mast nav a:focus-visible { border-color: var(--color-ink); }
.mast__status { margin: 0; color: var(--color-ink-muted); }
@media (max-width: 900px) {
  .mast { grid-template-columns: 1fr; gap: var(--sp-3); }
  .mast h1 small { display: block; font-size: 0.85em; }
  .mast__ledger { justify-self: start; flex-wrap: wrap; gap: var(--sp-3) var(--sp-4); }
}
main > section, footer { scroll-margin-top: var(--sp-4); }
```

- [ ] **Step 7: Update App.test landmark assertions**

In `src/App.test.tsx` „renders the Slovak story landmarks in order“: delete the three lines asserting `banner.nextElementSibling`, `navigation.nextElementSibling`, and `banner).not.toContainElement(navigation)`; replace with `expect(within(screen.getByRole('banner')).getByRole('navigation', { name: 'Navigácia atlasu' })).toBeVisible()`. Delete the assertion on `/22\. februára 2000/` (the ledger no longer shows dates). Keep the `mainSections` assertion as is for now; Task 9 rewrites it.

- [ ] **Step 8: Run all tests and commit**

Run: `npx vitest --run && npx tsc -b`
Expected: PASS.

```bash
git add -A src/styles src/components/Masthead.tsx src/components/Masthead.test.tsx src/App.tsx src/App.test.tsx
git commit -F - <<'MSG'
feat: replace hero and anchor bar with one-row masthead

The hero spent 1 130 px on the question, three figures and contour art
before any data. This commit replaces it and the sticky anchor bar with a
single masthead row and adds the spacing, type and series tokens the
compact layout uses.

- Add `Masthead` with title, four-figure ledger and five anchors
- Add `--sp-*`, `--t-*` and `--series-*` tokens and `.visually-hidden`
- Remove `Hero`, the hero and anchor-nav CSS, and the 5.5 rem scroll padding
MSG
```

---

### Task 2: Period analysis

**Files:**
- Create: `src/analysis/periods.ts`
- Create: `src/analysis/periods.test.ts`

**Interfaces:**
- Produces:

```ts
export interface Period { startYear: number; endYear: number; label: string }
export const FIVE_YEAR_PERIODS: readonly Period[] // 2000–2004 … 2020–2024
export function periodForRange(startYear: number, endYear: number): Period | null
export interface CityPeriodShare { city: string; count: number; share: number }
export function cityShares(records, affiliations): CityPeriodShare[] // sorted desc, share of located records
export function citySharesByPeriod(records, affiliations): Map<string /* period label */, CityPeriodShare[]>
```

- [ ] **Step 1: Write the failing test**

```ts
// src/analysis/periods.test.ts
import { describe, expect, it } from 'vitest'

import { affiliation, appointment } from '../test/atlasFixture'
import { FIVE_YEAR_PERIODS, cityShares, citySharesByPeriod, periodForRange } from './periods'

const affiliations = [
  affiliation(),
  affiliation({ id: 'tuke-default', institutionId: 'tuke', city: 'Košice' }),
  affiliation({ id: 'unknown', institutionId: 'x', status: 'unresolved', city: null }),
]
const records = [
  appointment({ appointedOn: '2001-05-17' }),
  appointment({ appointedOn: '2003-05-17' }),
  appointment({ appointedOn: '2002-05-17', affiliationId: 'tuke-default' }),
  appointment({ appointedOn: '2002-05-17', affiliationId: 'unknown' }),
  appointment({ appointedOn: '2011-01-24', affiliationId: 'tuke-default' }),
]

describe('periods', () => {
  it('defines five labelled five-year periods', () => {
    expect(FIVE_YEAR_PERIODS.map(({ label }) => label)).toEqual([
      '2000–2004',
      '2005–2009',
      '2010–2014',
      '2015–2019',
      '2020–2024',
    ])
  })

  it('finds a period only for an exact match', () => {
    expect(periodForRange(2010, 2014)?.label).toBe('2010–2014')
    expect(periodForRange(2010, 2015)).toBeNull()
    expect(periodForRange(2000, 2026)).toBeNull()
  })

  it('computes city shares over located records only', () => {
    const shares = cityShares(records.slice(0, 4), affiliations)
    expect(shares).toEqual([
      { city: 'Bratislava', count: 2, share: 2 / 3 },
      { city: 'Košice', count: 1, share: 1 / 3 },
    ])
  })

  it('splits shares by five-year period and skips empty periods', () => {
    const byPeriod = citySharesByPeriod(records, affiliations)
    expect([...byPeriod.keys()]).toEqual(['2000–2004', '2010–2014'])
    expect(byPeriod.get('2010–2014')).toEqual([{ city: 'Košice', count: 1, share: 1 }])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest --run src/analysis/periods.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/analysis/periods.ts
import type { Affiliation, Appointment } from '../data/types'
import { cityCounts } from './selectors'

export interface Period {
  startYear: number
  endYear: number
  label: string
}

export interface CityPeriodShare {
  city: string
  count: number
  share: number
}

export const FIVE_YEAR_PERIODS: readonly Period[] = [2000, 2005, 2010, 2015, 2020].map(
  (startYear) => ({
    startYear,
    endYear: startYear + 4,
    label: `${startYear}–${startYear + 4}`,
  }),
)

export function periodForRange(startYear: number, endYear: number): Period | null {
  return (
    FIVE_YEAR_PERIODS.find(
      (period) => period.startYear === startYear && period.endYear === endYear,
    ) ?? null
  )
}

export function cityShares(
  records: readonly Appointment[],
  affiliations: readonly Affiliation[],
): CityPeriodShare[] {
  const counts = cityCounts(records, affiliations)
  const located = counts.reduce((total, { count }) => total + count, 0)
  return counts.map(({ city, count }) => ({
    city,
    count,
    share: located === 0 ? 0 : count / located,
  }))
}

export function citySharesByPeriod(
  records: readonly Appointment[],
  affiliations: readonly Affiliation[],
): Map<string, CityPeriodShare[]> {
  const result = new Map<string, CityPeriodShare[]>()
  for (const period of FIVE_YEAR_PERIODS) {
    const inPeriod = records.filter((record) => {
      const year = Number.parseInt(record.appointedOn.slice(0, 4), 10)
      return year >= period.startYear && year <= period.endYear
    })
    if (inPeriod.length === 0) continue
    result.set(period.label, cityShares(inPeriod, affiliations))
  }
  return result
}
```

- [ ] **Step 4: Run tests, commit**

Run: `npx vitest --run src/analysis/periods.test.ts`
Expected: PASS.

```bash
git add src/analysis/periods.ts src/analysis/periods.test.ts
git commit -F - <<'MSG'
feat: derive five-year city shares for the map stage

The map stage compares the active period against 2000–2004 and draws a
five-period sparkline per city. This commit adds the pure period model
and share derivation on top of the existing cityCounts selector.

- Add `FIVE_YEAR_PERIODS`, `periodForRange`, `cityShares`,
  `citySharesByPeriod` in `src/analysis/periods.ts`
- Cover exact-match lookup, located-only shares and empty periods
MSG
```

---

### Task 3: Map stage

**Files:**
- Modify: `src/components/SlovakiaMap.tsx` (labels for count ≥ 10, size key, `hoveredCity`/`onHoverCity` props, remove the `<figcaption>` heading and the key list)
- Create: `src/components/CityStrip.tsx`, `src/components/CityStrip.test.tsx`
- Create: `src/components/MapStage.tsx`, `src/components/MapStage.test.tsx`
- Modify: `src/components/AtlasSection.test.tsx` (drop assertions on the removed map heading and key list; the file is deleted in Task 9)
- Modify: `src/styles/components.css` (replace `.slovakia-map` block; add `.map-stage`, `.city-strip`, `.fold`)

**Interfaces:**
- Consumes `AtlasState` (`filters`, `defaults`, `filteredRecords`, `setDateRange`, `setFilter`), `FIVE_YEAR_PERIODS`, `periodForRange`, `cityShares`, `citySharesByPeriod`, `InstitutionRanking`.
- `SlovakiaMap` new props: `hoveredCity: string | null`, `onHoverCity: (city: string | null) => void`, `labelMinimumCount?: number` (default 10). Remove `CITY_LABEL_MIN_COUNT = 50`; change `CITY_MARK_MAX_RADIUS` to 30.
- Produces `MapStage({ data, atlasState })` rendering `<section id="mapa" className="map-stage" aria-labelledby="map-stage-title">`.
- Produces `CityStrip({ cells, activeIndex, selectedCity, hoveredCity, onSelect, onHover })` where `cells: CityStripCell[]`, `CityStripCell = { city: string; share: number; delta: number | null; series: number[] }`.

- [ ] **Step 1: Write the failing CityStrip test**

```tsx
// src/components/CityStrip.test.tsx
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import CityStrip from './CityStrip'

const cells = [
  { city: 'Bratislava', share: 0.425, delta: 12.6, series: [0.3, 0.35, 0.43, 0.39, 0.32] },
  { city: 'Košice', share: 0.149, delta: -4.3, series: [0.19, 0.17, 0.14, 0.14, 0.19] },
]

describe('CityStrip', () => {
  it('renders one button per city with share, delta and a sparkline', () => {
    const onSelect = vi.fn()
    render(
      <CityStrip
        cells={cells}
        activeIndex={2}
        selectedCity={null}
        hoveredCity={null}
        onSelect={onSelect}
        onHover={() => {}}
      />,
    )
    const bratislava = screen.getByRole('button', {
      name: /Bratislava: 42,5 %, zmena \+12,6 bodu/,
    })
    expect(bratislava).toHaveAttribute('aria-pressed', 'false')
    expect(bratislava.querySelector('svg circle.city-strip__now')).not.toBeNull()
    fireEvent.click(bratislava)
    expect(onSelect).toHaveBeenCalledWith('Bratislava')
  })

  it('marks the selected city and shows an em dash when there is no delta', () => {
    render(
      <CityStrip
        cells={[{ ...cells[1]!, delta: null }]}
        activeIndex={0}
        selectedCity="Košice"
        hoveredCity={null}
        onSelect={() => {}}
        onHover={() => {}}
      />,
    )
    const kosice = screen.getByRole('button', { name: /Košice: 14,9 %, bez porovnania/ })
    expect(kosice).toHaveAttribute('aria-pressed', 'true')
    expect(kosice).toHaveTextContent('—')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest --run src/components/CityStrip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CityStrip**

```tsx
// src/components/CityStrip.tsx
import { formatNumber } from '../utils/format'

export interface CityStripCell {
  city: string
  share: number
  delta: number | null
  series: number[]
}

interface CityStripProps {
  cells: readonly CityStripCell[]
  activeIndex: number
  selectedCity: string | null
  hoveredCity: string | null
  onSelect: (city: string) => void
  onHover: (city: string | null) => void
}

const SPARK_W = 120
const SPARK_H = 26
const SHARE_MAX = 0.45

function pct(value: number): string {
  return `${formatNumber(value * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

function deltaText(delta: number | null): string {
  if (delta === null) return '—'
  const sign = delta > 0 ? '+' : delta < 0 ? '−' : '±'
  return `${sign}${formatNumber(Math.abs(delta), { minimumFractionDigits: 1, maximumFractionDigits: 1 })} b.`
}

export default function CityStrip({
  cells,
  activeIndex,
  selectedCity,
  hoveredCity,
  onSelect,
  onHover,
}: CityStripProps) {
  return (
    <div className="city-strip" role="group" aria-label="Podiel miest v aktívnom výbere">
      {cells.map((cell) => {
        const selected = cell.city === selectedCity
        const points = cell.series.map(
          (share, index) =>
            [
              4 + (index / Math.max(1, cell.series.length - 1)) * (SPARK_W - 8),
              SPARK_H - 4 - (Math.min(share, SHARE_MAX) / SHARE_MAX) * (SPARK_H - 8),
            ] as const,
        )
        const path = points
          .map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`)
          .join(' ')
        const label = `${cell.city}: ${pct(cell.share)}, ${
          cell.delta === null
            ? 'bez porovnania'
            : `zmena ${deltaText(cell.delta).replace(' b.', ' bodu')}`
        }; filtrovať register`
        return (
          <button
            key={cell.city}
            type="button"
            className={`city-strip__cell${selected ? ' is-selected' : ''}${
              cell.city === hoveredCity ? ' is-hot' : ''
            }`}
            aria-pressed={selected}
            aria-label={label}
            onClick={() => onSelect(cell.city)}
            onMouseEnter={() => onHover(cell.city)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(cell.city)}
            onBlur={() => onHover(null)}
          >
            <span className="city-strip__name" aria-hidden="true">
              {cell.city}
            </span>
            <span className="city-strip__bar" aria-hidden="true">
              <i style={{ width: `${(Math.min(cell.share, SHARE_MAX) / SHARE_MAX) * 100}%` }} />
            </span>
            <span className="city-strip__values" aria-hidden="true">
              <b>{pct(cell.share)}</b>
              <span>{deltaText(cell.delta)}</span>
            </span>
            <svg viewBox={`0 0 ${SPARK_W} ${SPARK_H}`} aria-hidden="true">
              <path d={path} />
              {points.map(([x, y], index) => (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r={index === activeIndex ? 3 : 1.8}
                  className={index === activeIndex ? 'city-strip__now' : undefined}
                />
              ))}
            </svg>
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Run CityStrip test**

Run: `npx vitest --run src/components/CityStrip.test.tsx`
Expected: PASS.

- [ ] **Step 5: Write the failing MapStage test**

```tsx
// src/components/MapStage.test.tsx
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AtlasState } from '../state/useAtlasState'
import { affiliation, appointment, city, institution } from '../test/atlasFixture'
import MapStage from './MapStage'

const data = {
  records: [
    appointment({ appointedOn: '2001-05-17' }),
    appointment({ appointedOn: '2011-01-24' }),
    appointment({ appointedOn: '2011-01-24', affiliationId: 'tuke-default', institutionId: 'tuke' }),
  ],
  affiliations: [
    affiliation(),
    affiliation({ id: 'tuke-default', institutionId: 'tuke', city: 'Košice' }),
  ],
  cities: [
    city(),
    city({ name: 'Košice', latitude: 48.7164, longitude: 21.2611, affiliationIds: ['tuke-default'] }),
  ],
  institutions: [
    institution(),
    institution({ id: 'tuke', shortName: 'TU v Košiciach', fullName: 'Technická univerzita v Košiciach' }),
  ],
  geography: {
    type: 'Feature' as const,
    bbox: [16.8, 47.7, 22.6, 49.6] as [number, number, number, number],
    properties: {} as never,
    geometry: {
      type: 'Polygon' as const,
      coordinates: [[[16.8, 47.7], [22.6, 47.7], [22.6, 49.6], [16.8, 49.6], [16.8, 47.7]]],
    },
  },
}

function atlasState(overrides: Partial<AtlasState['filters']> = {}): AtlasState {
  const defaults = {
    startYear: 2000, endYear: 2026, fieldStartYear: 2009, fieldEndYear: 2025,
    presidentId: null, city: null, institutionId: null, faculty: null, field: null,
    appointedOn: null, query: '', selectedYear: 2025,
  }
  const filters = { ...defaults, ...overrides }
  return {
    filters,
    defaults,
    options: {} as never,
    filteredRecords: data.records.filter((record) => {
      const year = Number(record.appointedOn.slice(0, 4))
      return year >= filters.startYear && year <= filters.endYear
    }),
    setFilter: vi.fn(),
    setExclusiveFilter: vi.fn(),
    setDateRange: vi.fn(),
    setFieldEducationRange: vi.fn(),
    setSelectedYear: vi.fn(),
    setTimelineYear: vi.fn(),
    setAppointmentDate: vi.fn(),
    setQuery: vi.fn(),
    resetFilters: vi.fn(),
  }
}

describe('MapStage', () => {
  it('offers the five periods plus the whole range and presses the active one', () => {
    const state = atlasState({ startYear: 2010, endYear: 2014 })
    render(<MapStage data={data as never} atlasState={state} />)
    const group = screen.getByRole('group', { name: 'Obdobie' })
    const buttons = within(group).getAllByRole('button')
    expect(buttons.map((button) => button.textContent)).toEqual([
      '2000–2004', '2005–2009', '2010–2014', '2015–2019', '2020–2024', 'Celé obdobie',
    ])
    expect(buttons[2]).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(buttons[0]!)
    expect(state.setDateRange).toHaveBeenCalledWith(2000, 2004, 'push')
    fireEvent.click(buttons[5]!)
    expect(state.setDateRange).toHaveBeenCalledWith(2000, 2026, 'push')
    expect(screen.getByRole('heading', { name: 'Mapa pracovísk, 2010–2014' })).toBeVisible()
  })

  it('lists strip cells for the active selection and toggles the city filter', () => {
    const state = atlasState({ startYear: 2010, endYear: 2014 })
    render(<MapStage data={data as never} atlasState={state} />)
    const strip = screen.getByRole('group', { name: 'Podiel miest v aktívnom výbere' })
    fireEvent.click(within(strip).getByRole('button', { name: /^Košice: 50,0 %/ }))
    expect(state.setFilter).toHaveBeenCalledWith('city', 'Košice', 'push')
  })

  it('keeps the institution ranking in a closed fold', () => {
    render(<MapStage data={data as never} atlasState={atlasState()} />)
    const fold = screen.getByText('Inštitúcie v aktívnom výbere').closest('details')
    expect(fold).not.toHaveAttribute('open')
  })
})
```

- [ ] **Step 6: Run to verify it fails**

Run: `npx vitest --run src/components/MapStage.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 7: Implement MapStage**

```tsx
// src/components/MapStage.tsx
import { useMemo, useState } from 'react'

import {
  FIVE_YEAR_PERIODS,
  cityShares,
  citySharesByPeriod,
  periodForRange,
} from '../analysis/periods'
import type { AtlasData } from '../data/types'
import type { AtlasState } from '../state/useAtlasState'
import CityStrip, { type CityStripCell } from './CityStrip'
import InstitutionRanking from './InstitutionRanking'
import SlovakiaMap from './SlovakiaMap'

interface MapStageProps {
  data: AtlasData
  atlasState: AtlasState
}

const STRIP_SIZE = 7

export default function MapStage({ data, atlasState }: MapStageProps) {
  const { filters, defaults, filteredRecords, setDateRange, setFilter } = atlasState
  const [hoveredCity, setHoveredCity] = useState<string | null>(null)
  const activePeriod = periodForRange(filters.startYear, filters.endYear)
  const wholeRange =
    filters.startYear === defaults.startYear && filters.endYear === defaults.endYear
  const periodLabel =
    activePeriod?.label ??
    (wholeRange ? `${defaults.startYear}–${defaults.endYear}` : `${filters.startYear}–${filters.endYear}`)
  const activeIndex = activePeriod === null ? -1 : FIVE_YEAR_PERIODS.indexOf(activePeriod)

  const byPeriod = useMemo(
    () => citySharesByPeriod(data.records, data.affiliations),
    [data.affiliations, data.records],
  )
  const baseline = byPeriod.get(FIVE_YEAR_PERIODS[0]!.label) ?? []
  const cells = useMemo<CityStripCell[]>(() => {
    const current = cityShares(filteredRecords, data.affiliations).slice(0, STRIP_SIZE)
    return current.map(({ city, share }) => {
      const base = baseline.find((entry) => entry.city === city)?.share ?? 0
      return {
        city,
        share,
        delta: activeIndex === 0 || baseline.length === 0 ? null : (share - base) * 100,
        series: FIVE_YEAR_PERIODS.map(
          (period) =>
            byPeriod.get(period.label)?.find((entry) => entry.city === city)?.share ?? 0,
        ),
      }
    })
  }, [activeIndex, baseline, byPeriod, data.affiliations, filteredRecords])

  const toggleCity = (city: string) =>
    setFilter('city', filters.city === city ? null : city, 'push')

  return (
    <section id="mapa" className="map-stage" aria-labelledby="map-stage-title">
      <div className="map-stage__head">
        <h2 id="map-stage-title">
          Mapa pracovísk, <em>{periodLabel}</em>
        </h2>
        <div className="map-stage__periods" role="group" aria-label="Obdobie">
          {FIVE_YEAR_PERIODS.map((period) => (
            <button
              key={period.label}
              type="button"
              aria-pressed={period === activePeriod}
              onClick={() => setDateRange(period.startYear, period.endYear, 'push')}
            >
              {period.label}
            </button>
          ))}
          <button
            type="button"
            aria-pressed={wholeRange}
            onClick={() => setDateRange(defaults.startYear, defaults.endYear, 'push')}
          >
            Celé obdobie
          </button>
        </div>
      </div>
      <SlovakiaMap
        records={filteredRecords}
        geography={data.geography}
        cities={data.cities}
        affiliations={data.affiliations}
        selectedCity={filters.city}
        hoveredCity={hoveredCity}
        onHoverCity={setHoveredCity}
        onToggleCity={toggleCity}
      />
      <p className="map-stage__cap">
        Plocha kruhu = počet vymenovaní navrhnutých pracoviskami v meste. Mesto je sídlo
        pracoviska, nie bydlisko profesora. Kliknutím na mesto alebo jeho pásik filtrujete
        register.
      </p>
      <CityStrip
        cells={cells}
        activeIndex={activeIndex}
        selectedCity={filters.city}
        hoveredCity={hoveredCity}
        onSelect={toggleCity}
        onHover={setHoveredCity}
      />
      <details className="fold fold--on-dark">
        <summary>Inštitúcie v aktívnom výbere</summary>
        <InstitutionRanking
          records={filteredRecords}
          institutions={data.institutions}
          selectedInstitutionId={filters.institutionId}
          onToggleInstitution={(institutionId) =>
            setFilter(
              'institutionId',
              filters.institutionId === institutionId ? null : institutionId,
              'push',
            )
          }
        />
      </details>
    </section>
  )
}
```

- [ ] **Step 8: Update SlovakiaMap**

In `src/components/SlovakiaMap.tsx`:
- Add props `hoveredCity: string | null`, `onHoverCity: (city: string | null) => void`, `labelMinimumCount?: number`.
- Replace `const CITY_LABEL_MIN_COUNT = 50` with a default parameter `labelMinimumCount = 10`; set `CITY_MARK_MAX_RADIUS = 30`.
- Delete the `<figcaption>` block and the `<ul className="slovakia-map__key">` list (the strip replaces it); keep `id="slovakia-map-title"` on `<h3 className="visually-hidden" id="slovakia-map-title">Mestá navrhujúcich pracovísk</h3>`.
- On each city `<g>` add `onMouseEnter={() => onHoverCity(city.city)}` and `onMouseLeave={() => onHoverCity(null)}`; add class `is-hot` when `city.city === hoveredCity` and `is-dim` when `selectedCity !== null && selectedCity !== city.city`.
- Label placement: keep the `labelOnLeft` logic; show the label when `city.count >= labelMinimumCount || selected`.
- Add a size key group at the bottom-right of the SVG:

```tsx
<g
  className="slovakia-map__size-key"
  transform={`translate(${width - 96} ${height - 30})`}
  aria-hidden="true"
>
  {[200, 50, 10].map((value) => (
    <circle key={value} cx={0} cy={-radius(value)} r={radius(value)} />
  ))}
  {[200, 50, 10].map((value) => (
    <text key={value} x={radius(200) + 8} y={-2 * radius(value) + 4}>
      {value}
    </text>
  ))}
  <text x={-radius(200)} y={16}>vymenovaní vo výbere</text>
</g>
```

- [ ] **Step 9: CSS**

Replace the `.slovakia-map` block and add:

```css
.map-stage {
  max-width: var(--content-width);
  margin: var(--sp-4) auto 0;
  padding: var(--sp-4) var(--sp-5);
  background: var(--color-forest);
  color: var(--color-paper);
  display: grid;
  gap: var(--sp-3);
  --focus-ring: 3px solid var(--color-focus-on-dark);
}
.map-stage__head { display: flex; justify-content: space-between; align-items: baseline; gap: var(--sp-4); flex-wrap: wrap; }
.map-stage__head h2 { margin: 0; font-family: var(--font-display); font-weight: 500; font-size: var(--t-1); }
.map-stage__head h2 em { color: var(--color-focus-on-dark); }
.map-stage__periods { display: flex; flex-wrap: wrap; gap: 2px; border: 1px solid #2f4f45; padding: 2px; }
.map-stage__periods button { border: 0; background: transparent; color: #b8c6bd; padding: var(--sp-1) var(--sp-3); font-size: var(--t-small); font-weight: 600; cursor: pointer; font-variant-numeric: tabular-nums; }
.map-stage__periods button[aria-pressed='true'] { background: var(--color-paper); color: var(--color-forest); }
.map-stage__cap { margin: 0; font-size: var(--t-small); color: #b8c6bd; }
.slovakia-map svg { display: block; width: 100%; height: auto; }
.slovakia-map__outline { fill: var(--color-forest-deep); stroke: #b8c6bd; stroke-width: 1; }
.slovakia-map__mark { fill: var(--color-terracotta); fill-opacity: 0.9; stroke: var(--color-forest); stroke-width: 1.2; cursor: pointer; }
.is-hot .slovakia-map__mark { fill-opacity: 1; stroke: var(--color-focus-on-dark); }
.is-dim .slovakia-map__mark { fill-opacity: 0.35; }
.slovakia-map__label { font-size: 11.5px; font-weight: 600; fill: var(--color-paper); paint-order: stroke; stroke: var(--color-forest); stroke-width: 3px; stroke-linejoin: round; }
.slovakia-map__size-key circle { fill: none; stroke: #b8c6bd; }
.slovakia-map__size-key text { font-size: 10.5px; fill: #b8c6bd; }
@media (prefers-reduced-motion: no-preference) { .slovakia-map__mark { transition: r 0.35s ease; } }
@media (max-width: 600px) { .slovakia-map__label, .slovakia-map__size-key { display: none; } }
.city-strip { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: var(--sp-3); padding-top: var(--sp-3); border-top: 1px solid #2f4f45; }
.city-strip__cell { display: grid; gap: 2px; text-align: left; border: 0; background: transparent; color: inherit; padding: var(--sp-1) var(--sp-2); margin: 0 calc(-1 * var(--sp-2)); border-radius: 2px; cursor: pointer; font-size: var(--t-small); font-variant-numeric: tabular-nums; }
.city-strip__cell.is-hot, .city-strip__cell:hover { background: var(--color-forest-deep); }
.city-strip__cell.is-selected .city-strip__name { color: var(--color-focus-on-dark); }
.city-strip__bar { display: block; height: 6px; background: #2f4f45; position: relative; }
.city-strip__bar i { position: absolute; inset: 0 auto 0 0; background: var(--color-terracotta); }
.city-strip__values { display: flex; justify-content: space-between; color: #b8c6bd; }
.city-strip__values b { color: var(--color-paper); }
.city-strip svg { display: block; width: 100%; height: 26px; }
.city-strip svg path { fill: none; stroke: #b8c6bd; stroke-width: 1.2; }
.city-strip svg circle { fill: #b8c6bd; }
.city-strip svg circle.city-strip__now { fill: var(--color-terracotta); }
@media (max-width: 900px) { .city-strip { grid-template-columns: repeat(2, 1fr); } }
.fold { border: var(--rule); background: var(--color-paper-light); }
.fold--on-dark { border-color: #2f4f45; background: transparent; color: inherit; }
.fold > summary { padding: var(--sp-3) var(--sp-4); font-family: var(--font-display); font-size: var(--t-3); cursor: pointer; list-style: none; display: flex; justify-content: space-between; }
.fold > summary::after { content: '+'; font-family: var(--font-interface); }
.fold[open] > summary::after { content: '−'; }
.fold > :not(summary) { padding: 0 var(--sp-4) var(--sp-4); }
```

- [ ] **Step 10: Run all tests; delete the assertions in `AtlasSection.test.tsx` that referenced the removed map heading and key list; commit**

Run: `npx vitest --run && npx tsc -b`
Expected: PASS.

```bash
git add src/analysis src/components/MapStage.tsx src/components/MapStage.test.tsx src/components/CityStrip.tsx src/components/CityStrip.test.tsx src/components/SlovakiaMap.tsx src/components/AtlasSection.test.tsx src/styles
git commit -F - <<'MSG'
feat: add the annotated map stage with period switch

The map was a 720 px figure inside a filter grid. This commit builds the
full-width stage: a five-period switch driving the shared year range,
in-place labels for cities with 10+ appointments, a size key, hover
highlighting, and a seven-cell strip with share, change against
2000–2004 and a five-period sparkline. The institution ranking moves into
a closed fold under the strip.

- Add `MapStage` and `CityStrip`; extend `SlovakiaMap` with hover and key
- Period buttons call `setDateRange`; cells toggle the `city` filter
MSG
```

---

### Task 4: Findings analysis

**Files:**
- Create: `src/analysis/findings.ts`, `src/analysis/findings.test.ts`

**Interfaces:**
- Produces:

```ts
export interface TitleShareYear { year: number; total: number; phd: number; csc: number; drsc: number }
export function titleSharesByYear(records): TitleShareYear[]            // ascending years, substring match on titlesAfter
export function titleCrossoverYear(rows: TitleShareYear[]): number | null // first year with phd > csc
export interface MonthTotal { month: number /* 1-12 */; appointments: number; ceremonies: number }
export function monthTotals(records): MonthTotal[]                        // always 12 entries
export interface FieldShareRow { fieldKey: string; label: string; appointments: number; graduates: number; appointmentShare: number; graduateShare: number }
export function fieldShareRows(points: FieldEducationPoint[]): FieldShareRow[] // shares over all points
```

- [ ] **Step 1: Write the failing test**

```ts
// src/analysis/findings.test.ts
import { describe, expect, it } from 'vitest'

import { appointment } from '../test/atlasFixture'
import { fieldShareRows, monthTotals, titleCrossoverYear, titleSharesByYear } from './findings'

describe('findings', () => {
  it('counts title shares per year from titlesAfter', () => {
    const rows = titleSharesByYear([
      appointment({ appointedOn: '2007-06-26', titlesAfter: 'CSc.' }),
      appointment({ appointedOn: '2007-06-26', titlesAfter: 'PhD.' }),
      appointment({ appointedOn: '2008-01-15', titlesAfter: 'PhD.' }),
      appointment({ appointedOn: '2008-05-12', titlesAfter: 'DrSc. PhD.' }),
      appointment({ appointedOn: '2008-05-12', titlesAfter: null }),
    ])
    expect(rows).toEqual([
      { year: 2007, total: 2, phd: 1, csc: 1, drsc: 0 },
      { year: 2008, total: 3, phd: 2, csc: 0, drsc: 1 },
    ])
    expect(titleCrossoverYear(rows)).toBe(2008)
  })

  it('returns null when PhD. never overtakes CSc.', () => {
    expect(titleCrossoverYear([{ year: 2000, total: 2, phd: 1, csc: 1, drsc: 0 }])).toBeNull()
  })

  it('totals appointments and ceremonies for all twelve months', () => {
    const totals = monthTotals([
      appointment({ appointedOn: '2011-11-28' }),
      appointment({ appointedOn: '2011-11-28' }),
      appointment({ appointedOn: '2012-11-16' }),
      appointment({ appointedOn: '2012-07-10' }),
    ])
    expect(totals).toHaveLength(12)
    expect(totals[10]).toEqual({ month: 11, appointments: 3, ceremonies: 2 })
    expect(totals[6]).toEqual({ month: 7, appointments: 1, ceremonies: 1 })
    expect(totals[0]).toEqual({ month: 1, appointments: 0, ceremonies: 0 })
  })

  it('computes graduate and appointment shares over all points', () => {
    const rows = fieldShareRows([
      { fieldKey: 'a', canonicalLabel: 'A', appointmentCount: 3, graduateCount: 900 } as never,
      { fieldKey: 'b', canonicalLabel: 'B', appointmentCount: 1, graduateCount: 100 } as never,
    ])
    expect(rows).toEqual([
      { fieldKey: 'a', label: 'A', appointments: 3, graduates: 900, appointmentShare: 0.75, graduateShare: 0.9 },
      { fieldKey: 'b', label: 'B', appointments: 1, graduates: 100, appointmentShare: 0.25, graduateShare: 0.1 },
    ])
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest --run src/analysis/findings.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

```ts
// src/analysis/findings.ts
import type { Appointment } from '../data/types'
import type { FieldEducationPoint } from './fieldEducation'

export interface TitleShareYear {
  year: number
  total: number
  phd: number
  csc: number
  drsc: number
}

export interface MonthTotal {
  month: number
  appointments: number
  ceremonies: number
}

export interface FieldShareRow {
  fieldKey: string
  label: string
  appointments: number
  graduates: number
  appointmentShare: number
  graduateShare: number
}

function has(titles: string | null, token: string): boolean {
  return titles !== null && titles.includes(token)
}

export function titleSharesByYear(records: readonly Appointment[]): TitleShareYear[] {
  const byYear = new Map<number, TitleShareYear>()
  for (const record of records) {
    const year = Number.parseInt(record.appointedOn.slice(0, 4), 10)
    let row = byYear.get(year)
    if (row === undefined) {
      row = { year, total: 0, phd: 0, csc: 0, drsc: 0 }
      byYear.set(year, row)
    }
    row.total += 1
    if (has(record.titlesAfter, 'PhD')) row.phd += 1
    if (has(record.titlesAfter, 'CSc')) row.csc += 1
    if (has(record.titlesAfter, 'DrSc')) row.drsc += 1
  }
  return [...byYear.values()].sort((left, right) => left.year - right.year)
}

export function titleCrossoverYear(rows: readonly TitleShareYear[]): number | null {
  return rows.find((row) => row.phd > row.csc)?.year ?? null
}

export function monthTotals(records: readonly Appointment[]): MonthTotal[] {
  const totals = Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    appointments: 0,
    ceremonies: 0,
  }))
  const ceremonies = new Set<string>()
  for (const record of records) {
    const month = Number.parseInt(record.appointedOn.slice(5, 7), 10)
    const row = totals[month - 1]
    if (row === undefined) continue
    row.appointments += 1
    if (!ceremonies.has(record.appointedOn)) {
      ceremonies.add(record.appointedOn)
      row.ceremonies += 1
    }
  }
  return totals
}

export function fieldShareRows(points: readonly FieldEducationPoint[]): FieldShareRow[] {
  const appointmentTotal = points.reduce((total, point) => total + point.appointmentCount, 0)
  const graduateTotal = points.reduce((total, point) => total + point.graduateCount, 0)
  return points.map((point) => ({
    fieldKey: point.fieldKey,
    label: point.canonicalLabel,
    appointments: point.appointmentCount,
    graduates: point.graduateCount,
    appointmentShare: appointmentTotal === 0 ? 0 : point.appointmentCount / appointmentTotal,
    graduateShare: graduateTotal === 0 ? 0 : point.graduateCount / graduateTotal,
  }))
}
```

- [ ] **Step 4: Run tests, commit**

Run: `npx vitest --run src/analysis/findings.test.ts`
Expected: PASS.

```bash
git add src/analysis/findings.ts src/analysis/findings.test.ts
git commit -F - <<'MSG'
feat: derive title, month and field-share series for findings

The three finding cards need series that do not exist in selectors:
doctoral-title shares per year, appointments and ceremonies per month,
and each field's share of graduates versus appointments. This commit adds
them as pure functions over all records.

- Add `titleSharesByYear`, `titleCrossoverYear`, `monthTotals`,
  `fieldShareRows` in `src/analysis/findings.ts`
MSG
```

---

### Task 5: Finding cards

**Files:**
- Create: `src/components/charts/TitlesChart.tsx`, `src/components/charts/MonthsChart.tsx`, `src/components/charts/FieldDumbbell.tsx`
- Create: `src/components/FindingCards.tsx`, `src/components/FindingCards.test.tsx`
- Modify: `src/styles/components.css` (add `.cards`, `.card`, `.chart`, `.sw` blocks)

**Interfaces:**
- Consumes `titleSharesByYear`, `titleCrossoverYear`, `monthTotals`, `fieldShareRows`, `buildFieldEducationLandscape`.
- Produces `FindingCards({ data, onFieldSelect })` rendering `<section id="zistenia" className="cards" aria-label="Tri zistenia">` with three `<article className="card">`.
- Charts are pure: `TitlesChart({ rows, crossoverYear })`, `MonthsChart({ totals })`, `FieldDumbbell({ rows, onSelect })`. Each returns an `<svg className="chart" role="img" aria-label=…>`.
- `DUMBBELL_FIELDS = ['socialna praca','osetrovatelstvo','manazment','psychologia','informatika','pedagogika','hudobne umenie','odborova didaktika']`; missing keys are skipped.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/FindingCards.test.tsx
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { appointment } from '../test/atlasFixture'
import FindingCards from './FindingCards'

const years = Array.from({ length: 17 }, (_, index) => ({
  year: 2009 + index,
  programRowCount: 1,
  nationalGraduateCount: 100,
}))
const data = {
  records: [
    appointment({ appointedOn: '2007-06-26', titlesAfter: 'CSc.' }),
    appointment({ appointedOn: '2008-11-15', titlesAfter: 'PhD.' }),
    appointment({ appointedOn: '2011-11-28', titlesAfter: 'PhD.', fieldKey: 'socialna praca', field: 'sociálna práca' }),
    appointment({ appointedOn: '2011-11-28', titlesAfter: 'PhD.', fieldKey: 'psychologia', field: 'psychológia' }),
  ],
  fieldCatalog: {
    schemaVersion: 1,
    aliases: [],
    labels: { 'socialna praca': 'sociálna práca', psychologia: 'psychológia' },
  },
  fieldEducationComparison: {
    schemaVersion: 2,
    startYear: 2009,
    endYear: 2025,
    catalogUrl: '',
    graduateSources: [],
    currentStudentsSource: { year: 2025, archiveMember: null, localPath: '', url: '', sha256: '', retrievedOn: '' },
    years,
    rows: [
      { fieldKey: 'socialna praca', canonicalLabel: 'sociálna práca', graduateCounts: years.map(() => 900), currentStudentCount: 10 },
      { fieldKey: 'psychologia', canonicalLabel: 'psychológia', graduateCounts: years.map(() => 100), currentStudentCount: 10 },
    ],
  },
}

describe('FindingCards', () => {
  it('renders three cards with the crossover year in the first headline', () => {
    render(<FindingCards data={data as never} onFieldSelect={() => {}} />)
    const section = screen.getByRole('region', { name: 'Tri zistenia' })
    const cards = within(section).getAllByRole('article')
    expect(cards).toHaveLength(3)
    expect(within(cards[0]!).getByRole('heading', { level: 3 })).toHaveTextContent(
      'PhD. predbehol CSc. v roku 2008',
    )
    expect(within(cards[1]!).getByRole('heading', { level: 3 })).toHaveTextContent(
      'Každé piate vymenovanie je novembrové',
    )
    expect(within(cards[2]!).getByRole('link', { name: 'Celé porovnanie odborov' })).toHaveAttribute(
      'href',
      '#odbory',
    )
  })

  it('selects a field when a dumbbell row is activated', () => {
    const onFieldSelect = vi.fn()
    render(<FindingCards data={data as never} onFieldSelect={onFieldSelect} />)
    fireEvent.click(
      screen.getByRole('button', { name: /sociálna práca: 90,0 % absolventov, 50,0 % vymenovaní/ }),
    )
    expect(onFieldSelect).toHaveBeenCalledWith('socialna praca')
  })

  it('falls back to a neutral headline when there is no crossover', () => {
    render(
      <FindingCards
        data={{ ...data, records: [appointment({ appointedOn: '2000-02-22', titlesAfter: 'CSc.' })] } as never}
        onFieldSelect={() => {}}
      />,
    )
    expect(
      screen.getByRole('heading', { level: 3, name: 'Podiel vedeckých hodností po rokoch' }),
    ).toBeVisible()
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest --run src/components/FindingCards.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the three charts**

```tsx
// src/components/charts/TitlesChart.tsx
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'

import type { TitleShareYear } from '../../analysis/findings'
import { formatNumber } from '../../utils/format'

const W = 380
const H = 190
const M = { l: 34, r: 64, t: 14, b: 22 }
const SERIES = [
  { key: 'phd', label: 'PhD.', className: 'chart__line chart__line--1', dash: undefined },
  { key: 'csc', label: 'CSc.', className: 'chart__line chart__line--2', dash: '6 4' },
  { key: 'drsc', label: 'DrSc.', className: 'chart__line chart__line--3', dash: '2 3' },
] as const

interface TitlesChartProps {
  rows: readonly TitleShareYear[]
  crossoverYear: number | null
}

export default function TitlesChart({ rows, crossoverYear }: TitlesChartProps) {
  if (rows.length === 0) return null
  const first = rows[0]!.year
  const last = rows[rows.length - 1]!
  const x = scaleLinear().domain([first, Math.max(first + 1, last.year)]).range([M.l, W - M.r])
  const y = scaleLinear().domain([0, 1]).range([H - M.b, M.t])
  const share = (row: TitleShareYear, key: 'phd' | 'csc' | 'drsc') =>
    row.total === 0 ? 0 : row[key] / row.total
  const ends = SERIES.map((series) => ({ key: series.key, y: y(share(last, series.key)) + 4 })).sort(
    (a, b) => a.y - b.y,
  )
  for (let index = 1; index < ends.length; index += 1) {
    if (ends[index]!.y - ends[index - 1]!.y < 13) ends[index]!.y = ends[index - 1]!.y + 13
  }
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Podiel hodností PhD., CSc. a DrSc. medzi ročnými vymenovaniami"
    >
      {[0, 0.5, 1].map((value) => (
        <g key={value}>
          <line className="chart__grid" x1={M.l} x2={W - M.r} y1={y(value)} y2={y(value)} />
          <text className="chart__tick" x={M.l - 6} y={y(value) + 4} textAnchor="end">
            {formatNumber(value * 100)} %
          </text>
        </g>
      ))}
      {[first, 2010, 2020]
        .filter((year) => year >= first && year <= last.year)
        .map((year) => (
          <text key={year} className="chart__tick" x={x(year)} y={H - 6} textAnchor="middle">
            {year}
          </text>
        ))}
      {crossoverYear !== null && (
        <g>
          <line className="chart__marker" x1={x(crossoverYear)} x2={x(crossoverYear)} y1={M.t} y2={H - M.b} />
          <text className="chart__annotation" x={x(crossoverYear) + 5} y={M.t + 9}>
            {crossoverYear}
          </text>
        </g>
      )}
      {SERIES.map((series) => {
        const path =
          line<TitleShareYear>()
            .x((row) => x(row.year))
            .y((row) => y(share(row, series.key)))(rows) ?? undefined
        const end = ends.find((entry) => entry.key === series.key)!
        return (
          <g key={series.key}>
            <path className={series.className} d={path} strokeDasharray={series.dash} />
            <text className="chart__value" x={W - M.r + 6} y={end.y}>
              {series.label} {formatNumber(share(last, series.key) * 100)} %
            </text>
          </g>
        )
      })}
    </svg>
  )
}
```

```tsx
// src/components/charts/MonthsChart.tsx
import { scaleLinear } from 'd3-scale'

import type { MonthTotal } from '../../analysis/findings'
import { formatNumber } from '../../utils/format'

const W = 380
const H = 190
const M = { l: 8, r: 8, t: 22, b: 22 }
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec']

export default function MonthsChart({ totals }: { totals: readonly MonthTotal[] }) {
  const max = Math.max(1, ...totals.map(({ appointments }) => appointments))
  const bw = (W - M.l - M.r) / 12
  const h = scaleLinear().domain([0, max]).range([0, H - M.t - M.b])
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Vymenovania podľa mesiaca slávnosti, november zvýraznený"
    >
      {totals.map((row, index) => {
        const height = h(row.appointments)
        const x = M.l + index * bw + 3
        const november = row.month === 11
        return (
          <g key={row.month}>
            <rect
              className={november ? 'chart__bar chart__bar--accent' : 'chart__bar'}
              x={x}
              y={H - M.b - height}
              width={bw - 6}
              height={height}
            >
              <title>{`${MONTHS[index]}: ${formatNumber(row.appointments)} vymenovaní · ${formatNumber(row.ceremonies)} slávností`}</title>
            </rect>
            <text className="chart__tick" x={x + (bw - 6) / 2} y={H - 6} textAnchor="middle">
              {MONTHS[index]}
            </text>
            {november && (
              <text className="chart__value" x={x + (bw - 6) / 2} y={H - M.b - height - 6} textAnchor="end">
                {formatNumber(row.appointments)} · {formatNumber(row.ceremonies)} slávností
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
```

```tsx
// src/components/charts/FieldDumbbell.tsx
import { scaleLinear } from 'd3-scale'

import type { FieldShareRow } from '../../analysis/findings'
import { formatNumber } from '../../utils/format'

const W = 380
const M = { l: 150, r: 14, t: 18, b: 4 }
const ROW = 21

function pct(value: number): string {
  return `${formatNumber(value * 100, { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

interface FieldDumbbellProps {
  rows: readonly FieldShareRow[]
  onSelect: (fieldKey: string) => void
}

export default function FieldDumbbell({ rows, onSelect }: FieldDumbbellProps) {
  const H = M.t + rows.length * ROW + M.b
  const x = scaleLinear().domain([0, 0.2]).range([M.l, W - M.r])
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label="Podiel odboru na absolventoch a na vymenovaniach"
    >
      {[0, 0.1, 0.2].map((value) => (
        <g key={value}>
          <line className="chart__grid" x1={x(value)} x2={x(value)} y1={M.t - 4} y2={H - M.b} />
          <text className="chart__tick" x={x(value)} y={M.t - 8} textAnchor="middle">
            {formatNumber(value * 100)} %
          </text>
        </g>
      ))}
      {rows.map((row, index) => {
        const cy = M.t + index * ROW + ROW / 2
        return (
          <g
            key={row.fieldKey}
            role="button"
            tabIndex={0}
            className="chart__row"
            aria-label={`${row.label}: ${pct(row.graduateShare)} absolventov, ${pct(row.appointmentShare)} vymenovaní; vybrať odbor`}
            onClick={() => onSelect(row.fieldKey)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault()
                onSelect(row.fieldKey)
              }
            }}
          >
            <text className="chart__tick chart__tick--ink" x={M.l - 10} y={cy + 3.5} textAnchor="end">
              {row.label}
            </text>
            <line className="chart__connector" x1={x(row.appointmentShare)} x2={x(row.graduateShare)} y1={cy} y2={cy} />
            <circle className="chart__dot chart__dot--2" cx={x(row.graduateShare)} cy={cy} r={5} />
            <circle className="chart__dot chart__dot--1" cx={x(row.appointmentShare)} cy={cy} r={5} />
          </g>
        )
      })}
    </svg>
  )
}
```

- [ ] **Step 4: Implement FindingCards**

```tsx
// src/components/FindingCards.tsx
import { useMemo } from 'react'

import { buildFieldEducationLandscape } from '../analysis/fieldEducation'
import {
  fieldShareRows,
  monthTotals,
  titleCrossoverYear,
  titleSharesByYear,
} from '../analysis/findings'
import type { AtlasData } from '../data/types'
import { formatNumber } from '../utils/format'
import FieldDumbbell from './charts/FieldDumbbell'
import MonthsChart from './charts/MonthsChart'
import TitlesChart from './charts/TitlesChart'

export const DUMBBELL_FIELDS = [
  'socialna praca',
  'osetrovatelstvo',
  'manazment',
  'psychologia',
  'informatika',
  'pedagogika',
  'hudobne umenie',
  'odborova didaktika',
] as const

interface FindingCardsProps {
  data: AtlasData
  onFieldSelect: (fieldKey: string) => void
}

export default function FindingCards({ data, onFieldSelect }: FindingCardsProps) {
  const titles = useMemo(() => titleSharesByYear(data.records), [data.records])
  const crossover = titleCrossoverYear(titles)
  const months = useMemo(() => monthTotals(data.records), [data.records])
  const november = months[10]!
  const total = data.records.length
  const shareRows = useMemo(() => {
    const landscape = buildFieldEducationLandscape(
      data.records,
      data.fieldCatalog,
      data.fieldEducationComparison,
    )
    const rows = fieldShareRows(landscape.points)
    return DUMBBELL_FIELDS.flatMap((key) => rows.filter((row) => row.fieldKey === key))
  }, [data])
  const lead = shareRows[0]

  return (
    <section id="zistenia" className="cards" aria-label="Tri zistenia">
      <article className="card">
        <p className="card__kicker">Vedecké hodnosti</p>
        <h3>
          {crossover === null
            ? 'Podiel vedeckých hodností po rokoch'
            : `PhD. predbehol CSc. v roku ${crossover}`}
        </h3>
        <p className="card__sub">
          Podiel hodnosti medzi ročnými vymenovaniami: <i className="sw sw--1" />PhD.{' '}
          <i className="sw sw--2" />CSc. <i className="sw sw--3" />DrSc.
        </p>
        <TitlesChart rows={titles} crossoverYear={crossover} />
        <a href="#register">Záznamy podľa hodnosti</a>
      </article>
      <article className="card">
        <p className="card__kicker">Kalendár slávností</p>
        <h3>
          {total > 0 && november.appointments / total >= 0.18
            ? 'Každé piate vymenovanie je novembrové'
            : 'Vymenovania podľa mesiaca slávnosti'}
        </h3>
        <p className="card__sub">
          {formatNumber(november.appointments)} z {formatNumber(total)} vymenovaní na{' '}
          {formatNumber(november.ceremonies)} novembrových slávnostiach.
        </p>
        <MonthsChart totals={months} />
        <a href="#register">Všetky slávnosti v registri</a>
      </article>
      <article className="card">
        <p className="card__kicker">Odbory × absolventi</p>
        <h3>
          {lead === undefined
            ? 'Podiel odborov na absolventoch a vymenovaniach'
            : `${lead.label[0]!.toUpperCase()}${lead.label.slice(1)}: ${formatNumber(
                lead.graduateShare * 100,
              )} % absolventov, ${formatNumber(lead.appointmentShare * 100)} % profesorov`}
        </h3>
        <p className="card__sub">
          Podiel odboru na <i className="sw sw--2" />absolventoch a na{' '}
          <i className="sw sw--1" />vymenovaniach, 2009–2025.
        </p>
        <FieldDumbbell rows={shareRows} onSelect={onFieldSelect} />
        <a href="#odbory">Celé porovnanie odborov</a>
      </article>
    </section>
  )
}
```

- [ ] **Step 5: CSS**

```css
.cards { max-width: var(--content-width); margin: var(--sp-4) auto 0; padding: 0 var(--page-gutter); display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--sp-4); }
@media (max-width: 900px) { .cards { grid-template-columns: 1fr; } }
.card { background: var(--color-paper-light); border: var(--rule); padding: var(--sp-4) var(--sp-4) var(--sp-3); display: grid; grid-template-rows: auto auto auto 1fr auto; gap: var(--sp-1); }
.card__kicker { margin: 0; font-size: var(--t-label); letter-spacing: 0.11em; text-transform: uppercase; font-weight: 600; color: var(--color-ink-muted); }
.card h3 { margin: 0; font-family: var(--font-display); font-weight: 500; font-size: var(--t-2); line-height: 1.1; min-height: 2.2em; text-wrap: balance; }
.card__sub { margin: 0; font-size: var(--t-small); color: var(--color-ink-muted); min-height: 2.9em; }
.card a { justify-self: start; margin-top: var(--sp-2); font-size: var(--t-small); font-weight: 600; text-decoration-color: currentColor; text-decoration-thickness: 1px; }
.sw { display: inline-block; width: 9px; height: 9px; border-radius: 50%; vertical-align: middle; margin: 0 3px 0 2px; }
.sw--1 { background: var(--series-1); }
.sw--2 { background: var(--series-2); }
.sw--3 { background: var(--series-3); }
.chart { display: block; width: 100%; height: auto; font-family: var(--font-interface); }
.chart__grid { stroke: var(--color-line); stroke-opacity: 0.6; }
.chart__tick { font-size: 11px; fill: var(--color-ink-muted); }
.chart__tick--ink { fill: var(--color-ink); }
.chart__value { font-size: 11px; font-weight: 600; fill: var(--color-ink); font-variant-numeric: tabular-nums; }
.chart__annotation { font-size: 11px; font-weight: 600; fill: var(--color-ink); }
.chart__marker { stroke: var(--color-line); stroke-dasharray: 2 4; }
.chart__line { fill: none; stroke-width: 2; stroke-linejoin: round; }
.chart__line--1 { stroke: var(--series-1); }
.chart__line--2 { stroke: var(--series-2); }
.chart__line--3 { stroke: var(--series-3); }
.chart__bar { fill: var(--color-paper-deep); }
.chart__bar--accent { fill: var(--series-1); }
.chart__connector { stroke: var(--color-line); stroke-width: 2; }
.chart__dot--1 { fill: var(--series-1); }
.chart__dot--2 { fill: var(--series-2); }
.chart__row { cursor: pointer; }
.chart__row:focus-visible { outline: none; }
.chart__row:focus-visible .chart__tick--ink { text-decoration: underline; }
```

- [ ] **Step 6: Run tests, commit**

Run: `npx vitest --run src/components/FindingCards.test.tsx && npx tsc -b`
Expected: PASS.

```bash
git add src/components/charts src/components/FindingCards.tsx src/components/FindingCards.test.tsx src/styles/components.css
git commit -F - <<'MSG'
feat: add three finding cards with charts

The findings section was three text tiles with two bars. This commit adds
three equal cards, each with one headline sentence, one line of context
with inline swatches, one chart and one link: the PhD./CSc. handover,
appointments by month, and each field's share of graduates versus
appointments.

- Add `TitlesChart`, `MonthsChart`, `FieldDumbbell` pure SVG charts
- Add `FindingCards`; dumbbell rows select a field via `onFieldSelect`
MSG
```

---

### Task 6: Context strip

**Files:**
- Create: `src/components/charts/SmallLine.tsx`
- Create: `src/components/ContextStrip.tsx`, `src/components/ContextStrip.test.tsx`
- Modify: `src/styles/components.css` (add `.context-strip`; keep the existing `.context-*` blocks for the fold)

**Interfaces:**
- Consumes `ContextSectionBody` from `./ContextSection` (props `years`, `selectedYear`, `setSelectedYear`).
- Produces `ContextStrip({ years, selectedYear, setSelectedYear })` rendering `<section id="kontext" className="context-strip" aria-labelledby="context-strip-title">`.
- `SmallLine({ points, format, ariaLabel, markerYear?, markerLabel?, colorClass })` where `points: { year: number; value: number }[]`.

- [ ] **Step 1: Write the failing test**

```tsx
// src/components/ContextStrip.test.tsx
import '@testing-library/jest-dom/vitest'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { contextYear } from '../test/atlasFixture'
import ContextStrip from './ContextStrip'

const years = [
  contextYear({ year: 2000, appointmentsPer100Professors: 11.19, internalProfessors: 938 }),
  contextYear({ year: 2007, appointmentsPer100Professors: 3.17, internalProfessors: 1452 }),
  contextYear({ year: 2025, appointmentsPer100Professors: 3.38, internalProfessors: 1627 }),
]

describe('ContextStrip', () => {
  it('draws inflow rate and professor stock as two single-series charts with end values', () => {
    render(<ContextStrip years={years} selectedYear={2025} setSelectedYear={vi.fn()} />)
    const section = screen.getByRole('region', { name: 'Prítok a stav profesúry' })
    const rate = within(section).getByRole('img', {
      name: 'Vymenovania na 100 interných profesorov, 2000–2025',
    })
    expect(rate).toHaveTextContent('11,19')
    expect(rate).toHaveTextContent('3,38')
    const stock = within(section).getByRole('img', {
      name: 'Interní profesori k 31. októbru, 2000–2025',
    })
    expect(stock).toHaveTextContent(/1[\s ]627/)
  })

  it('keeps the full national context in a closed fold', () => {
    render(<ContextStrip years={years} selectedYear={2025} setSelectedYear={vi.fn()} />)
    const fold = screen.getByText('Národný kontext v detaile').closest('details')
    expect(fold).not.toHaveAttribute('open')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest --run src/components/ContextStrip.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement SmallLine and ContextStrip**

```tsx
// src/components/charts/SmallLine.tsx
import { scaleLinear } from 'd3-scale'
import { line } from 'd3-shape'

interface Point {
  year: number
  value: number
}

interface SmallLineProps {
  points: readonly Point[]
  format: (value: number) => string
  ariaLabel: string
  markerYear?: number
  markerLabel?: string
  colorClass: 'chart__line--1' | 'chart__line--2'
}

const W = 370
const H = 200
const M = { l: 40, r: 56, t: 16, b: 26 }

export default function SmallLine({
  points,
  format,
  ariaLabel,
  markerYear,
  markerLabel,
  colorClass,
}: SmallLineProps) {
  if (points.length === 0) return null
  const first = points[0]!
  const last = points[points.length - 1]!
  const max = Math.max(...points.map(({ value }) => value))
  const x = scaleLinear().domain([first.year, Math.max(first.year + 1, last.year)]).range([M.l, W - M.r])
  const y = scaleLinear().domain([0, max]).nice(2).range([H - M.b, M.t])
  const path = line<Point>().x((p) => x(p.year)).y((p) => y(p.value))(points) ?? undefined
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel}>
      {y.ticks(2).map((tick) => (
        <g key={tick}>
          <line className="chart__grid" x1={M.l} x2={W - M.r} y1={y(tick)} y2={y(tick)} />
          <text className="chart__tick" x={M.l - 6} y={y(tick) + 4} textAnchor="end">
            {format(tick)}
          </text>
        </g>
      ))}
      {markerYear !== undefined && markerYear > first.year && markerYear < last.year && (
        <g>
          <line className="chart__marker" x1={x(markerYear)} x2={x(markerYear)} y1={M.t} y2={H - M.b} />
          {markerLabel && (
            <text className="chart__tick" x={x(markerYear) + 4} y={M.t + 10}>
              {markerLabel}
            </text>
          )}
        </g>
      )}
      <path className={`chart__line ${colorClass}`} d={path} />
      {points.map((p) => (
        <circle key={p.year} className="chart__probe" cx={x(p.year)} cy={y(p.value)} r={6}>
          <title>{`${p.year}: ${format(p.value)}`}</title>
        </circle>
      ))}
      <text className="chart__value" x={x(first.year) + 8} y={y(first.value) - 8}>
        {format(first.value)}
      </text>
      <text className="chart__value" x={x(last.year) + 8} y={y(last.value) + 4}>
        {format(last.value)}
      </text>
      <text className="chart__tick" x={x(first.year)} y={H - 8} textAnchor="start">
        {first.year}
      </text>
      <text className="chart__tick" x={x(last.year)} y={H - 8} textAnchor="end">
        {last.year}
      </text>
    </svg>
  )
}
```

```tsx
// src/components/ContextStrip.tsx
import type { ContextYear } from '../data/types'
import { formatNumber } from '../utils/format'
import SmallLine from './charts/SmallLine'
import { ContextSectionBody } from './ContextSection'

interface ContextStripProps {
  years: ContextYear[]
  selectedYear: number
  setSelectedYear: (year: number, mode: 'push') => void
}

export default function ContextStrip({ years, selectedYear, setSelectedYear }: ContextStripProps) {
  const ordered = [...years].sort((a, b) => a.year - b.year)
  const span =
    ordered.length === 0 ? '' : `${ordered[0]!.year}–${ordered[ordered.length - 1]!.year}`
  return (
    <section id="kontext" className="context-strip" aria-labelledby="context-strip-title">
      <div className="context-strip__head">
        <p className="card__kicker">Kontext · CVTI SR</p>
        <h2 id="context-strip-title">Prítok a stav profesúry</h2>
        <p className="card__sub">
          Ročný tok vymenovaní delený stavom profesorov medzi internými učiteľmi; zvislá čiara
          je metodická zmena z roku 2007.
        </p>
      </div>
      <div className="context-strip__charts">
        <div>
          <p className="card__kicker">Vymenovania na 100 interných profesorov</p>
          <SmallLine
            points={ordered.map((y) => ({ year: y.year, value: y.appointmentsPer100Professors }))}
            format={(v) => formatNumber(v, { maximumFractionDigits: 2 })}
            ariaLabel={`Vymenovania na 100 interných profesorov, ${span}`}
            markerYear={2007}
            markerLabel="2007"
            colorClass="chart__line--1"
          />
        </div>
        <div>
          <p className="card__kicker">Interní profesori k 31. októbru</p>
          <SmallLine
            points={ordered.map((y) => ({ year: y.year, value: y.internalProfessors }))}
            format={(v) => formatNumber(Math.round(v))}
            ariaLabel={`Interní profesori k 31. októbru, ${span}`}
            markerYear={2007}
            colorClass="chart__line--2"
          />
        </div>
      </div>
      <details className="fold">
        <summary>Národný kontext v detaile</summary>
        <ContextSectionBody years={years} selectedYear={selectedYear} setSelectedYear={setSelectedYear} />
      </details>
    </section>
  )
}
```

- [ ] **Step 4: CSS**

```css
.context-strip { max-width: var(--content-width); margin: var(--sp-4) auto 0; padding: var(--sp-4) var(--page-gutter) 0; display: grid; gap: var(--sp-3); }
.context-strip__head h2 { margin: 0; font-family: var(--font-display); font-weight: 500; font-size: var(--t-2); }
.context-strip__charts { display: grid; grid-template-columns: 1fr 1fr; gap: var(--sp-4); }
@media (max-width: 760px) { .context-strip__charts { grid-template-columns: 1fr; } }
.chart__probe { fill: transparent; }
```

- [ ] **Step 5: Run tests, commit**

Run: `npx vitest --run src/components/ContextStrip.test.tsx && npx tsc -b`
Expected: PASS.

```bash
git add src/components/charts/SmallLine.tsx src/components/ContextStrip.tsx src/components/ContextStrip.test.tsx src/styles/components.css
git commit -F - <<'MSG'
feat: add compact context strip with detail fold

The national context section spent 2 660 px on definitions, a selected
year block and two charts. This commit keeps its content but leads with
the one trend that matters, inflow against the professor stock, as two
single-series charts, and moves the full section body into a closed fold.

- Add `SmallLine` and `ContextStrip`; reuse `ContextSectionBody` in the fold
MSG
```

---

### Task 7: Field section

**Files:**
- Modify: `src/components/FieldEducationScatter.tsx` (accept `mode` and `zeroRail` props, ratio guides, zero rail, remove the inline mode buttons and the figcaption heading)
- Modify: `src/components/FieldEducationScatter.test.tsx` (pass `mode="log"` and `zeroRail={[]}`; add guide and rail assertions)
- Create: `src/components/FieldSection.tsx`, `src/components/FieldSection.test.tsx`
- Delete: `src/components/FieldEducationComparison.tsx`, `src/components/FieldEducationComparison.test.tsx`, `src/components/FieldEducationRankingDonuts.tsx`
- Modify: `src/components/FieldEducationRankings.tsx` (remove the donuts import and render) and its test
- Modify: `src/App.tsx` (import `FieldSection` in place of `FieldEducationComparison` with the same props so the app compiles)
- Modify: `src/styles/components.css` (delete `.section--field-comparison` block ~2259–3040 and the donut rules; add `.field-section`)

**Interfaces:**
- `FieldEducationScatter` props become `{ points, selectedField, onFieldSelect, mode: ScaleMode, zeroRail: readonly FieldEducationLandscapeRow[] }`. `zeroRail` rows render as `<circle data-testid="field-rail-<key>">` on a rail 30 px under the x axis and are selectable like points.
- Produces `FieldSection({ data, selectedField, onFieldSelect, fieldRange, onFieldRangeChange })` rendering `<section id="odbory" className="field-section" aria-labelledby="field-section-title">`.

- [ ] **Step 1: Write the failing FieldSection test**

```tsx
// src/components/FieldSection.test.tsx
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { appointment } from '../test/atlasFixture'
import FieldSection from './FieldSection'

const years = Array.from({ length: 17 }, (_, index) => ({
  year: 2009 + index,
  programRowCount: 1,
  nationalGraduateCount: 100,
}))
const data = {
  records: [
    appointment({ appointedOn: '2011-01-24', fieldKey: 'socialna praca', field: 'sociálna práca' }),
    appointment({ appointedOn: '2012-07-10', fieldKey: 'hudobne umenie', field: 'hudobné umenie' }),
  ],
  fieldCatalog: {
    schemaVersion: 1,
    aliases: [],
    labels: { 'socialna praca': 'sociálna práca', 'hudobne umenie': 'hudobné umenie' },
  },
  fieldEducationComparison: {
    schemaVersion: 2,
    startYear: 2009,
    endYear: 2025,
    catalogUrl: 'https://example.test/katalog',
    graduateSources: [],
    currentStudentsSource: { year: 2025, archiveMember: null, localPath: 'x.xls', url: 'https://example.test/x', sha256: '', retrievedOn: '2026-08-30' },
    years,
    rows: [
      { fieldKey: 'socialna praca', canonicalLabel: 'sociálna práca', graduateCounts: years.map(() => 100), currentStudentCount: 10 },
      { fieldKey: 'hudobne umenie', canonicalLabel: 'hudobné umenie', graduateCounts: years.map(() => 0), currentStudentCount: null },
    ],
  },
}
const range = { startYear: 2009, endYear: 2025 }

describe('FieldSection', () => {
  it('renders the scatter, the rail and the detail for the selected field', () => {
    render(
      <FieldSection data={data as never} selectedField="socialna praca" onFieldSelect={vi.fn()} fieldRange={range} onFieldRangeChange={vi.fn()} />,
    )
    const section = screen.getByRole('region', {
      name: 'Profesorské vymenovania a absolventi v rovnakom odbore',
    })
    expect(within(section).getByTestId('field-point-socialna praca')).toBeInTheDocument()
    expect(within(section).getByTestId('field-rail-hudobne umenie')).toBeInTheDocument()
    expect(within(section).getByRole('heading', { name: 'sociálna práca' })).toBeVisible()
    expect(within(section).getByText('Rebríček odborov').closest('details')).not.toHaveAttribute('open')
  })

  it('selects a field from the search box on Enter and switches the scale', () => {
    const onFieldSelect = vi.fn()
    render(
      <FieldSection data={data as never} selectedField={null} onFieldSelect={onFieldSelect} fieldRange={range} onFieldRangeChange={vi.fn()} />,
    )
    const search = screen.getByRole('combobox', { name: 'Nájsť odbor' })
    fireEvent.change(search, { target: { value: 'hudobne' } })
    fireEvent.keyDown(search, { key: 'Enter' })
    expect(onFieldSelect).toHaveBeenCalledWith('hudobne umenie')
    fireEvent.click(screen.getByRole('button', { name: 'Absolútna' }))
    expect(screen.getByRole('button', { name: 'Absolútna' })).toHaveAttribute('aria-pressed', 'true')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest --run src/components/FieldSection.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Update FieldEducationScatter**

- Replace `const [mode, setMode] = useState<ScaleMode>('log')` with the props `mode: ScaleMode` and `zeroRail: readonly FieldEducationLandscapeRow[]`; delete the `<div className="field-education-scatter__modes">` and the figcaption heading text (keep `<h3 className="visually-hidden" id="field-education-scatter-title">Mapa spoločného obdobia</h3>`).
- Lift the two domains into `useMemo`: `const xDomain = fieldScaleDomain(points.map((p) => p.appointmentCount), mode)` and `const yDomain = fieldScaleDomain(points.map((p) => p.graduateCount), mode)`; build `xScale`/`yScale` from them once (log or linear) and reuse them for ticks, guides and the rail.
- Guides (log mode only), inside the SVG after the grid group:

```tsx
{mode === 'log' &&
  [10, 100, 1000].map((ratio) => {
    const a0 = Math.max(xDomain[0], yDomain[0] / ratio)
    const a1 = Math.min(xDomain[1], yDomain[1] / ratio)
    if (a0 >= a1) return null
    const am = Math.exp((Math.log(a0) + Math.log(a1)) / 2)
    return (
      <g key={ratio} className="field-education-scatter__guide" aria-hidden="true">
        <line x1={xScale(a0)} y1={yScale(a0 * ratio)} x2={xScale(a1)} y2={yScale(a1 * ratio)} />
        <text x={xScale(am) + 4} y={yScale(am * ratio) - 5}>
          {formatNumber(ratio)} absolventov na vymenovanie
        </text>
      </g>
    )
  })}
```

- Zero rail under the axis. Add `const RAIL_Y = PLOT.y + PLOT.height + 30` and raise `HEIGHT` to 580:

```tsx
<g className="field-education-scatter__rail">
  <line x1={PLOT.x} x2={PLOT.x + PLOT.width} y1={RAIL_Y} y2={RAIL_Y} />
  <text x={PLOT.x - 6} y={RAIL_Y + 4} textAnchor="end">0</text>
  <text x={PLOT.x + PLOT.width} y={RAIL_Y + 16} textAnchor="end">
    odbory bez absolventa v období
  </text>
  {zeroRail.map((row) => (
    <circle
      key={row.fieldKey}
      data-testid={`field-rail-${row.fieldKey}`}
      className="field-education-scatter__point"
      cx={xScale(Math.max(row.appointmentCount, xDomain[0]))}
      cy={RAIL_Y}
      r={4.5}
      role="button"
      tabIndex={0}
      aria-label={`${row.canonicalLabel}: ${formatNumber(row.appointmentCount)} vymenovaní, bez absolventa`}
      onClick={() => onFieldSelect(row.fieldKey)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onFieldSelect(row.fieldKey)
        }
      }}
    />
  ))}
</g>
```

- In `FieldEducationScatter.test.tsx` pass `mode="log"` and `zeroRail={[]}` everywhere; replace the test that clicks „Absolútna“ with a render at `mode="linear"`; add:

```tsx
it('draws three ratio guides in log mode and a rail point for zero-graduate fields', () => {
  render(
    <FieldEducationScatter
      points={points}
      selectedField={null}
      onFieldSelect={vi.fn()}
      mode="log"
      zeroRail={[{ ...points[0]!, fieldKey: 'x', canonicalLabel: 'x', graduateCount: 0, graduatesPerAppointment: null }]}
    />,
  )
  expect(document.querySelectorAll('.field-education-scatter__guide')).toHaveLength(3)
  expect(screen.getByTestId('field-rail-x')).toBeInTheDocument()
})
```

- [ ] **Step 4: Implement FieldSection**

```tsx
// src/components/FieldSection.tsx
import { useMemo, useState } from 'react'

import { buildFieldEducationLandscape, type FieldEducationRange } from '../analysis/fieldEducation'
import type { AtlasData } from '../data/types'
import { formatNumber } from '../utils/format'
import { normalizeForSearch } from '../utils/search'
import FieldEducationDetail from './FieldEducationDetail'
import FieldEducationRankings from './FieldEducationRankings'
import FieldEducationScatter from './FieldEducationScatter'
import type { ScaleMode } from './fieldEducationGeometry'

interface FieldSectionProps {
  data: AtlasData
  selectedField: string | null
  onFieldSelect: (fieldKey: string) => void
  fieldRange: FieldEducationRange
  onFieldRangeChange: (startYear: number, endYear: number) => void
}

export default function FieldSection({
  data,
  selectedField,
  onFieldSelect,
  fieldRange,
  onFieldRangeChange,
}: FieldSectionProps) {
  const [mode, setMode] = useState<ScaleMode>('log')
  const [query, setQuery] = useState('')
  const landscape = useMemo(
    () =>
      buildFieldEducationLandscape(
        data.records,
        data.fieldCatalog,
        data.fieldEducationComparison,
        fieldRange,
      ),
    [data, fieldRange],
  )
  const points = landscape.points.filter((point) => point.graduateCount > 0)
  const zeroRail = landscape.points.filter((point) => point.graduateCount === 0)
  const selectedRow =
    landscape.allRows.find((row) => row.fieldKey === selectedField) ??
    points[0] ??
    landscape.allRows[0]
  const years = data.fieldEducationComparison.years.map(({ year }) => year)
  const findMatch = () => {
    const needle = normalizeForSearch(query)
    if (needle.length === 0) return null
    return (
      landscape.allRows.find((row) => normalizeForSearch(row.canonicalLabel) === needle) ??
      landscape.allRows.find((row) => normalizeForSearch(row.canonicalLabel).includes(needle)) ??
      null
    )
  }

  return (
    <section id="odbory" className="field-section" aria-labelledby="field-section-title">
      <div className="field-section__head">
        <div>
          <p className="card__kicker">
            Odbory × absolventi · {fieldRange.startYear}–{fieldRange.endYear}
          </p>
          <h2 id="field-section-title">Profesorské vymenovania a absolventi v rovnakom odbore</h2>
          <p className="card__sub">
            Každý bod je jeden recenzovaný odbor: vodorovne počet vymenovaní, zvislo počet
            absolventov I. až III. stupňa za vybrané obdobie. Šikmé čiary sú pomery absolventov
            na jedno vymenovanie.
          </p>
        </div>
        <div className="field-section__search">
          <input
            type="search"
            role="combobox"
            aria-label="Nájsť odbor"
            aria-expanded="false"
            aria-controls="field-section-list"
            list="field-section-list"
            placeholder="Nájsť odbor"
            value={query}
            onChange={(event) => {
              const value = event.currentTarget.value
              setQuery(value)
              const exact = landscape.allRows.find(
                (row) => normalizeForSearch(row.canonicalLabel) === normalizeForSearch(value),
              )
              if (exact) onFieldSelect(exact.fieldKey)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                const match = findMatch()
                if (match) onFieldSelect(match.fieldKey)
              }
            }}
          />
          <datalist id="field-section-list">
            {landscape.allRows.map((row) => (
              <option key={row.fieldKey} value={row.canonicalLabel} />
            ))}
          </datalist>
        </div>
        <div className="field-section__controls">
          <div className="seg" role="group" aria-label="Mierka">
            <button type="button" aria-pressed={mode === 'log'} onClick={() => setMode('log')}>
              Logaritmická
            </button>
            <button type="button" aria-pressed={mode === 'linear'} onClick={() => setMode('linear')}>
              Absolútna
            </button>
          </div>
          <label>
            Od roku
            <select
              aria-label="Odbory od roku"
              value={fieldRange.startYear}
              onChange={(event) => onFieldRangeChange(Number(event.currentTarget.value), fieldRange.endYear)}
            >
              {years.map((year) => (
                <option key={year} value={year} disabled={year > fieldRange.endYear}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <label>
            Do roku
            <select
              aria-label="Odbory do roku"
              value={fieldRange.endYear}
              onChange={(event) => onFieldRangeChange(fieldRange.startYear, Number(event.currentTarget.value))}
            >
              {years.map((year) => (
                <option key={year} value={year} disabled={year < fieldRange.startYear}>
                  {year}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="field-section__plot">
        <FieldEducationScatter
          points={points}
          zeroRail={zeroRail}
          selectedField={selectedField}
          onFieldSelect={onFieldSelect}
          mode={mode}
        />
      </div>
      <aside className="field-section__detail">
        {selectedRow === undefined ? (
          <p role="status">V spoločnom období nie sú dostupné odbory na porovnanie.</p>
        ) : (
          <FieldEducationDetail row={selectedRow} />
        )}
      </aside>
      <p className="field-section__cap">
        {formatNumber(points.length)} odborov s absolventmi aj vymenovaním,{' '}
        {formatNumber(zeroRail.length)} odborov s vymenovaním bez absolventa (spodný riadok),{' '}
        {formatNumber(landscape.unmatched.length)} odborov bez spárovania. Spárované vymenovania:{' '}
        {formatNumber(landscape.coverage.matchedAppointmentCount)} z{' '}
        {formatNumber(landscape.coverage.appointmentCount)} (
        {formatNumber(landscape.coverage.exactAppointmentCount)} presne,{' '}
        {formatNumber(landscape.coverage.aliasAppointmentCount)} aliasom). Pomer je opisný, nie
        príčinný.
      </p>
      <details className="fold field-section__fold">
        <summary>Rebríček odborov</summary>
        <FieldEducationRankings rows={landscape.allRows} selectedField={selectedField} onFieldSelect={onFieldSelect} />
      </details>
      <p className="field-section__sources">
        <a href={data.fieldEducationComparison.catalogUrl}>Štatistické ročenky CVTI SR</a> ·
        absolventi {data.fieldEducationComparison.startYear}–{data.fieldEducationComparison.endYear}
        · študenti k 31. 10. {data.fieldEducationComparison.currentStudentsSource.year}
      </p>
    </section>
  )
}
```

`FieldEducationPoint.graduateCount` is `number`, so rows with zero graduates are points with `graduatesPerAppointment: 0`; the two filters above split them correctly.

- [ ] **Step 5: Remove the donuts and the old comparison**

`git rm src/components/FieldEducationComparison.tsx src/components/FieldEducationComparison.test.tsx src/components/FieldEducationRankingDonuts.tsx`. In `FieldEducationRankings.tsx` remove the donut import and its render; in its test delete assertions that referenced „Podiel vymenovaní“ / „Podiel absolventov“. In `App.tsx` swap the `FieldEducationComparison` import and element for `FieldSection` with props `data`, `selectedField`, `onFieldSelect`, `fieldRange`, `onFieldRangeChange` (the `comparison`, `fieldCatalog`, `allRecords` props are gone). In `App.test.tsx` rename the region `'Profesorské vymenovania × absolventi'` to `'Profesorské vymenovania a absolventi v rovnakom odbore'` and replace the „Pokrytie odborového porovnania“ label lookups with `within(section).getByText(/Spárované vymenovania:/)`.

- [ ] **Step 6: CSS**

Delete the `.section--field-comparison` block and every `.field-education-rankings__donut*` rule. Add:

```css
.field-section { max-width: var(--content-width); margin: var(--sp-4) auto 0; border: var(--rule); background: var(--color-paper-light); display: grid; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
@media (max-width: 900px) { .field-section { grid-template-columns: 1fr; } }
.field-section__head { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr auto auto; gap: var(--sp-3) var(--sp-5); align-items: end; padding: var(--sp-4); border-bottom: var(--rule); }
.field-section__head h2 { margin: 0; font-family: var(--font-display); font-weight: 500; font-size: var(--t-2); }
.field-section__search input { font: inherit; font-size: var(--t-body); padding: var(--sp-2) var(--sp-3); border: var(--rule); background: var(--color-paper); min-width: 16rem; }
.field-section__controls { display: flex; gap: var(--sp-3); align-items: end; font-size: var(--t-small); }
.field-section__controls label { display: grid; gap: 2px; }
.field-section__controls select { font: inherit; font-size: var(--t-body); padding: var(--sp-1) var(--sp-2); border: var(--rule); background: var(--color-paper); }
.seg { display: flex; border: var(--rule); padding: 2px; gap: 2px; }
.seg button { border: 0; background: transparent; color: var(--color-ink-muted); padding: var(--sp-1) var(--sp-3); font-size: var(--t-small); font-weight: 600; cursor: pointer; }
.seg button[aria-pressed='true'] { background: var(--color-ink); color: var(--color-paper); }
@media (max-width: 900px) { .field-section__head { grid-template-columns: 1fr; } .field-section__search input { min-width: 0; width: 100%; } }
.field-section__plot { padding: var(--sp-3); }
.field-section__detail { border-left: var(--rule); padding: var(--sp-4); }
@media (max-width: 900px) { .field-section__detail { border-left: 0; border-top: var(--rule); } }
.field-section__cap, .field-section__sources { grid-column: 1 / -1; margin: 0; padding: var(--sp-2) var(--sp-4); font-size: var(--t-small); color: var(--color-ink-muted); }
.field-section__fold { grid-column: 1 / -1; border-left: 0; border-right: 0; border-bottom: 0; }
.field-education-scatter__guide line { stroke: var(--color-line); stroke-dasharray: 3 4; }
.field-education-scatter__guide text { font-family: var(--font-display); font-style: italic; font-size: 12px; fill: var(--color-ink-muted); paint-order: stroke; stroke: var(--color-paper-light); stroke-width: 3px; }
.field-education-scatter__rail line { stroke: var(--color-line); }
.field-education-scatter__rail text { font-size: 10.5px; fill: var(--color-ink-muted); }
```

Also restyle the existing `.field-education-scatter` and `.field-education-detail` blocks to the compact scale in place: chart text 10.5–11 px, headings `var(--t-2)`, totals in a two-column `dl` with `var(--sp-2)` gaps. Keep the class names.

- [ ] **Step 7: Run tests, commit**

Run: `npx vitest --run && npx tsc -b`
Expected: PASS.

```bash
git add -A src/components src/styles src/App.tsx src/App.test.tsx
git commit -F - <<'MSG'
feat: make the field comparison its own compact screen

The field comparison opened with two donuts (one 85 % "other") and closed
with a 31 000 px ranking list. This commit rebuilds it as one screen:
header with search, scale toggle and range; the scatter with ratio guides
and a zero-graduate rail; the selected-field detail; rankings in a fold.

- Add `FieldSection`; extend `FieldEducationScatter` with guides and rail
- Remove `FieldEducationComparison` and the ranking donuts
MSG
```

---

### Task 8: Register

**Files:**
- Modify: `src/components/RecordList.tsx` (date grouping when sorted by date, load-more instead of page buttons, natural title line)
- Create: `src/components/Register.tsx`, `src/components/Register.test.tsx`
- Delete: `src/components/Explorer.tsx`, `src/components/Explorer.test.tsx` (surviving cases move to `Register.test.tsx`)
- Modify: `src/App.tsx` (import `Register` in place of `Explorer`)
- Modify: `src/styles/components.css` (delete `.section--records`, `.records-principles`, `.explorer-*`, `.record-pagination`; add `.register`; compact `.record-table`)

**Interfaces:**
- `RecordList` props unchanged. New behaviour: when `sort.key === 'appointedOn'`, insert a `<tr className="record-table__group">` before each new date with `formatDate(date) · N vymenovaní · president`; render `PAGE_SIZE = 30` rows, then a `<button>Zobraziť ďalších N záznamov</button>` that grows the visible count by 30; reset to 30 whenever `records` changes.
- Name cell renders `titlesBefore <strong>name</strong>, titlesAfter`.
- Produces `Register({ data, atlasState })` rendering `<section id="register" className="register" aria-labelledby="register-title">`; keeps the CSV export and error handling from `Explorer.tsx` verbatim; keeps `role="status"` count text `N vymenovaní vo výbere` (App tests read it).

- [ ] **Step 1: Write the failing Register test**

```tsx
// src/components/Register.test.tsx
import '@testing-library/jest-dom/vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { AtlasState } from '../state/useAtlasState'
import { affiliation, appointment, city, institution, president } from '../test/atlasFixture'
import Register from './Register'

const records = Array.from({ length: 35 }, (_, index) =>
  appointment({
    appointedOn: index < 20 ? '2026-06-03' : '2026-03-31',
    name: `Osoba ${String(index).padStart(2, '0')}`,
    presidentId: 'pellegrini',
  }),
)
const data = {
  records,
  institutions: [institution()],
  affiliations: [affiliation()],
  cities: [city()],
  presidents: [president({ id: 'pellegrini', name: 'Peter Pellegrini', from: '2024-06-15', to: null })],
  meta: {
    schemaVersion: 1, sourceRowCount: 35, duplicateSourceRowCount: 0, analyticalAppointmentCount: 35,
    ceremonyCount: 2, appointmentDateMin: '2026-03-31', appointmentDateMax: '2026-06-03',
  },
  sources: { professors: { url: 'https://example.test/p', sha256: '', retrievedOn: '' } },
}

function atlasState(): AtlasState {
  const defaults = {
    startYear: 2000, endYear: 2026, fieldStartYear: 2009, fieldEndYear: 2025,
    presidentId: null, city: null, institutionId: null, faculty: null, field: null,
    appointedOn: null, query: '', selectedYear: 2025,
  }
  return {
    filters: defaults,
    defaults,
    filteredRecords: records,
    options: {
      defaults,
      presidentIds: ['pellegrini'],
      cities: ['Bratislava'],
      institutionIds: ['uniba'],
      faculties: ['Prírodovedecká fakulta'],
      fieldKeys: ['fyzika'],
      fields: [{ key: 'fyzika', canonicalLabel: 'fyzika' }],
      appointmentDates: ['2026-03-31', '2026-06-03'],
    },
    setFilter: vi.fn(), setExclusiveFilter: vi.fn(), setDateRange: vi.fn(), setFieldEducationRange: vi.fn(),
    setSelectedYear: vi.fn(), setTimelineYear: vi.fn(), setAppointmentDate: vi.fn(), setQuery: vi.fn(), resetFilters: vi.fn(),
  }
}

describe('Register', () => {
  it('groups rows by ceremony date and loads thirty at a time', () => {
    render(<Register data={data as never} atlasState={atlasState()} />)
    const section = screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' })
    expect(within(section).getByRole('status')).toHaveTextContent('35 vymenovaní vo výbere')
    const groups = within(section).getAllByRole('row', { name: /vymenovaní · Peter Pellegrini/ })
    expect(groups[0]).toHaveTextContent('3. júna 2026')
    expect(within(section).getAllByText(/^Osoba \d\d$/)).toHaveLength(30)
    fireEvent.click(within(section).getByRole('button', { name: 'Zobraziť ďalších 5 záznamov' }))
    expect(within(section).getAllByText(/^Osoba \d\d$/)).toHaveLength(35)
  })

  it('keeps the secondary filters and the timeline in closed folds', () => {
    render(<Register data={data as never} atlasState={atlasState()} />)
    expect(screen.getByText('Viac filtrov').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByText('Časová os slávností').closest('details')).not.toHaveAttribute('open')
    expect(screen.getByRole('combobox', { name: 'Fakulta' })).toBeInTheDocument()
  })

  it('writes the query through setQuery on every keystroke', () => {
    const state = atlasState()
    render(<Register data={data as never} atlasState={state} />)
    fireEvent.change(screen.getByRole('searchbox', { name: 'Hľadať v záznamoch' }), {
      target: { value: 'Osoba 0' },
    })
    expect(state.setQuery).toHaveBeenCalledWith('Osoba 0')
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest --run src/components/Register.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Update RecordList**

In `src/components/RecordList.tsx`:
- `const PAGE_SIZE = 30`; replace the `page` state with `const [visible, setVisible] = useState(PAGE_SIZE)` and `useEffect(() => setVisible(PAGE_SIZE), [records])`; `const pageRecords = sortedRecords.slice(0, visible)`.
- Replace the `<nav className="record-pagination">` with:

```tsx
{sortedRecords.length > visible && (
  <button
    type="button"
    className="record-list__more"
    onClick={() => setVisible((count) => count + PAGE_SIZE)}
  >
    Zobraziť ďalších {formatNumber(Math.min(PAGE_SIZE, sortedRecords.length - visible))} záznamov
  </button>
)}
```

- Add `const countByDate = useMemo(() => { const m = new Map<string, number>(); for (const r of records) m.set(r.appointedOn, (m.get(r.appointedOn) ?? 0) + 1); return m }, [records])`. When `sort.key === 'appointedOn'`, while mapping `pageRecords`, emit a group row before the first record of each date:

```tsx
<tr
  className="record-table__group"
  aria-label={`${formatDate(record.appointedOn)} · ${formatNumber(countByDate.get(record.appointedOn) ?? 0)} vymenovaní · ${presidentById.get(record.presidentId)?.name ?? 'neuvedené'}`}
>
  <td colSpan={SORT_COLUMNS.length + 1}>
    {formatDate(record.appointedOn)}
    <span>
      {formatNumber(countByDate.get(record.appointedOn) ?? 0)} vymenovaní ·{' '}
      {presidentById.get(record.presidentId)?.name ?? 'neuvedené'}
    </span>
  </td>
</tr>
```

  Hide the Dátum and Prezident columns (`hidden` on the `<th>` and `<td>`) while grouped.
- Name cell: `<span>{record.titlesBefore ?? ''} <strong>{record.name}</strong>{record.titlesAfter ? `, ${record.titlesAfter}` : ''}</span>`.

- [ ] **Step 4: Implement Register**

Copy `LoadedExplorer` and `ExplorerShell` from `Explorer.tsx` into `Register.tsx` as `LoadedRegister` and `RegisterShell`, keep the CSV logic, chips array and announced count unchanged, and replace only the JSX shell:

```tsx
<section id="register" className="register" aria-labelledby="register-title">
  <div className="register__head">
    <div>
      <p className="card__kicker">Úplný register</p>
      <h2 id="register-title">Úplný register profesorských vymenovaní</h2>
    </div>
    <div className="register__filters">
      <input
        type="search"
        aria-label="Hľadať v záznamoch"
        placeholder="Meno, pracovisko, fakulta alebo odbor"
        value={filters.query}
        onChange={(event) => setQuery(event.currentTarget.value)}
      />
      {/* the three <select> controls for Prezident, Mesto, Kanonická inštitúcia, copied from Explorer */}
    </div>
  </div>
  <details className="fold register__more-filters">
    <summary>Viac filtrov</summary>
    <div className="register__filters register__filters--secondary">
      {/* Fakulta, Odbor, Od roku, Do roku selects copied from Explorer */}
      <button type="button" disabled={!hasActiveState} onClick={() => resetFilters('push')}>
        Vynulovať všetky filtre
      </button>
      <button type="button" className="register__export" onClick={downloadFilteredCsv}>
        Stiahnuť filtrované CSV
      </button>
    </div>
  </details>
  <div className="register__state">
    <p role="status" aria-live="polite">
      <strong>{formatAppointmentCount(announcedCount)}</strong> vo výbere
    </p>
    {activeChips.length > 0 && (
      <ul aria-label="Aktívne filtre">{/* chip buttons copied from Explorer */}</ul>
    )}
    {exportError && (
      <p className="register__error" role="alert">
        {exportError}
      </p>
    )}
  </div>
  <RecordList records={filteredRecords} institutions={data.institutions} presidents={data.presidents} />
  <details className="fold">
    <summary>Časová os slávností</summary>
    <AppointmentTimeline
      records={filteredRecords}
      coverageEnd={data.meta.appointmentDateMax}
      presidents={data.presidents}
      selectedPresidentId={filters.presidentId}
      selectedStartYear={filters.startYear}
      selectedEndYear={filters.endYear}
      onToggleYear={(year) =>
        setTimelineYear(filters.startYear === year && filters.endYear === year ? null : year, 'push')
      }
    />
  </details>
</section>
```

Export `default function Register(props)` with the same discriminated `LoadedRegisterProps | StatusRegisterProps` union `Explorer` had, so `App.tsx` can render `<Register status="loading" />`.

- [ ] **Step 5: Move the surviving Explorer tests**

From `Explorer.test.tsx` carry into `Register.test.tsx`, adjusting only region and control names: search/diacritics (line 279), each shared dimension filter (303), source detail and variants (395), CSV success and error cases (423–535). Delete the pagination test (340) and the mobile sort toolbar test (366) if that toolbar is removed with pagination; keep it if the toolbar stays. Then `git rm src/components/Explorer.tsx src/components/Explorer.test.tsx` and update `App.tsx` to import `Register`.

- [ ] **Step 6: CSS**

Delete `.section--records`, `.records-principles`, `.explorer-controls`, `.explorer-export-error`, `.explorer-active-state`, `.record-pagination`. Add:

```css
.register { max-width: var(--content-width); margin: var(--sp-4) auto 0; border: var(--rule); background: var(--color-paper-light); }
.register__head { display: grid; grid-template-columns: auto 1fr; gap: var(--sp-3) var(--sp-6); align-items: end; padding: var(--sp-4); border-bottom: var(--rule); }
.register__head h2 { margin: 0; font-family: var(--font-display); font-weight: 500; font-size: var(--t-2); }
.register__filters { display: grid; grid-template-columns: minmax(0, 2fr) repeat(3, minmax(0, 1fr)); gap: var(--sp-2); }
.register__filters--secondary { grid-template-columns: repeat(4, minmax(0, 1fr)) auto auto; align-items: end; }
.register__filters input, .register__filters select { font: inherit; font-size: var(--t-body); padding: var(--sp-2) var(--sp-3); border: var(--rule); background: var(--color-paper); width: 100%; }
.register__filters button { font: inherit; font-size: var(--t-small); font-weight: 600; padding: var(--sp-2) var(--sp-3); border: 1px solid var(--color-ink); background: var(--color-paper); cursor: pointer; }
.register__export { background: var(--color-ink); color: var(--color-paper); }
.register__more-filters { border-left: 0; border-right: 0; }
.register__state { display: flex; gap: var(--sp-3); align-items: center; flex-wrap: wrap; padding: var(--sp-2) var(--sp-4); border-bottom: var(--rule); font-size: var(--t-small); color: var(--color-ink-muted); min-height: 2.4rem; }
.register__state p { margin: 0; }
.register__state ul { display: flex; gap: var(--sp-2); flex-wrap: wrap; margin: 0; padding: 0; list-style: none; }
.register__state li button { display: inline-flex; gap: var(--sp-2); align-items: center; border: 1px solid var(--color-ink); border-radius: 999px; padding: 2px 10px; background: var(--color-paper); font-size: var(--t-small); cursor: pointer; }
.register__error { color: var(--color-error); }
.record-table-wrap { max-height: 400px; overflow: auto; }
.record-table th { position: sticky; top: 0; background: var(--color-paper-light); font-size: var(--t-label); letter-spacing: 0.1em; text-transform: uppercase; color: var(--color-ink-muted); padding: var(--sp-2) var(--sp-4); }
.record-table td { padding: var(--sp-2) var(--sp-4); border-bottom: 1px solid var(--color-paper-deep); vertical-align: top; font-size: var(--t-body); }
.record-table__group td { background: var(--color-paper); font-family: var(--font-display); font-size: var(--t-3); padding-top: var(--sp-3); border-bottom: var(--rule); }
.record-table__group td span { font-family: var(--font-interface); font-size: var(--t-small); color: var(--color-ink-muted); margin-left: var(--sp-3); }
.record-list__more { display: block; width: 100%; border: 0; border-top: var(--rule); background: var(--color-paper); padding: var(--sp-3); font-weight: 600; cursor: pointer; }
@media (max-width: 900px) { .register__head, .register__filters, .register__filters--secondary { grid-template-columns: 1fr 1fr; } }
@media (max-width: 700px) {
  .record-table-wrap { max-height: none; }
  .record-table, .record-table thead, .record-table tbody, .record-table tr, .record-table td, .record-table th { display: block; }
  .record-table thead { display: none; }
  .record-table tr { display: grid; grid-template-columns: 1fr auto; gap: 0 var(--sp-3); padding: var(--sp-2) var(--sp-4); border-bottom: 1px solid var(--color-paper-deep); }
  .record-table td { padding: 0; border: 0; }
  .record-table td:nth-child(2), .record-table td:nth-child(3) { grid-column: 1 / -1; font-size: var(--t-small); }
  .record-table__group { grid-template-columns: 1fr; }
}
```

- [ ] **Step 7: Run tests, commit**

Run: `npx vitest --run && npx tsc -b`
Expected: PASS.

```bash
git add -A src/components src/styles src/App.tsx src/App.test.tsx
git commit -F - <<'MSG'
feat: turn the explorer into a paginated register

The explorer opened with a principles list and a nine-control panel, then
paged 25 rows with prev/next buttons. This commit renames it Register,
puts search and the three main facets on one row, moves the rest into a
"Viac filtrov" fold, groups rows by ceremony date, loads 30 rows at a
time, and folds the timeline under the table.

- Add `Register`; remove `Explorer`
- `RecordList`: date group rows, load-more, natural title order
MSG
```

---

### Task 9: App assembly and cleanup

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`
- Delete: `src/components/Findings.tsx`, `src/components/Findings.test.tsx`, `src/components/AnalysisLenses.tsx`, `src/components/AtlasSection.tsx`, `src/components/AtlasSection.test.tsx`
- Modify: `src/styles/components.css` (delete `.section--findings`…`.finding*`, `.section--context`, `.context-selection`, `.context-snapshot` heading rules, `.atlas-*`, `.analysis-*`; rewrite `.site-footer`; compact `.section--method`)

- [ ] **Step 1: Rewrite `LoadedInteractiveSections` in `App.tsx`**

```tsx
function LoadedInteractiveSections({ data }: { data: AtlasData }) {
  const atlasState = useAtlasState(data)
  const selectField = (fieldKey: string) => {
    atlasState.setFilter('field', fieldKey, 'push')
    focusSection('odbory')
  }

  return (
    <>
      <MapStage data={data} atlasState={atlasState} />
      <FindingCards data={data} onFieldSelect={selectField} />
      <ContextStrip
        years={data.context}
        selectedYear={atlasState.filters.selectedYear}
        setSelectedYear={atlasState.setSelectedYear}
      />
      <FieldSection
        data={data}
        selectedField={atlasState.filters.field}
        onFieldSelect={(fieldKey) => atlasState.setFilter('field', fieldKey, 'push')}
        fieldRange={{
          startYear: atlasState.filters.fieldStartYear,
          endYear: atlasState.filters.fieldEndYear,
        }}
        onFieldRangeChange={(startYear, endYear) =>
          atlasState.setFieldEducationRange(startYear, endYear, 'push')
        }
      />
      <Register data={data} atlasState={atlasState} />
    </>
  )
}
```

Loading and error branches: keep the `section--status` block with the same copy but `id="mapa"`, then `<Register status={…} />` and `<Methodology status={…} />`. The footer becomes:

```tsx
<footer className="site-footer">
  <span>
    Zdroj vymenovaní: MŠVVaM SR · Kontext: CVTI SR 2000–2025 · Obyvateľstvo: ŠÚ SR · Obrys:
    Natural Earth
  </span>
  <a href="#hore">Na začiatok</a>
</footer>
```

- [ ] **Step 2: Rewrite the App landmark test**

Replace the body of „loads from the project Pages base and renders the Slovak story landmarks in order“ after the fetch stub with:

```tsx
render(<App />)
expect(
  screen.getByRole('heading', { level: 1, name: /Kde vzniká slovenská profesúra\?/ }),
).toBeVisible()
const ledger = await screen.findByLabelText('Rozsah analytického súboru')
expect(within(ledger).getByText(/2[\s ]378/)).toBeVisible()
const main = screen.getByRole('main')
expect(Array.from(main.children).map((section) => section.id)).toEqual([
  'mapa',
  'zistenia',
  'kontext',
  'odbory',
  'register',
  'metodika',
])
expect(screen.getByRole('group', { name: 'Obdobie' })).toBeVisible()
expect(screen.getByRole('region', { name: 'Tri zistenia' })).toBeVisible()
expect(
  screen.getByRole('region', { name: 'Úplný register profesorských vymenovaní' }),
).toBeVisible()
expect(screen.getByRole('link', { name: 'Zdrojový zoznam ministerstva' })).toHaveAttribute(
  'href',
  MINISTRY_SOURCE_URL,
)
expect(fetchMock).toHaveBeenCalledTimes(1)
expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
  'https://example.test/slovak-professors/data/atlas.json',
)
```

Update the other App tests:
- „keeps national appointment values…“: before querying the group, open the fold with `fireEvent.click(await screen.findByText('Národný kontext v detaile'))`.
- Delete the two „opens a finding …“ tests (the finding buttons no longer exist). Add one test that clicks the period button `2000–2004`, asserts `window.location.search` equals `?startYear=2000&endYear=2004`, and that the register status count equals the number of fixture records in that range.
- Ensure `validAtlas.records` in `App.test.tsx` contains at least one record with a resolved affiliation so the strip has a cell; if it has none, add one following the shape used by the `atlasWithActiveLocalFilters` fixture.

- [ ] **Step 3: Delete dead components and CSS; run everything**

```bash
git rm src/components/Findings.tsx src/components/Findings.test.tsx src/components/AnalysisLenses.tsx src/components/AtlasSection.tsx src/components/AtlasSection.test.tsx
```

In `components.css` delete the blocks listed in this task's Files. Compact `.section--method`: two-column grid at 900 px and above, `padding: var(--sp-5) var(--page-gutter)`, headings `var(--t-2)`, body `var(--t-small)`. `.site-footer`: `display: flex; justify-content: space-between; gap: var(--sp-4); max-width: var(--content-width); margin: 0 auto; padding: var(--sp-4) var(--page-gutter) var(--sp-6); font-size: var(--t-small); color: var(--color-ink-muted); border-top: var(--rule);`.

Run: `npx vitest --run && npx tsc -b && npm run build`
Expected: all PASS; `dist/` builds.

Find orphan selectors and delete what it prints:

```bash
for c in $(grep -o '^\.[a-zA-Z0-9_-]*' src/styles/components.css | sort -u); do
  grep -rq -- "${c#.}" src --include='*.tsx' || echo "unused $c"
done
```

- [ ] **Step 4: Commit**

```bash
git add -A src
git commit -F - <<'MSG'
feat: assemble the compact atlas page

Previously the page was six equal sections opening with eyebrow, headline
and deck before any data. This commit assembles the approved direction A:
masthead, annotated map stage, three finding cards, context strip, field
comparison, register and methodology, and deletes the components and CSS
the new sections replaced.

- App renders MapStage, FindingCards, ContextStrip, FieldSection, Register
- Remove Findings, AnalysisLenses, AtlasSection and their CSS
- Rewrite App landmark tests for the new section order
MSG
```

---

### Task 10: Visual verification

**Files:**
- Create: `scripts/screenshot.mjs` (dev-only, not shipped)

- [ ] **Step 1: Write the screenshot script**

```js
// scripts/screenshot.mjs
// Usage: npx vite preview --port 4173 & NODE_PATH=<dir containing playwright-core> node scripts/screenshot.mjs
// playwright-core is not a project dependency; point NODE_PATH at a sibling
// project's node_modules that has it and a downloaded Chromium.
import { createRequire } from 'node:module'

const require = createRequire(`${process.env.NODE_PATH ?? process.cwd()}/`)
const { chromium } = require('playwright-core')

const browser = await chromium.launch()
for (const [name, viewport] of [
  ['desktop', { width: 1440, height: 900 }],
  ['phone', { width: 390, height: 844 }],
]) {
  const page = await browser.newPage({ viewport })
  await page.goto('http://localhost:4173/', { waitUntil: 'networkidle' })
  await page.waitForSelector('#mapa circle')
  const height = await page.evaluate(() => document.documentElement.scrollHeight)
  const width = await page.evaluate(() => document.documentElement.scrollWidth)
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
  console.log(name, { height, width })
  if (name === 'desktop' && height > 3000) process.exitCode = 1
  if (name === 'phone' && (height > 6000 || width > 390)) process.exitCode = 1
  await page.close()
}
await browser.close()
```

Add `screenshots/` to `.gitignore`.

- [ ] **Step 2: Build, preview, screenshot**

```bash
npm run build && (npx vite preview --port 4173 > /dev/null 2>&1 &) && sleep 2 && mkdir -p screenshots && NODE_PATH=/Users/mrshu/work/dev/mrshu/talks-slidev/node_modules node scripts/screenshot.mjs
```

Expected: both budgets pass. Open `screenshots/desktop.png` and compare with the approved mockup (https://claude.ai/code/artifact/f5425126-b723-481a-9f67-6a81a40f8d20): masthead on one row, map with labels and key, seven-cell strip, three cards aligned, context strip, field section, register with grouped rows, compact methodology.

- [ ] **Step 3: Fix anything visibly off (label collisions, clipped text, overflow) in the component it belongs to; rerun tests; commit**

```bash
git add .gitignore scripts/screenshot.mjs src
git commit -F - <<'MSG'
chore: add page budget screenshot check

The redesign's acceptance criteria are page-height budgets and a
first-screen map. This commit adds a dev-only Playwright script that
screenshots the preview build at desktop and phone widths and fails when
the budgets are exceeded.

- Add `scripts/screenshot.mjs` (not part of the shipped build)
MSG
```

- [ ] **Step 4: Open a pull request** from `redesign/compact-atlas` to `main` with the spec link, the two screenshots, and the before/after heights (48 491 → measured; 64 287 → measured).

---

## Self-review

- **Spec coverage.** Masthead (T1); map stage with period switch, labels, key, strip, hover, institution fold (T3); three cards (T5); context row with fold (T6); field section with search, toggle, range, guides, rail, detail, rankings fold, donuts removed (T7); register with one control row, fold, chips, date groups, load-more, CSV, timeline fold (T8); methodology compact and footer (T9); scroll margins (T1); height budgets (T10). Every removed item is deleted in T1, T7, T8 or T9.
- **Types.** `CityStripCell` (T3) is consumed by `MapStage` (T3). `TitleShareYear`, `MonthTotal`, `FieldShareRow` (T4) are consumed by the charts (T5). `ScaleMode` from `fieldEducationGeometry` is reused in T7. `zeroRail` is typed as `FieldEducationLandscapeRow[]` and receives `FieldEducationPoint[]`, which extends it (T7). `Register` keeps `Explorer`'s discriminated props (T8, T9).
- **Names.** Section ids `hore`, `mapa`, `zistenia`, `kontext`, `odbory`, `register`, `metodika` are identical in the T1 nav, the T3–T9 components, and the T9 App test. Region names in tests match `aria-labelledby` headings: „Prítok a stav profesúry“, „Profesorské vymenovania a absolventi v rovnakom odbore“, „Úplný register profesorských vymenovaní“; `aria-label="Tri zistenia"`.
