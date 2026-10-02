# Nastavak — gdje smo stali, i šta dalje

Ovo je ulazna stranica za sljedeću sesiju. Pročitaj je cijelu prije prvog
reda koda. Red posla je u [RED.md](RED.md), prijedlozi u
[PRIJEDLOZI-UI.md](PRIJEDLOZI-UI.md). Ovdje je stanje, ono što se ne vidi iz
koda, i svaki sljedeći korak.

**Zadnje stanje (2. 10. 2026):** sve je na **radnoj grani** — onoj na kojoj
je ova stranica — dvadeset četiri commita iznad `origin/main` (`692022e`). **Na
`main` nije ništa pushano** — to je vlasnikova odluka. Zadnja tri commita
(`7ca09f3`, `0fa6b0c`, `c1e6d66`) **nisu pushana ni na radnu granu** — pitaj
prije nego što išta ode na GitHub.

| commit | šta |
|---|---|
| `ef8df0b` | P1 — brzina: ekrani i jezici stižu kad zatrebaju, čin se crta prije odgovora servera |
| `22c10a8` | P2 — čitljivost: ljestvica za telefon, kontrast, sistemski font, bez Google fontova |
| `cb1751f` | P0 — lista ostaje pored otvorenog; nijedan čin nije podvučena riječ |
| `efe47fd` | P3 — jedan radni prozor za svaku vrstu posla; korak zna ko je već rekao svoje |
| `9e5f0cd` | RED 7 — odluka nosi dokaz o sebi, uvjet po uvjet |
| `ac9c747` | §4.5 zatvoren u ovoj stranici |
| `7ca09f3` | P4a — red se može uzeti bez otvaranja liste |
| `0fa6b0c` | P4b — član može reći da se vraća na nešto, i odbor to čita |
| `c1e6d66` | P6 — članu se kaže šta ga čeka, bez otvaranja Majlisa |
| (ovaj) | ova stranica, RED i PRIJEDLOZI ažurirani |

Zadnje mjerenje (2. 10. 2026, ovaj vrh): klijent **593/593** testova (68
datoteka), server **2146/2146** (102 datoteke), `tsc --noEmit` čist na obje
strane, početni paket **156,8 kB** gzip od dozvoljenih 165 kB (145,7 kB
skripta + 11,1 kB stil, oboje izmjereno `gzip -c` nad onim što `index.html`
zaista učitava). Brojevi su mjereni, ne prepisani — provjeri ih prije nego se
na njih pozoveš.

---

## 0 · Prvih petnaest minuta sutra

1. **Grana.** Radna grana je ona koja nosi commit `efe47fd`. Pazi: tri
   commita na vrhu (`7ca09f3`, `0fa6b0c`, `c1e6d66`) postoje samo lokalno —
   `origin` ih još nema, pa ih `git branch -r` neće vidjeti.
   ```
   git fetch origin
   git branch -r --contains efe47fd     # ime radne grane
   git checkout <to ime>
   git log --oneline -10                # vrh: commit s ovom stranicom
   ```
2. **Zavisnosti i testovi** (Node 20 ili 22):
   ```
   cd apps/majlis
   npm ci
   (cd server && npx vitest run)     # 2146
   (cd client && npx vitest run)     # 593
   (cd client && npx tsc -b) && (cd server && npx tsc --noEmit -p .)
   (cd client && npm run build)      # budžet: pada iznad 165 kB
   ```
   Ako brojevi nisu isti — stani i nađi zašto prije bilo čega drugog.
3. **Probni server i preglednik** — vidi §5. Bez toga se ne radi ništa
   vizualno: *testovi nisu dokaz*.
4. **Prvi posao** je §4.7 (P7 + RED 9/10/12). §4.6 je zatvoren; što je od njega
   svjesno ostalo stoji u §4.6 i u PRIJEDLOZI P6 (*promijenjeno otkad si
   vidio*, i raspoređivač izvan procesa koji zove `POST /api/notices/waiting`,
   jer GET ništa ne šalje).

---

## 1 · Šta je napravljeno u ovoj sesiji

### P1 · Brzina (`ef8df0b`) ✅
- Svaki ekran je lijen (`client/src/screens.ts`), arapski i urdu se učitaju
  tek kad se izaberu, jezik čitaoca prije prvog ekrana (nema bljeska engleskog).
- Početni paket 1.236 kB → 144 kB (sada 149,6 kB gzip). `scripts/budget.mjs`
  ruši build iznad 165 kB; `ScreensArriveWhenNeeded.test.ts` hvata jedan
  ekran koji bi prošao kroz marginu. Oba viđena kako padaju.
- Ekran predučita kad miš stane na vezu; svi ekrani kad je preglednik slobodan.
- Kostur umjesto *Loading…* (poslije 200 ms, da brz odgovor ne treperi).
- *Uzmi ovo* se crta odmah, odbijanje ga vraća (68 ms uživo, server 1,3 s).
- *Met — next* ide dalje bez ponovnog čitanja cijele liste: 811 → 422 ms.

### P2 · Čitljivost (`22c10a8`) ✅
- Ljestvica je varijabla (`design/tokens.css`): telefon i tablet dobijaju
  Appleove veličine (tijelo 17, 15, 13, ništa ispod 12); stol ostaje gušći.
  Arapski osminu veći s prostorom za znakove, bez razmaka između slova; urdu
  još veći, s visinom reda za nastaʿlīq.
- `muted` #726B60 (4,6:1 na najgoroj podlozi); zlatni tekst je `goldink`.
  `TextIsReadable.test.ts` mjeri svaku boju teksta na svakoj podlozi.
- Sučelje je sistemski font; serif samo za ono što se čita. Fontovi idu s
  aplikacijom — ništa se ne dohvaća od Googlea.

### P0 · Lista pored rada (`cb1751f`) ✅
- Na stolu (≥ 1024 px) otvoren red ostaje u stupcu lijevo (320 px), osvijetljen;
  rad se otvara desno. `j`/`k` (ili strelice kad si na redu) otvaraju sljedeći.
  Traka (rail) ustupa mjesto stupcu i vraća se preko njega iz ugla stupca;
  Esc ili sjena je zatvara.
- Lista se otvara kako je ostavljena (`lib/kept.ts`): redovi reda, *tvoje* /
  *svi*, kartica zapisa.
- Nazad vraća tačno gdje si bio (`lib/scroll.ts`): položaj po stavci
  historije, drži se 1,5 s dok se ekran ne slegne (izmjereno: napola nacrtan
  ekran ga je skratio za 39 px), red s kojeg si se vratio kratko zasvijetli.
  Telefon imenuje listu u uglu (*‹ What needs you*).
- Tablica bira stupce ili redove po **svojoj** širini (`Sheet` mjeri sebe),
  ne po prozoru — na 1024 px lista prekršaja je bila redovi bez imena.
- `ActsAreButtons.test.ts`: nijedan čin nije podvučena riječ (31 datoteka
  prepravljena).
- Traka stanja jedan red; vodič je u traci; *Not signed in* se više ne tvrdi
  dok se identitet učitava.

### P3 · Jedan radni prozor (`efe47fd`) ✅ (osim provjere na telefonu, §3 H)
- **`components/WorkWindow.tsx`** — jedan prozor za prekršaj, pitanje,
  obavezu i reviziju odluke, iz prolaza sa servera (`groups`, `next`,
  `standing`, `why`, `whose`, `who`, `holder`). Crta `StepWindow`: traka
  koraka po grupama (svaki korak imenovan *čin — čiji*), *šta sad* (h2, čiji,
  šta stoji na putu, ko drži, detalj, *zašto ovaj korak*), *šta se desilo*
  (h3), sa strane ≤ 5 činjenica i dokument, i jedna traka činova.
  Traka: čin dok pratiš posao; *Waiting on …* kad korak nije tvoj;
  *Back to what is next* kad čitaš drugi korak; ništa kad je gotovo.
  Poslije čina prozor ide na korak koji je sada sljedeći (`moved`).
- Nove adrese: **`/questions/:id`** (`pages/QuestionDetail.tsx`) i
  **`/undertakings/:id`** (`pages/UndertakingDetail.tsx`); red *šta te čeka*
  ih otvara (`server/src/services/queue.ts`). Liste pitanja i obaveza su redovi
  koji vode na njih.
- **Predmet je jedan ekran**, `MatterFlow`. `MatterPack` i `MatterDetail`
  obrisani; `/dossier/matters/:id` i `/classic/matters/:id` preusmjeravaju.
  Ono što su samo oni imali je u `components/TheFile.tsx` (sklopljeni
  dijelovi). Glasanje (`VotePanel`) sada i u vremenskoj brani (nađeno testom).
- Revizija odluke: kad je na redu, `RuleDetail` crta prozor.
- **Na telefonu traka činova stoji tačno na vrhu tabova**, u sva tri jezika:
  `TabBar` mjeri svoju visinu u `--foot`, radno okno ostavlja
  `--foot + 2.5rem`, traka je `sticky -bottom-10` (Chrome mjeri sticky unutar
  paddinga). Izmjereno: en/ar/ur, dno trake = vrh tabova. Prije: 167 px iznad,
  preko naslova prozora.
- **Nađeno prolazeći kroz čine uživo** (sve popravljeno, svaka straža viđena
  kako pada kad se kvar vrati):
  1. Prvi potpisnik koji kaže *povreda* dobio je *Recorded as a breach — the
     thirty days are running*, a nalaz nije donesen (treba kvorum). Sad:
     *Your view is on the record: a breach* + *finding is not made yet*.
  2. `act()` u `IncidentDetail` je gutao svako odbijanje → čin je mislio da je
     uspio; na ekranu zeleno *recorded* i crveno odbijanje jedno ispod drugog.
     Sad odbijanje ostaje u prozoru čina, s otkucanim tekstom.
     `Act.perform` smije vratiti ono što je stvarno uradio (`did/means/next`)
     kad to zna tek iz odgovora servera.
  3. Isti gumb ponuđen onome ko je već rekao svoje. Sad: *You said this is a
     breach* + *Change my view: not a breach* (promjena mišljenja je dozvoljena
     dok nalaza nema; isto mišljenje dvaput ruta odbija).
  4. **`heard` / `waitingOn` na koraku** (`server/src/services/passage-shape.ts`):
     korak koji svaki od više ljudi radi za sebe (glasanje, nalaz o prekršaju)
     nosi ko je već rekao svoje i na koga se čeka — id-jevi, ekran ih imenuje
     (`client/src/lib/standing.ts`). Red *šta te čeka* više ne vodi glas koji
     si dao kao *tvoj* (bio je tamo 55 dana). Rečenica je čitala *waiting on
     member-c, member-d, member-e*.
  5. Korak dodijeljen kolegi: prozor kaže *With {ime}. Theirs to do.* umjesto
     da svima nudi čin. Obaveza: sekretar je i dalje može zatvoriti za člana
     koji ju je dao (`onTheirBehalf`).
  6. Obavijest koju odbor šalje banci pisala je *member-a opened a matter*
     (`server/src/services/notice.ts`) — sad ime.
  7. Poslije preuzimanja pitanja veza se zvala *Go to what needs you*, a vodila
     na predmet. Sad *Open the matter* → `/matters/<novi id>`.
  8. `whatToDoNow` (NextAct) i `Passage.tsx` ostali su bez ekrana kad je
     MatterDetail obrisan — test je dokazivao komponentu koju niko ne vidi.
     Obrisani; njihovo pravilo o koraku u rukama kolege sada je u
     `WorkWindow`, i testirano tamo. (RED L3 je tvrdio da je obrisan — sada
     je istina.)
  9. TypeScript je uhvatio ono što testovi nisu: ostali činovi na prekršaju bi
     vratili zapis prekršaja, a `Act` bi ga nacrtao kao rečenicu. Razdvojeno
     (`settle` vraća zapis, `act` ništa) + test.
  10. Server: `returnToDeliberation` je bacao provjereni razlog — sad ga vraća i
      ruta ga upisuje (`lifecycle.ts`, `routes/governance.ts`).

---

## 2 · Kako je sada građeno (ono što se ne vidi iz jednog fajla)

- **Prolaz je jedina vlast nad pitanjem *šta sad*.** Server:
  `passage.ts` (predmet), `passage-incident.ts`, `passage-question.ts`,
  `passage-undertaking.ts`, `passage-review.ts`; oblik u `passage-shape.ts`.
  Klijent ne računa ništa o tome gdje posao stoji.
- **Korak:** `key, act, whose, state, at, standing, enforced, why, who?,
  heard?, waitingOn?`. `who` = osoba kojoj je korak dat (id). `heard` = ko je
  već rekao svoje na koraku koji svako radi za sebe. `waitingOn` = na koga se
  čeka. Id-jevi uvijek; imena crta ekran (`nameOf`, `<Person>`, `useStanding`).
- **Red** (`queue.ts`) uzima sve s prolaza kroz jedno mjesto (`fromPassage`),
  da nijedna vrsta ne ispusti polje. *Moje* (`pages/Queue.tsx`, `mine`):
  već rekao → nije tvoje; ime na koraku → samo taj; nosiš → tvoje; odbor →
  svih; potpisnik → svih potpisnika.
- **Čin** (`components/Act.tsx`): prozor prije, *šta slijedi* poslije.
  `perform` baca na odbijanje (nikad ne guta), može vratiti vlastiti
  `did/means/next`. Ekran čiji se oblik mijenja činom predaje `onDone` i sam
  crta *šta slijedi*.
- **Prozor** (`WorkWindow` → `StepWindow`): stranica daje `panels`
  (`key, detail, summary, action, onTheirBehalf`); prozor odlučuje je li čin
  sada tvoj (u rukama kolege? već rekao?).
- **Okvir** (`components/Shell.tsx`): `split.ts` (koja lista, pamćenje,
  `LIST_TITLES`, `notePath/cameFrom`), `ListColumn.tsx` (stupac),
  `kept.ts`, `scroll.ts`, `lineKeys.ts`, `sheet.tsx` (`InTheColumn`, `Fits`).
- **Rječnici:** nikad ručno. `client/scripts/merge-strings.mjs` (dodaje, ne
  gazi), `replace-strings.mjs <jezik>` (mijenja postojeće), `remove-strings.mjs`
  (briše, odbija ključ koji kod još traži). Pokreće se iz `apps/majlis/client`.

---

## 3 · Nađeno, a nije popravljeno — redom kojim bih radio

**A, B i H su zatvoreni 29.09.2026** (`f9ca210`, `4e10abb`, `65e8f4e`) — opisi
ostaju dolje zato što objašnjavaju *zašto*, a ne zato što se još radi.

Iz A je ispala pometnja koju vrijedi zapamtiti: kad je straža `EveryoneIsNamed`
proširena da vidi liste ljudi (`.join` i listu predanu kao dijete), našla je
još dva mjesta s istim kvarom — glasanje (*not yet recorded: member-c,…*, i
njegov vlastiti test je tražio taj niz, pa je kvar imao test koji ga je držao)
i kalendar, na stranici i u kanalu prema vanjskom kalendaru. Potpisivanje
dokumenta je već bilo ispravno.

H je bio provjera, ne izmjena: pet zaslona × en/ar/ur na 390 px — nigdje
bočnog skrola, najmanji tekst 12 px (en) / 13,44 (ar) / 13,8 (ur), nigdje
sirovog id-ja, nigdje engleskog kroz prijevod, konzola čista na svježem
jastučiću. Prošetane i radnje: prvi glas i promjena mišljenja na nalazu,
glasanje na kojem si glasao stoji pod *Everyone* a ne pod *Yours*, pitanje →
*Open the matter* → novi predmet, obaveza imenuje *Board Member B*, posao
položen kod kolege čita *With Board Member B · placed by Board Member A*.
Traka činova sjeda točno na fiksni `nav` (razmak 0).

Ostaje na telefonu ono što je ionako svoja stavka: C (baner), D (gornja
traka), E (urdu tabovi), F (traka činova u dva reda).

**A · Odobravanje plana na prekršaju — isti kvar kao nalaz (prvo ovo).**
Nađeno čitanjem koda, nije još viđeno u pregledniku.
- `client/src/pages/IncidentDetail.tsx`, panel `endorse` (oko reda 412):
  `plan.endorsedBy.join(', ')` crta **sirove id-jeve** (`EveryoneIsNamed`
  straža ne vidi kroz `.join`); gumb *Endorse* se nudi i članu koji je već
  odobrio, a server to odbija (`incident.ts`: *That member has already
  endorsed this plan*).
- Server: `passage-incident.ts`, korak `endorse` (oko reda 245) nema `heard`.
- Popravak po uzoru na nalaz: `heard` = `plan.endorsedBy` dok je korak otvoren;
  imena kroz `<Person>`; član koji je odobrio vidi *You endorsed this plan*,
  ne gumb; test u `Incidents.test.tsx` + `passage-incident.test.ts` + red;
  ubaciti kvar i gledati da padne; uživo s dva člana u dva prozora (§5).
- Provjeriti istim okom **potpisivanje dokumenta** (`SignTheDocument.tsx` već
  gleda `mine`) i sve ostale korake gdje više ljudi djeluje pojedinačno.

**B · Prozor predmeta ne kaže na koga glasanje čeka.** Uživo na
`/matters/matter-2026-08-11`: nigdje *Waiting on …* (MatterFlow ne crta
`standing` koraka `positions`). Server sada šalje `waitingOn`; `VotePanel`
ili MatterFlow treba pokazati imena (`useStanding`). Test + uživo.

**C · Baner *Arabic and Urdu have not been reviewed* na telefonu je golem** —
329 px na urduu, 252 na arapskom, iznad svakog prozora (`Shell.tsx` oko reda
1304, `lang.notReady`). Treba jedna linija koja se može zatvoriti i ne vraća
se na svakom ekranu (zapamtiti po jeziku). Tačka P7.

**D · Telefon, gornja traka (O2):** okrugla dugmad guraju natpis nazad u
*What needs y…*. Jedna traka od 56 px: nazad, ime, jedna radnja (P7).

**E · Urdu tabovi se lome u dva reda** (*جو ہمارے پاس / ہے*) → traka 94 px.
Traka činova se sada prilagođava, ali tab bi trebao stati u jedan red
(kraći natpis ili manji razmak).

**F · Traka činova na telefonu je dva reda** (sporedni čin iznad glavnog,
126 px). Razmotriti jedan red: sporedni kao tekst-gumb lijevo, glavni desno.

**G · Novi arapski i urdu nizovi su moji i nepregledani** (`hold.*`, `work.*`,
`snc.youSaid*`, `snc.changeTo*`, `sw.concur*.heard`, `passage.waitingOn`,
`wm.next.openTheMatter*`, `file.*`, `und.*`, `queue.askedBy/entered/aDraftCame`).
Prije ikakvog pokazivanja banci mora ih pročitati izvorni govornik.

**H · Današnje izmjene nisu prošle uživo na 390 px** — samo na 1440. Proći na
telefonu: nalaz (prvi glas, promjena mišljenja), glasanje van *moje*,
pitanje → *Open the matter*, obaveza koju sekretar zatvara, prozor u rukama
kolege. U en, ar, ur.

**I · Priručnik PDF** (`docs/Gravitas-Majlis-Handbook.*`, `HANDBOOK.md`,
`guide/`) ima stare snimke — sada su ekrani bitno drugačiji.

---

## 4 · Sljedeći koraci — redom, svaki detaljno

Za **svaki** korak ispod: napiši stražu → ubaci stvarni kvar → gledaj da
padne → vrati → uživo 390 i 1440 px (en/ar/ur gdje ima teksta) → commit kao
AbZe628 → **pitaj za push**.

### 4.1 · P3 do kraja
§3 A, B, H. Onda je P3 zatvoren.

### 4.2 · RED 2 ostatak — dodjela jednog koraka u sučelju
- Server to već ima: `POST /api/assignments` prima `stepKey`
  (`server/src/routes/assignments.ts`, oko reda 53 i 131–163), provjerava da
  korak postoji i da ga osoba s ove strane stola smije držati.
- Sučelje: u `WorkWindow` na koraku odbora koji nije gotov — *Take this step*
  / *Give it to…* / *Put it back* (isti obrazac kao `components/Holding.tsx`
  za cijelu stvar, koji već ima optimistično crtanje i vraćanje na odbijanje).
- Dokaz: `WorkIsWithAPerson.test.tsx` (korak s imenom nije tvoj, nudi se
  onome kome je dat), uživo s dva člana.
- Plus §3 G za `hold.*`.

### 4.3 · RED 3 + 4 — sat stvara posao; požurnica i eskalacija ✅ (30. 9. 2026)

**RED 3 — `c5a4f6f`.** Tvrdnja je bila da sat ne stvara posao. Mjerenje je
pokazalo da **stvara**: tri odluke bez intervala već su stajale u redu kao
otvoren korak odbora. Pravi kvar je bio gori — taj posao se nije mogao
obaviti. Nijedna ruta nije pisala odluku i `store` nije imao metodu za to;
jedini gumb na koraku bio je *pogledaj ponovo*, koji otvara predmet i
odgovara na drugo pitanje. Sada: `updateRule` u sva četiri skladišta,
`POST /api/rules/:id/interval`, `ReviewInterval` kao **lista** (odbor koji
skrati rok poslije bliskog promašaja je nešto rekao), i četvrto stanje
`no_clock` — *ne na sat* je odgovor, ne praznina. Dvije stvari nađene tek
uživo: stranica je status čitala jednom pri otvaranju, a *next review* je
dolazio iz liste pažnje, koja nosi samo dospjelo — pa je uredna odluka na
vlastitoj stranici pisala *no review scheduled*.

**RED 4 — `2a5de32`.** Mjereno na `incident-2026-08-14`: 47 dana, plan
odobren, 33 dana ništa nije otišlo Upravi, 41 280 AED nenaplaćeno. Ekran je
nudio *Take this on* i *Place with…* — dodjelu bankine prijave članu odbora —
i rečenicu **„Waiting on the institution. Nothing here is yours to press."**
Ta rečenica je bila kvar: požurnica je jedino što **jeste** odborovo kad je
posao bankin.

- `Press` u zapisu (`step, kind, by, at, reason`), dodaje se, ne mijenja.
- `POST /api/incidents/:id/press` — smije li se korak požuriti čita se **iz
  prolaza**, unutar transakcije, i predaje servisu. Jedan odgovor na *je li
  otvoren i čiji je*, ne druga kopija u ruti.
- *Eskaliraj* je predsjednikovo i odbija se na koraku koji niko nije požurio
  (eskalirati što se nikad nije tražilo nije eskalacija) i drugi put.
- Korak nosi **svoje** dane, ne predmetove: 33 otkad je odbor odobrio, a ne
  47 od prijave — u kojih 13 je odborovo vlastito vijećanje.
- Ništa se ne šalje. Majlis sastavlja, ne šalje, kao i kod kalendara.

Tri kvara nađena tek hodanjem: kontrola se crtala samo na *sljedećem* koraku,
pa je pročišćavanje — otvoreno, 41 280 duga — nudilo ništa; citat ispod
*eskalirano* bio je iz požurnice, ne iz eskalacije; a gašenje rečenice po
koraku umjesto po kontroli ostavilo je promatrača s praznom trakom i bez
ijedne rečenice.

- Pazi: `test/reading-is-quiet.test.ts` — nijedno čitanje ne smije pisati.
  Provjereno: prolazi.

### 4.4 · RED 5 + P5 — sam ili u sobi, konsenzus (IFSB-10) ✅ (30. 9. 2026)

**RED 5 — `25769d5`.** Predsjedavajući je dnevni red kucao u okvir, jednu
stavku po redu, napamet. Predmeti koji bi dobili sjednicu bili su oni kojih
se tog dana sjetio, a član koji je smatrao da se nešto ne može riješiti
pisanim putem nije imao gdje to reći u zapisu.

Gore od toga: **otipkani red je gubio vezu.** `AgendaItem` nosi `matterId`
otkad je napisan, ruta odbija onaj koji nije pred ovim odborom, a ekran svaku
takvu stavku crta kao vezu — a forma je od svakog reda pravila `{ item }` i
nikad `matterId`. Ta veza je radila u demo podacima i ni u čemu što je
aplikacija sama napravila. Nađeno pritiskom na *convene a meeting*.

- Traženje sobe je stav s razlogom, kao svaki drugi ovdje, i **ne saziva
  ništa** — predsjedavajući saziva. Razlog je obavezan: to je ono što ostatak
  odbora čita prije sjednice.
- Dodaje se, ne mijenja, pa se čita i zašto je nešto skinuto s reda. Svaki
  član se broji jednom koliko god puta promijenio mišljenje.
- Odborovi ljudi smiju. Ne veza s bankom — banka koja može stavljati tačke na
  odborov dnevni red određuje odborov posao. Savjetodavni član smije.
- Ništa nije unaprijed označeno; predmet koji je već na sazvanoj sjednici to
  kaže umjesto da ispadne s liste.

**P5 — `85552cb`.** Glasanje je pisalo *2 of 2 · Threshold met* i ispod toga
*Close the vote*, na odboru od pet gdje troje nije reklo ništa. Pisana presuda
je bila jednako slijepa: za, protiv, suzdržani, traženi i zabilježeni kvorum —
i nijedan način da se vidi da tri potpisnika nikad nisu odgovorila.

- Novo čitanje `services/consensus.ts`: **saglasnost** (svi rekli, svi za) ili
  **većina**. Ne odbija ništa — kvorum je odborov i fiksiran kad je pitanje
  postavljeno.
- **Šutnja nije protivljenje.** Zasebno stanje, i imenovano imenima, ne brojem:
  presuda kojoj se troje nije htjelo pridružiti i presuda koju troje nikad nije
  vidjelo nisu ista stvar.
- Odbor može dati rok do datuma. I on ne zaustavlja ništa; stavlja datum na
  namjeru, da *odlučeno drugi dan* i *odlučeno poslije dvije sedmice traženja*
  prestanu biti isti zapis.
- Presuda sad kaže **Decided by agreement** ili **Decided by majority**, s
  imenima onih koji nisu odgovorili.

Nađeno čitanjem izlaza: presuda je pisala *2 signatories recorded no position:
member-d, member-e* — ključevi iz konfiguracije u zapečaćenom dokumentu, jer je
crtač imena tražio među potpisima, a ko nije glasao nije ni u jednom potpisu.

I još dva na istom prolazu: ekran sjednica je crtao *Not accounted for:
member-a, member-b…* ispod istih sedam ljudi imenom (stražar za imena držao je
ručnu listu polja i to polje nije bilo u njoj — sad glasno trune); a
predsjedavajući koji je otkucao 14:00 dobio je obavijest za slanje koja piše
13:00 bez ijedne oznake zone.

### 4.5 · RED 6 + 7 — izmjena uvjeta otvara reviziju; lanac ✅ (30. 9. 2026)

**RED 6 — `cb8a704`** (prva polovica). Dokument je tražio
amandman koji nabraja šta je presuđeno po zamijenjenoj verziji. Mjerenje je
pokazalo da amandman ne postoji — i da ispod njega ne postoji ni ono na čemu
bi stajao.

**Ništa u aplikaciji nikad nije upisalo odluku u registar.** Registar je bio
sjeme i samo sjeme. Isti zaslon je, dvije kartice jednu od druge, govorio
obje stvari: *what we decided* je navodio restoration window kao **IN FORCE**,
a *in force today* je pisao **3 in force** i nije ga sadržavao. Odborova
vlastita odluka nije stizala do popisa onoga što stoji.

**I ništa nikad nije zamijenjeno.** `supersededBy` čita **pet** servisa —
godišnji izvještaj broji odluke na snazi po njemu, priručnik dijeli trenutne
od zamijenjenih, `review.ts`, `export.ts`, `dossier.ts` — a **nijedan ga ne
piše.** Dvije odluke iz sjemena tvrde da su v3 i v2 bez ijednog prethodnika.
Stranica registra piše, svojim riječima, *„the chain of what replaced what is
drawn, not implied"* — nad lancem kojeg nema. Svaka grana na toj zastavici
bila je nedostižna.

**Lanac je bio prekinut i na prvoj karici.** Oba ispitivanja iz sjemena
bilježe `ruleId: 'rule-pool-trading'` — *odluku kakva je stajala, da kasnija
verzija ne može promijeniti šta je testirano* — a te odluke nije bilo nigdje.
Njen hash parametara bio je prazan niz, pa je jedina odluka koju je ovaj
odbor stvarno donio u vlastitom pisanom dokumentu prijavljivala svoje uvjete
kao **neprovjerene**.

- Predmet može reći koju odluku mijenja (`PUT /matters/:id/amends`),
  **fiksirano čim glasanje krene** — šta odluka zamjenjuje je dio onoga o
  čemu se glasa, ne bilješka uz njega.
- Kad prođe, nova verzija se upisuje jedan iznad zamijenjene, **oba kraja
  lanca** se postave (`supersedes` i `supersededBy`), i pred odbor se stavlja
  sve što je počivalo na staroj (`GET /rules/:id/rested-on`).
- **Računa; ne zaključuje** — ispitivanje po zamijenjenim uvjetima prijavljeno
  je kao upravo to. Treba li ga ponoviti je odborovo, i za to nema polja.
- **Oba vrata, ili nijedna.** Zabrana je odluka čim glasanje zatvori; dozvola
  tek kad istekne vremenska brava. Registar pisan s jednih držao bi svaku
  dozvolu i nijednu zabranu. Upis nikad ne obara sam čin.

Četiri kvara nađena tek zamjenom odluke i čitanjem stranice: crtao je ključ
umjesto naslova (*Replaced by rule-matter-20260930173714-sex2hi*); zaglavlje
je i dalje pisalo *version 3 · in force* dok je odjeljak ispod pisao *replaced
by*; uz činjenice je stajalo *no review scheduled*; a uz činove *„This stands.
Nothing is waiting on the board."* — rečenica istinita za svaki zapis koji je
dotad mogao postojati.

Prošao sam cijeli put uživo — otvaranje, rasprava, glasanje, zatvaranje — i
registar je vratio `version: 4, supersedes: rule-tangible-ratio`. Osam
stražara razbijeno namjerno; jedan je prolazio s obrisanim pravilom jer
životni ciklus odbije drugo zatvaranje **prije** registra, pa nikad nije ni
stigao do onoga što mjeri — prebačen je na izravno čitanje.

**RED 7 — `9e5f0cd`** (druga polovica). Linija zbog koje ova aplikacija
postoji je lanac: odbor presudi, presuda postavi uvjet, uvjet je nešto što
banka mora raditi, bankina vlastita revizija pogleda je li radila, i odbor
pročita šta je nađeno. Odluke su bile na jednom ekranu, registar na drugom,
ispitivanja na trećem. Ispitivanja su djelovala nakalemljeno jer je lanac
među njima bio presječen.

Otvori presudu o bazenu prije ovoga. Odgovara na šest pitanja — šta je
odlučeno, kako se mjeri, mijenja li se, kad se provjerava, šta ako padne, ko
se obavijesti. Sve mehanika, sve tačno, i **nijedna riječ o tome da jeste
pala**: tri prijenosa izvršena na 50,4% u junu, nađena ispitivanjem, u zapisu,
i nevidljiva na stranici pravila koje su prekršili. Ispod toga je pisalo
*„This stands. Nothing is waiting on the board."*

- Presuda sad nosi sve što traži — uvjete po kojima ju je odbor prosuđivao i
  operativne stavke koje je postavio — uz **ono što banka mora predočiti** za
  svaki (dokument, redoslijed, broj, obavezu) i uz ono što su ispitivanja
  našla (`GET /rules/:id/chain`, `services/the-chain.ts`).
- **Broji; ne zaključuje.** Nema prošao, pao, ocjene ni semafora. Izuzeci se
  broje i nose ispitivačeve riječi; šta znače je odborovo.
- **Vrijedna polovica je šutnja.** Šest od osam stvari koje presuda o bazenu
  traži **nikad niko nije ispitao**, i svaka je red s ničim u sebi umjesto
  reda kojeg nema. Red koji se tiho ne crta čita se kao red koji je u redu.

**I nalaz se nije mogao pročitati odborovim riječima.** Nalaz nosi ono protiv
čega je zapisan — id uvjeta, ili `term:<key>` — i **dva čitača su se
razilazila oko prefiksa.** Onaj koji od toga pravi rečenicu tražio je stavku
*bez* prefiksa; onaj koji računa šta nije ispitano tražio ju je *s* njim. Ni
jedno ispitivanje nije moglo biti tačno u oba. Oba oblika su bila u proizvodu
istovremeno: ona iz sjemena su ispisala rečenicu pa su **ista dva pojma o
kojima su upravo prijavila nalaz** navela kao *not examined*; a ona koja
aplikacija zapisuje broje tačno i ispisuju `minTangibleRatioBps` tamo gdje
stoji odborova vlastita rečenica. Nađeno zapisivanjem jednog kroz aplikaciju i
čitanjem pored onog iz sjemena, dvije kartice na istom ekranu. Sad je jedan
čitač, i sjeme je prešlo u oblik koji ruta jedina i prihvata.

Još tri s istog prolaza: ispitivanja iz sjemena nosila su prazan hash stavki,
pa je **svako ispitivanje u proizvodu** prijavljivalo sebe kao dokaz o uvjetima
koje je odbor otad izmijenio — na odboru koji nikad ništa nije izmijenio; ekran
ispitivanja crtao je samo nalaze s izuzecima, pa je ispitivanje 366 od 366
transakcija gdje je omjer držao **pokazivalo nijedan nalaz**; a nalaz od tačno
jednog pisao je *1 exceptions* — jedino brojanje u aplikaciji bez jednine.

### 4.6 · P4 + P6 — trijaža u redu i obavijesti ✅ (1.–2. 10. 2026)

**P4a — `7ca09f3`.** Red se može uzeti bez otvaranja: jedan pritisak po redu
(*uzmi* / *vrati odboru*, a predsjedavajućem i tajniku i ono što kolega drži),
`t` s tastature na redu na kojem stojiš. Pravilo je panelovo, čita ga jedna
funkcija (`lib/holding.ts`) — i to je odmah uhvatilo neslaganje: napisano kao
*slobodno ili moje*, red je predsjedavajućem nudio ništa nad poslom u kolegovim
rukama dok je panel uz isti taj posao nudio *vrati*.

Tri kvara nađena pritiskom, ne testom: veza preko reda rastegnuta je preko
cijelog reda pa je dugme u ćeliji **ispod nje i ne može se pritisnuti**; devet
dugmadi *Take it* čitaču ekrana daje devet puta iste dvije riječi; i na
telefonu je čin prvo sjekao svaki naslov, pa — premješten ispod — sjekao sam
čin (*Take i… · Board Member A*). Čin na telefonu ima vlastiti red.

**P4b — `0fa6b0c`.** *Podsjeti me* je stavljeno vlasniku i odbijeno u obliku
privatne odgode: u zapisu čije je pravilo da je napisano odborovo i trajno,
član bi inače mogao nešto gurnuti van vida i niko ne bi znao da je gurnuto. Pa
nosi ime, dan i razlog, i **ne mijenja ništa o tome šta čeka** — brojka i dalje
piše *13 waiting · 2 past its date*. Ostali činovi reda su u prozoru koji
otvara desni klik, tipka Menu i dugi pritisak; dugi pritisak koji se pomakne je
listanje. Prevlačenja nema — vlasnik je tako odlučio.

**P6 — `c1e6d66`.** Sažetak *9 stvari čeka tebe* s vezom na tačan korak,
*dodijeljeno tebi*, i sjednica u kalendaru s alarmom 24 h prije.

Rupa se nije dala zatvoriti tamo gdje je pravilo stajalo. **Čije je nešto
odlučivalo se u pregledniku**, u jednoj komponenti, pa ništa na serveru nije
moglo odgovoriti na pitanje oko kojeg je cijela aplikacija složena — i svako
drugo mjesto kojem treba odgovor izvelo bi ga drugi put i razišlo se prvi put
kad se jedno promijeni. `services/yours.ts` je to pravilo, jednom; red nosi
odgovor, ekran ga čita.

Sažetak nosi broj, vrstu, sat i adresu — **nijedan naslov**, jer je naslov
bankina pozicija a poruka ide kroz bankin mail, i **ništa o tome ko šta drži**,
jer odbor čije se članove može obilaziti jednog po jednog nije nezavisan onako
kako banka plaća. GET sastavlja i ne šalje; POST šalje, onome ko traži i nikom
drugom. Što je član odložio izlazi iz **njegovog** sažetka i ostaje u svačijem
drugom, i u brojci.

**Sjednice nije bilo u kalendaru.** Feed je nosio *odbor se mora sastati do
20. februara* — rok četiri mjeseca daleko — a sjednica sazvana za 15. ovog
mjeseca nije postojala nigdje osim kao rečenica u bilješci tog roka. Sad je
sastanak, s pravim satom i s alarmom na članovom uređaju: ova aplikacija nema
vlastiti sat, pa bi podsjetnik koji obeća poslati bio obećanje koje ne može
održati.

Osamnaest mjera, svaka slomljena namjerno da se vidi kako pada. Što su
uhvatile, a zeleni paket nije: `compose()` je propadao u glasanje, pa bi nova
vrsta obavijesti bez svoje grane bila poslana kao obavijest o glasanju o
nepostojećem predmetu — sastavljena, isporučena i pogrešna, bez ijednog pada;
*a ruling due to come back — 0 days*, tri puta, ujutro kad su tri dospjela;
*Review was due 1 days ago* sutradan; *It concerns 1 members*; mjera za
držaoca nije gledala ništa, jer dodjela stavlja ime na sljedeći korak pa red
izlazi sa svačije tuđe liste i sažetak koji je skenirala nije ni imao držanog
reda; i mjera koja je tvrdila da je svako posijano pravilo *unscheduled*
pukla je jednog jutra bez ijedne izmjene, jer je čitala kalendar koliko i kod.

### 4.7 · P7 + RED 9/10/12 — manje krom, Apple pravila
§3 C, D, E, F; polica alata u ⌘K; jedna naglašena boja; veliki naslov koji se
skupi u traku; ploče odozdo s hvataljkom.

### 4.8 · P9 + RED 11 — AI na koraku, kao nacrt
Na uvjetu *nađeno / nejasno / nema* s navedenom rečenicom; označeno kao
nacrt; nikad presuda ni glas. Tabela mjesta u RED §11.

### 4.9 · P10 + P11 + P12
RTL prolaz kroz svaki ekran na 390 px; hidžretski datum; PWA (`manifest.json`
ne postoji) i čitanje bez mreže; prazna stanja koja kažu sljedeći čin; vođeni
*prvi predmet*.

### 4.10 · Završno
Ažurirati RED/PRIJEDLOZI/ovu stranicu, snimke u priručniku; **CI lokalno u
čistom worktreeju** (Node 20 i 22, `npm ci`, svi testovi, build s budžetom);
onda **pitati vlasnika** za push na `main`.

---

## 5 · Probni server i provjera uživo (recept)

Probne skripte **nisu u repou** (pravilo) — bile su u scratchpadu ovog
okruženja i nestaju s njim. Ovo je dovoljno da se naprave ponovo.

1. **Članovi.** Linija po članu, `id:uloga[+ured]:hash`:
   ```
   cd apps/majlis
   npm run member -w server -- member-a signatory      # pita lozinku bez ispisa
   ```
   Korišteno: `member-a` (signatory+chair), `member-b`…`member-e`
   (signatory), `advisor-1` (advisory), `liaison-1` (liaison),
   `desk-treasury` (institution), svi s istom probnom lozinkom. Za predsjednika
   ručno dopisati `+chair` iza uloge. Sve linije u jednu datoteku izvan repoa.
2. **Server** (port 4000 je vlasnikov — nikad):
   ```
   cd apps/majlis/server
   PORT=4105 MAJLIS_FILES=<dir izvan repoa> MAJLIS_MEMBERS="$(cat <datoteka>)" npx tsx src/index.ts
   ```
   Bez `MAJLIS_DB` radi u memoriji s demo podacima — svako pokretanje je
   čist početak (važno: nalaz, glas, preuzimanje se mogu ponoviti).
3. **Klijent**:
   ```
   cd apps/majlis/client && npm run build
   MAJLIS_API=http://localhost:4105 MAJLIS_AS=member-a:<lozinka> npx vite preview --port 5191 --strictPort
   ```
   Drugi član u drugom prozoru: isto na 5190 s `MAJLIS_AS=member-b:…`.
   Poslije svake izmjene klijenta **ponovo `npm run build`** (preview služi
   `dist`; stari `dist` je jednom testirao stari kod).
4. **Preglednik:** Playwright s Chromiumom
   (`executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome'` u
   oblaku; na desktopu lokalni). Viewport 390×844 i 1440×900, jezik kroz
   `localStorage.setItem('majlis.lang', 'ar'|'ur')`.
5. **Šta su skripte provjeravale** (napraviti ponovo po potrebi):
   - *tour* — svaki ekran u en/ar/ur na 390/1024/1440: nema bočnog skrola,
     najmanji tekst ≥ 12 px, nema grešaka u konzoli.
   - *look-bar* — na telefonu `main [role=toolbar]` roditelj: dno trake =
     vrh `nav` s `position: fixed`.
   - *walk-acts / walk-heard* — pitanje `submission-2026-08-25` preuzeti
     (polje *The question as the board puts it* + tekstualno polje) → veza
     *Open the matter* vodi na novi predmet; prekršaj `incident-2026-09-06`
     *Record: this is a breach* → *Your view is on the record*, traka *You said
     this is a breach* + *Change my view*; obaveza
     `undertaking-2026-08-20-a` → *With Board Member B* + *Say what happened*;
     red → *Suspension of leveraged…* (`matter-2026-08-11`, member-a glasao)
     nije pod *Yours*, jeste pod *Everyone*.
   - *walk-split / look-back / look-keys* — stupac lijevo, `j`/`k`, nazad
     vraća skrol, red zasvijetli.

---

## 6 · Pravila koja vrijede uvijek

- Commitovi su `AbZe628 <abdusamedzelic98@gmail.com>`. **Nigdje nikakav trag
  AI-ja** — ni u commit poruci, ni u PR opisu, ni u kodu. Bez
  `Co-Authored-By`, bez *Generated with*.
- **Pitaj prije svakog pusha.** Na `main` samo s izričitim odobrenjem.
- `vite.probe*.mjs` i probne skripte se nikad ne commitaju.
- Port 4000 je vlasnikov; koristi 4105 i 5190/5191 (ili 5177/5178).
- **Testovi nisu dokaz.** Uvijek proći kroz aplikaciju uživo, klikati. Kad
  napišeš stražu, ubaci stvarni kvar i gledaj da padne.
- Ne popravljaj jednu sitnicu i ne zovi to odgovorom na strukturnu kritiku.
- Aplikacija, ne web stranica sa dugmadima — radno, Apple stil.
- Lokalne datoteke (ključevi, CDP vozač, probne skripte) na desktopu su u
  `work/majlis-local/`, izvan repoa.
- Govori hrvatski.

---

## Arhiva — prethodna predaja (prije ove sesije)

Ostavljeno doslovno, da se ništa ne izgubi. Dio je zastario: *nije pushano*
se odnosi na staro stanje; `MatterPack` i `/classic` više ne postoje;
`/questions#id` je sada `/questions/:id`.

### 1 · Šta je gotovo

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

### 2 · Tačka 2, dodjela — šta je urađeno i šta je nađeno

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

### 3 · Savjeti — ono što bih rekao da me pitaš

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

### 4 · Pravila koja vrijede uvijek

- Commitovi su `AbZe628 <abdusamedzelic98@gmail.com>`. **Nigdje nikakav trag
  AI-ja** — ni u commitu, ni u PR-u, ni u kodu.
- **Pitaj prije svakog pusha na GitHub.**
- `vite.probe*.mjs` se nikad ne commitaju.
- Port 4000 je vlasnikov; koristi 4105/5177.
- Lokalne datoteke (ključevi, CDP vozač, probne skripte) su u
  `work/majlis-local/`, izvan repoa.
- Govori hrvatski.
