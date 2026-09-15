# Nastavljamo

**Pročitaj samo ovu stranicu.** Ne otvaraj STATE.md, POPIS.md ni FLOW.md dok ti
ne zatreba — svaka je velika i plaća se tokenima. Kad zatreba, reci koja i zašto.

---

## 1 · Gdje smo stali

Pet faza od jedanaest je **urađeno i izmjereno**. Red i mjere su u
`docs/GRADNJA.md`; specifikacija je `docs/FLOW.md`.

| | faza | dokaz |
|---|---|---|
| **0** | primitivi i ljuska | dokument se ne skrola (800 = 800 na 9 ruta) · `text-[..px]` 0 (bilo 1273) · goli `<button>` 0 (bilo 197) · `focus-visible` svuda |
| **1** | obavijesti | zapis koji sjedne zvoni, čitanje i odbijen zapis ne · obavijest iskoči sama · red 14 → 15 bez dodira preglednika |
| **2** | verzija + ključ zahtjeva | dvoje na istom uslovu: drugi dobije 409 i vidi prvog, nijedna riječ se ne gubi · isti ključ dvaput → jedan zapis |
| **3** | §11 ponašanje | `?step=` u adresi · nacrt po stanici · tipke `1` `2` `3` `←` `→` · brojač glasova živ |
| **4** | polica alata i kratice | polica na svakom ekranu, jedan klik · `Ctrl+K` · `?` · `/` |

**Ostaje, po redu:** 5 prozor i „šta slijedi" na svih 74 čina *(danas ~8 —
najveći komad)* · 6 pet stanja svakog ekrana · 7 automatizam izdavanja ·
8 rupe · 9 sedam odluka vlasnika · 10 KLJUČ i BANKA.

---

## 2 · Zakon nad zakonima, i dva pravila koja su se već isplatila

> **Ako se krene rješavati nešto, rješavaju se i posljedice toga.** Gumb koji
> dobije prozor mora dobiti i „šta slijedi", i mjesto u matrici, i pet stanja,
> i tipku. Inače se ne dira. **Nema „ostaje iz ove faze".**

**Pokreni, ne samo testiraj.** Zeleni testovi su dosad sakrili: zvono koje ne
zvoni, Express koji gazi `ETag`, prozor sudara koji ne pokazuje šta je stiglo,
i tipke oglašene a nenapisane. Nijednu od njih nije našao test.

**Mjeri, ne procjenjuj.** Svaki brojač u ovim dokumentima bio je bar jednom
pogrešan. Broji iz izvora, i zapiši naredbu kojom si brojao.

---

## 3 · Tri greške koje se ponavljaju — pazi na njih

| | |
|---|---|
| **Hook ispod ranog `return`** | Dogodilo se dvaput: `StructureDetail`, pa `MatterFlow`. Cijeli ekran nestane u prazan `<div/>`. Vezanje ide **iznad** svakog izlaza |
| **Proza kroz `node -e`** | Navodnici i šabloni se tiho pojedu. Koristi `Edit` ili `.mjs` fajl |
| **Slijepa zamjena imena** | Regex koji mijenja identifikator piše i po komentarima, i zna zabiti kod unutar funkcije. Zamijeni značenje, ne ime |

---

## 4 · Kako se ovo pokreće i provjerava

```bash
cd apps/majlis/server && npx vitest run    # 1758
cd apps/majlis/client && npx vitest run    # 362
cd apps/majlis/client && npm run tokens    # dvije palete se moraju slagati
```

**Provjera u pregledniku** traži server sa članovima i proxy koji nosi
vjerodajnicu — preglednik ne može odgovoriti na basic-auth dijalog:

```bash
cd apps/majlis/server && npx tsx scripts/members.ts   # baciv odbor
# MAJLIS_MEMBERS=<blok> PORT=4102 MAJLIS_STORE=memory npx tsx src/index.ts
# client: vite.probe.mjs sa proxyjem koji dodaje authorization → port 5175
```

**Port 4102, nikad 4000** — 4000 je vlasnikova instanca. `vite.config.ts` čita
`MAJLIS_API`, podrazumijevano ostaje 4000. **Probni fajl i vjerodajnice se
brišu poslije provjere** i nikad ne ulaze u repo.

---

## 5 · Pravila koja su vlasnikova

- **Commit je `AbZe628 <abdusamedzelic98@gmail.com>`**, bez ijednog traga alata
- **Pitaj prije svakog guranja na GitHub** — svaki put, bez izuzetka
- Nikad ne diraj vlasnikove ključeve; bacive vjerodajnice žive **izvan repoa**
- Boje kojih nema u paleti **ne izmišljaj** — idu vlasniku na odluku
  *(osam čeka: `#F7F0E2` ×3, `#A67A28`, `#133A5F`, `#F2DFB5`, `#FBF1DF`,
  `#235A49`, `#FCF6EA`, `#FCF6EC`)*

---

## 6 · Šta čeka tvoju odluku

Sedam pitanja iz `FLOW.md` §9 — nijedno se ne rješava kodom: izuzeće člana ·
ratifikacija zabrane *(zabrana danas nikad ne istekne)* · ko prijavljuje
prekršaj · nalaz dok je glasanje otvoreno · promjena glasa · glasanje bez
rasprave · **kvorum** *(rute nema, a kod se štiti od promjene koja ne postoji)*.

---

## 7 · Zadnji commit

`f2b25de` — *Faza 3: stanica u adresi, otkucano preživi, i tipke koje sam
oglasio sada rade*. Lokalno, **nije gurnuto.**
