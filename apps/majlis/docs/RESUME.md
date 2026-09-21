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

### Faze 6 do 9 — **URAĐENE I GURNUTE**

---

## 1b · Popravke koje je vlasnik tražio 20.09.2026.

Šest stavki iz jedne poruke, uz Fazu 10. Stanje na 21.09.2026:

| | stavka | stanje |
|---|---|---|
| 1 | gumb *Enter a holding* ne radi | **urađeno** — hookovi su bili ispod ranog `return`, peti put ista greška |
| 2 | *check a contract* otvara ružnu zasebnu stranicu | **urađeno** — čitanje je sad na samoj biblioteci, padajući izbornik i *compare them all* |
| 3 | AI koji čita ugovor i kaže šta piše | **urađeno** — `services/reading-with-a-model.ts`, i svih šest alata čita brojke iz dokumenta |
| 4 | upload vlastitih ugovora, izmjena stavki u postojećim oblicima | **urađeno** — `ChangeTheConditions` uz same uvjete; vlastiti standard se čita u pregledniku, u zapis ide samo ime |
| 5 | *convene meeting* na *Coming* ne uradi ništa | **urađeno** — obrazac je stajao mrtav bez riječi, a Coming je čin nudio i onome ko ga ne smije izvršiti |
| 6 | spajanje vlastitog kalendara, obavijesti na mejl | **urađeno** — žeton po članu za živu pretplatu; obavijest o sazivanju se sastavlja i jasno kaže da nije poslana |

**Svih šest je zatvoreno.**

### FAZA 10 — **URAĐENA 21.09.2026.**

Prvi put prošetana **gola instalacija** — bez ključa, releja, diska i lanca,
ona koju banka dobije. Diže se ovako, jer `.env` u repou postavlja lanac i
prvi prolaz zato **nije bio gol**:

```bash
PORT=4106 MAJLIS_ENFORCEMENT=none MAJLIS_ASSISTANT=off MAJLIS_DICTATION=off \
  MAJLIS_MEMBERS=<blok> npx tsx src/index.ts
```

Prva polovina pravila — *gumba nema* — vrijedila je svugdje. Druga —
*kaže se šta nedostaje* — bila je napola: traka je šutjela o releju, a
prilaganje dokumenta je bilo odsutno **bez ijedne riječi na svom mjestu**.
Oboje popravljeno.

**Čuvar je statički, i zna zašto.** Prvo je napisan probe koji pritisne svih
81 dugme na 23 ekrana i čeka da server odbije sa `reading_off` ili
`no_vault`. Nije našao ništa — **ni poslije ubačenog pravog kvara**, jer se
do `/extract` stiže tek trećim pritiskom. Mjera koja ne vidi kvar zbog kojeg
postoji nije mjera. Sad je pitanje postavljeno gdje se može odgovoriti
potpuno: `src/WhatIsOutside.test.ts`.

### FAZA 11 — **URAĐENA 21.09.2026.**

Papir je u `apps/majlis/samples/`: dopis treasury stola i nacrt murabahe,
sa HTML izvorom pored, da se može ponovo odštampati i da se vidi da nije
namješten čitaču koji ga čita. Klauzula 3.4 uzima uvećanje na kašnjenje u
prihod banke — uzorak u kojem nema ničega spornog dokazuje samo da se
čitač zna složiti. Tu je i skenirana kopija istog papira.

Riječi izlaze iz PDF-a **u pregledniku**, pa datoteka i dalje ne odlazi
nigdje i radi na instalaciji bez diska. Čitač se dovlači tek kad neko
izabere PDF — svoj komad od 472 KB, ne u glavnom svežnju.

Izmjereno od kraja do kraja: **3 314 znakova** iz dvije stranice, pitanje
poslano kroz *Ask* nosi riječi a ne ime datoteke, čitanje protiv murabahe
vraća **šest uslova, šest navoda, svaki provjeren nazad u tekst PDF-a**.

Mjere se pokreću iz `work/majlis-local/`:

```bash
node izpdf.mjs .../samples/treasury-enquiry.pdf   # šta stvarno izađe
node faza11.mjs                                   # cijeli put, 13 provjera
node faza11b.mjs                                  # četvrti uslov, protiv ijare
node faza11c.mjs                                  # sken se odbija po imenu
```

**Četvrti uslov je prvi put prošao prazno** — papir je murabaha, pa su sva
šest uslova nađena i „uslov bez navoda nikad ne stoji kao nađen" nije imao
nijedan takav uslov. Protiv **ijare** ih ima četiri, i svaki je odsutan,
imenovan rečenicom, nijedan nađen.

Sljedeća je **Faza 12** — upute na engleskom.

### Šta je odlučeno 21.09.2026, i vrijedi dalje

- **Žeton u adresi kalendara** je vlasnikova odluka, uz tri ograde: otvara
  jednu rutu i nijednu drugu *(mjereno protiv sedam)*, čuva se kao otisak pa
  kopija zapisa nije kopija adrese, i opoziv je jedan pritisak. Ekran kaže
  cijenu prije pritiska.
- **Mejl se ne šalje.** Obavijesti se sastavljaju i predaju čovjeku, sa
  „Majlis has not sent this" iznad. Kad banka upiše svoj SMTP, počinje slati
  bez ijedne druge izmjene.

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
cd apps/majlis/server && npx vitest run    # 1822
cd apps/majlis/client && npx vitest run    # 436
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

`fac2a89` — *Faza 11: a bank's question arrives as a PDF, and is read from the paper*.

**Sve je gurnuto na 21.09.2026.** Guranje se i dalje pita svaki put.

### Tri posljednja, i šta su donijela

- `32ca641` — AI čita ugovor po uslovima odbora. Dva čitača pod jednim imenom,
  izbor se pravi **jednom**, u `readADraft` u `routes/governance.ts`, i čitanje
  kaže koji je radio (`readBy`, `processor`). Podudarac riječi je propuštao
  klauzulu 3.2 *(1.5% mjesečno)* koju model nađe, citira i locira.
- `aad131b` — svih šest alata čita brojke iz dokumenta, ne četiri. **Vrsta polja
  je dio pitanja**: na *iznos koji ugovor imenuje* model je vratio „1.5% per
  month", tačno citirano, i ponudio dugme koje bi to upisalo u polje za novac.
  Sad se takva vrijednost pokaže sa navodom i **ne nudi**.
- `e72f0a7` — biblioteka: izbornik i usporedba, bez zasebne stranice.

### Dvije mjere koje su bile pogrešne prije aplikacije

Obje popravljene u repou, obje iz iste porodice kao §3:

- `forgetHealth()` je postojao a nije bio u `test-setup.ts`, pa je stanje
  instalacije curilo između testova — ekran provjeren sa uključenim pomoćnikom
  i pa sa isključenim dobijao je prvi odgovor dvaput.
- Čuvar neimenovanih polja čitao je `//` komentar koji spominje `<input>` kao
  markup. Sad briše komentare, i dokazano je da i dalje hvata polje kojem se
  oduzme ime.

### Jedan nalaz koji čeka

`lib/journey.ts` definiše **jedanaest ruta dvaput**; druga tiho pobjeđuje, pa
je polovina unosa mrtav kod — uključujući `phase`, koji odlučuje gdje ekran
sjedi u kičmi. Nije dirano osim `/library`. Traži odluku koja je kopija prava,
i čuvara koji pada na duplikat.
