# Nastavak — gdje smo stali, i šta dalje

Ovo je ulazna stranica za sljedeću sesiju. Red posla je u
[RED.md](RED.md); ovdje je samo stanje i ono što se ne vidi iz koda.

Zadnje stanje: **tačka 1 zatvorena i pushana** (`0b5d835`), **tačka 2 napola**
(commit iznad ovog, serverska strana).

---

## 1 · Šta je gotovo

**Jedna gramatika posla za svih pet vrsta.** `server/src/services/`:

| datoteka | šta čita |
|---|---|
| `passage-shape.ts` | gramatika sama — korak, stanje, vlasnik, rečenica, grupe |
| `passage.ts` | predmet |
| `passage-incident.ts` | prekršaj (9 koraka, dvije polovine) |
| `passage-question.ts` | pitanje (3 koraka) |
| `passage-undertaking.ts` | obaveza (3 koraka) |
| `passage-review.ts` | odluka pred revizijom (3 koraka) |

Prije ovoga ista logika postojala je u četiri izvedbe različitog kvaliteta.
Obrisano je: `whatToDoNow` (stotinu redova slučajeva na klijentu), `BREACH_NEXT`
(ručna tablica u `queue.ts`), devet ručno pisanih koraka u `IncidentDetail`, i
tri doslovne engleske radnje u redu.

**Rečenice su ključevi, ne engleski.** Server šalje `{ key, vars }`, sučelje
kaže na jeziku čitaoca. Oko 220 rečenica u tri jezika.

**Straže koje postoje i dokazane su ubacivanjem kvara:**
- svaka rečenica koju prolaz može doseći ima riječi iza sebe u engleskom rječniku
- radnja na redu jednaka je radnji na samom predmetu
- vlasnik koraka jednak je onome koga ruta stvarno pušta da djeluje — i to u
  **svakom** stanju koraka, ne samo u jednom
- nijedan ključ u rječniku nije napisan dvaput, po jeziku posebno

## 2 · Šta je u zraku — tačka 2, dodjela

Serverska strana je napisana i `tsc` prolazi. **Testovi nisu pušteni na ovu
izmjenu, i klijent nije ni takniut.**

Napisano:
- `services/assignment.ts` — zapis se dodaje i nikad ne mijenja; posljednji za
  isti korak je onaj koji stoji; `to: null` znači vraćeno sobi. `mayAssign`
  drži pravilo: predsjednik i sekretar smiju premjestiti bilo šta, svako smije
  uzeti ono što niko ne drži, a samo držalac predaje svoje dalje.
- `withAssignments(passage, assignments)` — upisuje ime na korak, primijenjeno
  **poslije** čitanja, tako da čitanja i dalje ne znaju ništa o dodjelama.
- `routes/assignments.ts` — jedna ruta za četiri čina (dodijeli, uzmi, predaj,
  vrati); koji je od četiri bio čita se iz zapisa, ne šalje se.
- Pohrana u sve četiri izvedbe (`store`, `memory`, `file`, `tenant`).
- Red i obje rute prolaza prolaze kroz dodjele.

**Prvo što sljedeća sesija treba uraditi:**

```bash
cd apps/majlis/server && npx vitest run
```

Zatim klijent:
1. `lib/api.ts` — tip `Assignment`, `PassageStep.whoName`, poziv `assign()`
2. Kontrola na ekranu: *uzmi ovo* / *predaj* / *vrati sobi*, na kartici sljedeće
   radnje i na redu prolaza
3. `Queue.tsx` — pravilo `mine` već čita `r.whoName` i radit će bez izmjene,
   ali **ime se crta kao sirovi `member-a`**; treba ga razriješiti kroz
   `board.members` u pravo ime
4. Uživo na 390 px i 1440 px

---

## 3 · Savjeti — ono što bih rekao da me pitaš

**Prvo, najvažnije: poslije tačke 2 uradi jednu vidljivu stvar.**
Tačke 2–7 su logika koju čovjek ne vidi direktno. Tvoja je pritužba bila da
aplikacija ne izgleda kao aplikacija — a niz commitova o gramatici to ne
mijenja ni za piksel. Gramatika je temelj koji radni prozor (tačka 8) tek čini
mogućim, ali ako između bude šest commitova koje se ne vidi, nezadovoljstvo se
vraća s pravom. Predlažem: poslije dodjele, uradi tačku 8 na **jednoj** vrsti
(prekršaj je najbolji, jer već ima devet koraka i dvije polovine), pogledaj to
na ekranu, pa se vrati na logiku.

**Drugo: dva najjeftinija popravka telefona izvuci naprijed.**
T2 (kontrast — `muted` je 3,0:1 gdje standard traži 4,5:1, na 777 mjesta) i T1
(ljestvica 17/15/13) su mehanički, niskog rizika, i mijenjaju **svaki** ekran
odjednom. Sada čekaju u tački 9, iza radnog prozora. To je dugo da telefon
ostane nečitljiv zbog dvije izmjene koje su pola dana posla.

**Treće: arapski i urdu su moji i niko ih nije pregledao.**
Oko 220 rečenica sada. Za proizvod koji se prodaje zalivskim bankama to nije
sitnica — to je jezik na kojem odbor čita šta treba uraditi. Prije bilo kakvog
pokazivanja banci, neko ko te jezike zaista čita mora proći kroz rječnik. To
nije stvar koju ja mogu zatvoriti.

**Četvrto: zadrži disciplinu mjerenja.**
Svaka faza ovog projekta dosad je sakrila stvarni kvar iza zelenih testova. U
ovoj sesiji su tako nađena četiri: red i predmet koji govore različito, čitanje
koje puca na zapisu bez polja, vlasnik koji se mijenja po grani, i ime pogrešne
osobe u stupcu koji kaže ko drži posao. **Nijedan od njih nije našao test —
našlo ih je otvaranje dva ekrana jedan pored drugog.** Kad napišeš stražu,
ubaci kvar i gledaj da padne prije nego joj povjeruješ.

**Peto, o samom oblaku:** tamo testovi rade, preglednik ne. Logičke tačke
(2–7, 11) su provjerljive testovima i dobro leže oblaku. Vizualne (9, 10, 12)
drži za desktop, gdje mogu otvoriti ekran i izmjeriti. Ne vjeruj vizualnoj
izmjeni koja je samo prošla `tsc`.

**Šesto: priručnik PDF ima stare snimke.** Nije hitno, ali svaki put kad se
ekran promijeni postaje netačniji, a to je dokument koji ide banci.

---

## 4 · Pravila koja vrijede uvijek

- Commitovi su `AbZe628 <abdusamedzelic98@gmail.com>`. **Nigdje nikakav trag
  AI-ja** — ni u commitu, ni u PR-u, ni u kodu.
- **Pitaj prije svakog pusha na GitHub.**
- `vite.probe*.mjs` se nikad ne commitaju.
- Port 4000 je vlasnikov; koristi 4105/5177.
- Lokalne datoteke (ključevi, CDP vozač, probne skripte) su u
  `work/majlis-local/`, izvan repoa.
- Govori hrvatski.
