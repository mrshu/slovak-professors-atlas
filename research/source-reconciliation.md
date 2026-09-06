# Appointment-source reconciliation

## 24 January 2011

The [official presidential release](https://archiv.prezident.sk/ivan-gasparovic/indexff90.html?news_id=12893&rok-2011=) states that 111 university professors were appointed and enumerates exactly 111 person/field pairs. The atlas contains 108 events for that date. The pinned `professors.xls` source also contains exactly 108 rows dated 24 January 2011, so the atlas reproduces its source rather than losing rows during extraction.

Row-level comparison finds:

| Official release | Official field | Atlas/workbook result | Classification |
|---|---|---|---|
| Mikuláš Hrubiško | vnútorné choroby | No person or row anywhere in atlas/workbook | Source omission |
| Vladimír Plecitý | ochrana osôb a majetku | No person or row anywhere in atlas/workbook | Source omission |
| Marian Vidiščák | chirurgia | No person or row anywhere in atlas/workbook | Source omission |
| Grzegorz A. Kleparski | neslovanské jazyky a literatúry | Present as `Gregorz A. Kleparski`, source row 1206, atlas event `1f8896327273` | Source spelling variant, not missing |
| Eva Žiaková | sociálna práca | Present, source row 1182 and atlas event `e77c5b3c956b`, but workbook/atlas field is `odborová didaktika- teória vzdelávania náboženskej výchovy` | Field disagreement |

After title and diacritic normalization, 107 of the 111 official names match atlas names. The official and atlas lists contain no duplicate normalized identities. The four unmatched official spellings consist of the three absent people plus `Grzegorz`/`Gregorz` Kleparski; the latter resolves to an existing event. `data/config/duplicate-resolutions.json` contains no resolution for this date.

Other raw orthographic variants—official `GaŹová` versus atlas `Gažová`, `MŰHLPACHR` versus `Mühlpachr`, and `ŻMICHROWSKA` versus `Źmichrowska`—do not alter identity or count.

## Conclusion

The three-event difference is supported as three omissions from the pinned appointment workbook, not an atlas parser loss or an inconsistent official headline. Eva Žiaková remains a semantic source disagreement and should not be silently changed without an authoritative correction to the Ministry source.

Consequences:

- report the 2011 atlas peak as **154 source-backed atlas events**, not a complete official count;
- report the 24 January ceremony as **108 atlas/workbook events versus 111 official appointments**;
- do not add three events to production data from this reconciliation alone; the existing pipeline requires a provenance-backed source update and reviewed field/institution values;
- preserve the Kleparski spelling and Žiaková field disagreements in any future source-variant audit.
