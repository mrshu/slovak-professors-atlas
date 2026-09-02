# Compact Atlas Redesign — Design Specification

## Status

Approved direction **A · Anotovaná mapa**, chosen on 2 September 2026 from three
rendered alternatives. This spec supersedes the page model in
`2026-08-29-slovak-professors-atlas-design.md` (hero, findings tiles, context,
field comparison, linked atlas, explorer, methodology as six equal sections).
Everything in the earlier spec about sources, provenance, data contracts,
editorial rules, the pipeline, and the visual system remains in force unless
this document says otherwise.

## Problem

The shipped page is 48 491 px tall on desktop and 64 287 px on a phone. The
first drawing appears after about 3 200 px; the first drawing of change after
4 100 px. One section, the field rankings, is 31 311 px because it renders all
416 fields as full rows. Six sections each open with an eyebrow, a headline, a
deck, and a definitions row before any data. The hero promises a map that
changed since 2000, but every view shows totals of the active filter.

## Goal

The same data, identity, and editorial rules in a page that answers the title
question on the first screen and stays under 3 000 px on desktop and 6 000 px
on a phone. Tools get a fixed height and scroll inside themselves; reading is
short and drawings carry it. One headline per component, never a stack of
eyebrow, title and deck.

## Page model

Five blocks in one column of 76 rem, in this order, each an anchored section:

1. **Masthead** (`#hore`) — one row: the question „Kde vzniká slovenská
   profesúra?“ with the italic register „Archívny atlas 2000–2026“, the four
   ledger figures (analytické vymenovania, slávnostné termíny, škôl, miest), and
   the anchor navigation Mapa · Zistenia · Odbory · Register · Metodika.
2. **Mapa pracovísk** (`#mapa`) — the forest stage. A period switch
   (2000–2004, 2005–2009, 2010–2014, 2015–2019, 2020–2024, Celé obdobie) drives
   the shared `startYear`/`endYear` filters. Full-width map with proportional
   circles, every city with at least 10 appointments in the active selection
   labelled in place, and a three-step size key (10 / 50 / 200). Under the map a
   seven-cell strip: the top seven cities of the active selection with share,
   change in percentage points against 2000–2004, and a five-period sparkline of
   that city's share. Clicking a circle or a cell toggles the shared `city`
   filter. Hovering either highlights both. A collapsed fold „Inštitúcie v
   aktívnom výbere“ holds the existing institution ranking.
3. **Zistenia** (`#zistenia`) — three equal cards, each: kicker, one-sentence
   headline, one line of context with inline swatches, one chart, one link.
   Card 1 „PhD. predbehol CSc. v roku 2008“: share of PhD., CSc., DrSc. among
   yearly appointments, annotated crossover. Card 2 „Každé piate vymenovanie je
   novembrové“: appointments by month, November emphasised, ceremony counts in
   tooltips. Card 3 „Sociálna práca: 19 % absolventov, 3 % profesorov“: dumbbell
   of each field's share of graduates and of appointments for eight named
   fields; dots select the field in the Odbory section. Below the cards a
   compact **Kontext** row: two single-series small charts (vymenovania na 100
   interných profesorov; interní profesori) and a collapsed fold „Národný
   kontext v detaile“ holding the existing context section body.
4. **Odbory × absolventi** (`#odbory`) — header with title, one-sentence
   reading note, field search (datalist over all rows), scale toggle, and the
   existing range selects. Left: the scatter of all matched fields with three
   dashed ratio guides (10, 100, 1 000 absolventov na vymenovanie), hover
   preview, click selection, and a zero rail under the axis for matched fields
   with zero graduates in the range. Right: the existing selected-field detail.
   A collapsed fold „Rebríček odborov“ holds the existing rankings list.
   The two share donuts are removed.
5. **Register** (`#register`) — header with title and count; one control row:
   search, prezident, mesto, inštitúcia; a fold „Viac filtrov“ with fakulta,
   odbor, od roku, do roku; the active-filter chips; the record table grouped
   by ceremony date with a group header row (date · count · president); 30 rows
   per load with „Zobraziť ďalších 30“; CSV export; a fold „Časová os
   slávností“ holding the existing timeline.
6. **Metodika** (`#metodika`) — the existing methodology component, restyled as
   a compact two-column block, followed by a one-line footer.

## Removed

Hero, anchor-nav bar, Findings tiles, AnalysisLenses, presidential era
profiles, the field share donuts, the definitions rows, the section decks, the
„Vybraný rok“ block, the records-principles list, and the contour artwork.
Nothing analytical is removed: rankings, timeline, context detail, source
variants, CSV, and the methodology audit all remain, behind folds where they are
tools rather than reading.

## Shared behaviour

- One shared filter state (`useAtlasState`) drives map, strip, register, and
  chips exactly as today. Period buttons call `setDateRange`. City clicks call
  `setFilter('city', …)`. Field selection uses the existing `field` filter.
- Findings and the strip sparklines are derived from all records, never from
  the active selection, so they stay stable while filtering. The strip's shares
  for the active period use the active selection.
- URL state is unchanged; no new parameters.
- Every anchored section has `scroll-margin-top` so the masthead never covers a
  heading after an anchor jump.

## Visual system

Tokens, fonts, and palette stay. Additions to `tokens.css`: a spacing scale
`--sp-1` … `--sp-7` = 4, 8, 12, 16, 24, 32, 48 px and a compact type scale
`--t-1` 1.6 rem, `--t-2` 1.3 rem, `--t-3` 1.05 rem, body 0.875 rem, small
0.8 rem, label 0.7 rem. Chart series colours are re-stepped so three lines pass
colour-vision separation on paper and forest: `--series-1` #b0452c,
`--series-2` #0a8aa6, `--series-3` #a0721a; dash patterns stay as the second
encoding. Links are ink with a 1 px underline; terracotta is reserved for data
marks and the selected state. Charts label text in ink or muted ink, never in
the series colour.

## Acceptance

- `npm run build` passes; `npm test -- --run` passes.
- Desktop (1440 px) page height under 3 000 px with all folds closed; phone
  (390 px) under 6 000 px; no horizontal scroll at 390 px.
- The first screen at 1440 × 900 shows the masthead and the map with circles.
- Keyboard: period buttons, city cells, scatter targets, folds, and load-more
  are reachable and operable; `aria-pressed` reflects selection.
- All visible copy remains Slovak.
