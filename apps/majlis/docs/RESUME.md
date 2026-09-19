# Nastavljamo

**Pročitaj samo ovu stranicu.** Ne otvaraj STATE.md, POPIS.md ni FLOW.md dok ti
ne zatreba — svaka je velika i plaća se tokenima. Kad zatreba, reci koja i zašto.

---

## 1 · Gdje smo stali

Pet faza od trinaest je **urađeno i izmjereno**, a šesta je pri kraju. Red i
mjere su u `docs/GRADNJA.md`; specifikacija je `docs/FLOW.md`.

| | faza | dokaz |
|---|---|---|
| **0** | primitivi i ljuska | dokument se ne skrola (800 = 800 na 9 ruta) · `text-[..px]` 0 (bilo 1273) · goli `<button>` 0 (bilo 197) · `focus-visible` svuda |
| **1** | obavijesti | zapis koji sjedne zvoni, čitanje i odbijen zapis ne · obavijest iskoči sama · red 14 → 15 bez dodira preglednika |
| **2** | verzija + ključ zahtjeva | dvoje na istom uslovu: drugi dobije 409 i vidi prvog, nijedna riječ se ne gubi · isti ključ dvaput → jedan zapis |
| **3** | §11 ponašanje | `?step=` u adresi · nacrt po stanici · tipke `1` `2` `3` `←` `→` · brojač glasova živ |
| **4** | polica alata i kratice | polica na svakom ekranu, jedan klik · `Ctrl+K` · `?` · `/` |

### FAZA 5 — **URAĐENA 19.09.2026.**

Mjeri se sa `work/majlis-local/faza5.mjs`, **nikad napamet**:

```bash
node work/majlis-local/faza5.mjs work/repo/apps/majlis/client/src
```

**50 sa prozorom i „šta slijedi" · 9 odluka sa razlogom upisanim u kod ·
0 bez ijednog.**

### Tri vrste ishoda, i zašto mjera broji tri stvari

Mjera **ne smije** biti namještena da odstupanje prođe kao urađeno. Zato
odstupanje nosi oznaku u kodu, uz razlog, i broji se odvojeno:

- `NO-WINDOW: <čin>` — prozora nema namjerno. Četvero: `recordFinding`
  *(glavna petlja, 6–20 uslova zaredom; prozor pred svakim bi ga pretvorio u
  niz potvrda koje niko ne čita)* · `screen` i `recognise` *(ništa se ne
  upisuje; `recognise` se i ne pritiska — pokreće se dok se red iscrtava)* ·
  `markHolding` *(prozor postoji, odgovor je ekran)*.
- `NO-AFTER: <čin>` — prozor postoji, a odgovor se **vidi** umjesto da se
  izgovori. Petero: `setParameters`, `changeHowItDecides`,
  `recordComputation`, `withdrawComputation`, `report`.

**Sljedeća je Faza 6** — pet stanja svakog ekrana, na svih 50 čvorova.

---
### Faze 11 i 12, dodane 19.09.2026.

- **11** — pravi upit banke kao PDF (dopis + nacrt murabahe), koji prolazi
  kroz *Ask* i na kojem `readAgainstShape` vraća uslove sa doslovnim navodom.
  Ako izvlačenje na pravom papiru počne pogađati, cijela §7 tvrdnja pada.
- **12** — upute na engleskom do zadnjeg detalja. Svaki korak mora biti
  prošetan u pregledniku dok se piše; što se ne da prošetati ide na popis
  kvarova, ne u upute.

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

## 3 · Četiri greške koje se ponavljaju — pazi na njih

| | |
|---|---|
| **Hook ispod ranog `return`** | Četiri puta: `StructureDetail`, `MatterFlow`, `IncidentDetail`, `HowThisIsHeld`. Cijeli ekran nestane u prazan `<div/>`. Vezanje ide **iznad** svakog izlaza. Čuvar je `src/HooksAboveReturns.test.ts` |
| **Čuvar koji gleda a ne vidi** | Isti taj čuvar je prošao zeleno na četvrtom slučaju: gasio se na `}: {` u trećem redu skoro svake komponente. Sad broji koliko ih je prošetao — **166**, pada ispod 160. **Svaki čuvar mora tvrditi koliko je pokrio** |
| **Proza kroz `node -e`** | Navodnici i šabloni se tiho pojedu, a `bash -c` puca na zagradama. Koristi `Edit` ili `.mjs` fajl. Backtick unutar template literala lomi i `.mjs` |
| **Slijepa zamjena imena** | Regex koji mijenja identifikator piše i po komentarima, i zna zabiti kod unutar funkcije. Zamijeni značenje, ne ime |

**Peta, iz iste porodice:** čin koji sam uhvati grešku i vrati se uredno kaže
prozoru da je prošlo — pa prozor javi uspjeh nad neuspjehom. Čuvar je
`src/ActsMustRefuse.test.ts`. Funkcija imenovana u `perform=` ne smije
uhvatiti vlastiti neuspjeh a ne baciti ga dalje.

---

## 4 · Kako se ovo pokreće i provjerava

```bash
cd apps/majlis/server && npx vitest run    # 1758
cd apps/majlis/client && npx vitest run    # 366
cd apps/majlis/client && npm run tokens    # dvije palete se moraju slagati
```

**Provjera u pregledniku** traži server sa članovima i proxy koji nosi
vjerodajnicu — preglednik ne može odgovoriti na basic-auth dijalog. Sve
pomoćne skripte su u `work/majlis-local/`, van repozitorija:

```bash
cd apps/majlis/server && npx tsx scripts/members.ts   # baciv odbor, ispiše ključeve
# PORT=4104 MAJLIS_ORIGIN=http://localhost:5177 MAJLIS_MEMBERS=<blok> npx tsx src/index.ts
# client: kopiraj work/majlis-local/vite.probe3.mjs u client/ i `npx vite --config`
```

`MAJLIS_ORIGIN` **mora** odgovarati portu na kojem klijent stoji, inače server
tačno odbije potpis napravljen za drugu adresu. Potpisivanje uređajem u
pregledniku bez ekrana traži virtuelnog potpisnika kroz CDP
(`WebAuthn.addVirtualAuthenticator`) — vidi `work/majlis-local/uredjaji.mjs`.

**Port 4104, nikad 4000** — 4000 je vlasnikova instanca. Varijabla je `PORT`,
**ne** `MAJLIS_PORT`; pogrešno ime je jednom zauzelo 4000. **Probni fajl i
vjerodajnice se brišu poslije provjere** i nikad ne ulaze u repo.

### Tri žive mjere, sve u `work/majlis-local/`

| skripta | pita |
|---|---|
| `radno.mjs` | pritisne **svako** dugme na 20 ekrana: je li se išta pomaklo? Boja se ne računa. Nađe i okna sa mnogo riječi i nijednom kontrolom, i riječi iz mašinskog registra |
| `prelijeva.mjs` | prelijeva li tekst iz svoje kutije · preklapa li se išta · AI registar · skrola li dokument |
| `faza5.mjs` | koliko činova ima prozor, koliko je odluka sa razlogom, koliko fali |

Prije nego povjeruješ nuli, **dokaži da mjera hvata**: ubaci pravi kvar i
gledaj je li prijavljen. Svaka od ove tri je jednom vratila nulu na kvaru koji
se vidi golim okom.

Preglednik ostavlja tab za sobom pri svakom prolazu i to ga uspori do
zastoja — zatvori ih prije svakog:

```bash
for id in $(curl -s http://127.0.0.1:9333/json/list | grep '"id"' | sed 's/.*: "//;s/".*//'); do curl -s "http://127.0.0.1:9333/json/close/$id" > /dev/null; done
```

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

`661be63` — *Izbor oblika kroz prozor, i mjera koja pritisne svako dugme na
svakom ekranu*.

**Sedamnaest commitova je lokalno i nije gurnuto.** Guranje se pita svaki put.
