# Nastavak — gdje smo stali, i šta dalje

Ovo je ulazna stranica za sljedeću sesiju. Red posla je u
[RED.md](RED.md); ovdje je samo stanje i ono što se ne vidi iz koda.

Zadnje stanje: **tačka 1 zatvorena i pushana** (`0b5d835`), **tačka 2 radi na
predmetu i prekršaju, server i klijent**, lokalno commitano, **nije pushano**.

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

## 2 · Tačka 2, dodjela — šta je urađeno i šta je nađeno

Testovi pušteni na serversku polovinu su pali (4 od 1917). Popravak toga bio je
najmanji dio. Nađeno, svako sa stražom koja je gledana kako pada kad se kvar
vrati:

| kvar | kako nađen |
|---|---|
| red je gubio ime držaoca za predmet, prekršaj i reviziju — samo pitanje i obaveza su ga nosili | čitanjem koda |
| držalac cijelog predmeta upisivao se i na korake institucije — član je stajao kao onaj koji drži bankin plan | čitanjem koda |
| ime je išlo i na gotove korake, gdje se čita kao *ovaj je to uradio* | čitanjem koda |
| ruta je primala bilo koji id i bilo koji korak | čitanjem koda |
| rad se mogao dodijeliti **likvidatoru banke** — `board.members` ga nosi kao člana | seed |
| ime na koraku potpisnika (glasanje) skidalo je glasanje sa liste svim ostalim potpisnicima | razmišljanjem o prekršaju, koji nema nijedan korak odbora |
| kontrola je bila u `MatterPack`, a `/matters/:id` crta `MatterFlow` | **preglednik** |
| `assignments` nije bio na listi čitača u `pulsing.ts` → svako čitanje reda zvonilo je zvono → red se ponovo čitao **zauvijek**, ekran vječno *Loading…* | **preglednik** |
| isti kvar, stariji: `assistantLog` | nova straža, prvi put puštena |

Zadnja dva su najvažnija: sve je bilo zeleno, a početni ekran se nije mogao
otvoriti. `test/reading-is-quiet.test.ts` sad zove **svaki** GET i pada ako je
ijedan tražio od pohrane nešto što zvono broji kao pisanje.

**Model koji stoji:**
- osoba na koraku (`who`, scholar id) ide samo na korake **odbora** koji još
  nisu gotovi — posao koji jedan član radi za odbor;
- korak potpisnika nikad ne nosi ime: svaki potpisnik ga radi sam za sebe;
- cijelu stvar nosi `holder` na prolazu, i to može biti bilo ko s ove strane
  stola (potpisnik ili savjetnik), i na prekršaju;
- `holdable` kaže server — klijent ne računa sam ima li šta za držati;
- *moje* u redu: ime na koraku → samo taj; ono što nosiš → tvoje; odbor → svih;
  potpisnik → svih potpisnika.

**Pitanje i revizija — zatvoreno.** `routes/passages.ts`: prolaz bilo koje
vrste, jedan (`/passages/:kind/:id`) ili svi jedne vrste odjednom
(`/passages/:kind`, da lista ne šalje zahtjev po kartici). Kartica pitanja i
stranica odluke nude *uzmi / daj / vrati*. Red sad otvara **tačno** pitanje
(`/questions#id`, osvijetljeno) i tačnu odluku (`/rules/:id`) — prije je slao na
cijelu listu. Uživo: predsjednik iz reda otvori pitanje, da ga Bilalu, kartica
kaže *With Board Member B · placed by Board Member A*; likvidator nije ponuđen.

**Obaveza — namjerno bez kontrole.** Obavezu je dao član i njegovo ime na
koraku pobjeđuje dodjelu (*nijedna dodjela ne mijenja ko je obećao*), pa bi
*uzmi ovo* na obavezi promijenilo tek držaoca, a ne ono što red kaže da je
čije. Predati obavezu drugome je drugi čin (promijeniti `Undertaking.who`, sa
zapisom) i nije napravljen.

**Bankin desk ne smije znati ko u odboru drži šta — zatvoreno.** Nađeno
pitajući rute desk kredencijalom, poslije zelenih testova: nova ruta prolaza
pitanja davala je desku **sva** pitanja odbora s držaocem, a zapis dodjela, red
i prolazi predmeta i prekršaja imenovali su člana koji drži svaku stvar. Desk
koji zna koji učenjak drži njegovo pitanje zna koga da pritisne — a nezavisnost
odbora je ono što banka kupuje. Jedno pravilo, `visibleTo`, primijenjeno
svuda gdje se dodjele primjenjuju; desk vidi prolaze samo svojih pitanja (ista
ograda kao `/submissions`); zapis dodjela desku 403.
`test/the-desk-is-not-told.test.ts`, svaka provjera dvaput — kao desk (nema
imena) i kao član (ima), inače prva ne znači ništa.

**Ostalo od tačke 2:**
1. dodjela **jednog koraka** postoji na serveru, ne u sučelju
2. arapski i urdu za `hold.*` su moji i nepregledani

**Desk više ne čita red odbora — zatvoreno (tvoj izbor prijedloga).**
`/api/queue` je desku davao cijeli red odbora: sve predmete i prekršaje, obaveze
s imenom člana koji ih je dao, i **naslove pitanja drugih deskova** iste banke.
Sad mu odgovara samo redovima njegovih pitanja — isti test kao `/submissions`,
pa se dvije ograde ne mogu razići. `NewsProvider` (zvono i baner, oba sakrivena
za desk) za desk više ne pita. `Arrival` još šalje jedan zahtjev za red u pola
sekunde prije nego zna da čita desk — namjerna UX odluka (bez praznog ekrana),
ostavljena; bezopasna je zato što granicu drži server, ne ekran. Uživo: desk
dobija prazan red, član svojih 7 redova, a zvono člana i dalje javi novo
pitanje.

**Otvoreno, sitno:**
- Gornja traka ~0,7 s tvrdi *Not signed in · reads only* dok se identitet
  učitava (`Shell` ne gleda `loading`) — star, sitan, nije diran.

**Imena umjesto id-a — zatvoreno (poslije CI-ja).** Sirovi scholar id crtao se
na 24 mjesta u 20 datoteka, plus avatar: gornja traka svakog ekrana (`member-b`), avatar
(svi „M"), autori u raspravi, glasovi, prisutni na sjednici, utvrđivanja i
prijavilac na prekršaju, ko je upisao izračun, ko je usvojio oblik, baner reda…
Korijen nije bio na ekranima: polje `whoName` je u prolazu i redu nosilo **id**,
a u rutama obaveza i napomena **ime** — ista riječ, dva značenja. U prolazu i
redu je sada `who` (id, kao `Undertaking.who`); `whoName` ostaje samo gdje nosi
ime. Sve ide kroz `<Person id>`; `EveryoneIsNamed.test.ts` čita svaki ekran i
pada ako se polje osobe nacrta kao tekst — dva namjerna izuzetka imaju razlog
upisan uz sebe (Postavke; rečenica o porijeklu koja se pohranjuje u zapis).
Straža ne vidi kroz varijable; to drži test ponašanja u
`WorkIsWithAPerson.test.tsx`.

**Probni server** za ovo (izvan repoa): `MAJLIS_MEMBERS` s lažnom lozinkom,
`PORT=4105`, `MAJLIS_DB` u scratchpadu, dva `vite` na 5177/5178 s
`MAJLIS_AS=member-b:…` i `member-c:…` — dva člana u dva prozora. Tako su
nađena zadnja dva kvara.

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
