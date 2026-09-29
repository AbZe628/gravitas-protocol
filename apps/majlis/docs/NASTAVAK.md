# Nastavak — gdje smo stali, i šta dalje

Ovo je ulazna stranica za sljedeću sesiju. Pročitaj je cijelu prije prvog
reda koda. Red posla je u [RED.md](RED.md), prijedlozi u
[PRIJEDLOZI-UI.md](PRIJEDLOZI-UI.md). Ovdje je stanje, ono što se ne vidi iz
koda, i svaki sljedeći korak.

**Zadnje stanje (29. 9. 2026):** sve je na **radnoj grani** — onoj na kojoj
je ova stranica — pet commitova iznad `origin/main` (`692022e`). **Na
`main` nije ništa pushano** — to je vlasnikova odluka.

| commit | šta |
|---|---|
| `ef8df0b` | P1 — brzina: ekrani i jezici stižu kad zatrebaju, čin se crta prije odgovora servera |
| `22c10a8` | P2 — čitljivost: ljestvica za telefon, kontrast, sistemski font, bez Google fontova |
| `cb1751f` | P0 — lista ostaje pored otvorenog; nijedan čin nije podvučena riječ |
| `efe47fd` | P3 — jedan radni prozor za svaku vrstu posla; korak zna ko je već rekao svoje |
| (ovaj) | ova stranica, RED i PRIJEDLOZI ažurirani |

Zadnje mjerenje: klijent **527/527** testova (62 datoteke), server
**1994/1994** (94 datoteke), `tsc -b` čist na obje strane, početni paket
**149,6 kB** gzip od dozvoljenih 165 kB.

---

## 0 · Prvih petnaest minuta sutra

1. **Grana.** Radna grana je ona koja nosi commit `efe47fd`:
   ```
   git fetch origin
   git branch -r --contains efe47fd     # ime radne grane
   git checkout <to ime>
   git log --oneline -6                 # vrh: commit s ovom stranicom, ispod efe47fd
   ```
2. **Zavisnosti i testovi** (Node 20 ili 22):
   ```
   cd apps/majlis
   npm ci
   (cd server && npx vitest run)     # 1994
   (cd client && npx vitest run)     # 527
   (cd client && npx tsc -b) && (cd server && npx tsc --noEmit -p .)
   (cd client && npm run build)      # budžet: pada iznad 165 kB
   ```
   Ako brojevi nisu isti — stani i nađi zašto prije bilo čega drugog.
3. **Probni server i preglednik** — vidi §5. Bez toga se ne radi ništa
   vizualno: *testovi nisu dokaz*.
4. **Prvi posao** je §3, stavka A (odobravanje plana na prekršaju) — isti kvar
   koji je jučer popravljen za nalaz, na drugom mjestu, nađen čitanjem koda i
   ostavljen jer je sesija stala.

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

### 4.3 · RED 3 + 4 — sat stvara posao; požurnica i eskalacija
- Danas `sweep.ts` samo obara/uvodi odluke; dospjela revizija se izračuna pri
  čitanju i ne padne nikome u red. Treba: kad rok istekne ili revizija
  dospije, nastane stavka koja nekome pripada (kroz prolaz, ne ručna tablica).
- *Kod institucije* 44 dana i ništa: dodati čin *požuri* (zapis da je
  požureno, ko i kad), a poslije N dana *eskaliraj predsjedniku*. Sve kroz
  prolaz, s `why`.
- Pazi: `test/reading-is-quiet.test.ts` — nijedno čitanje ne smije pisati.

### 4.4 · RED 5 + P5 — sam ili u sobi, konsenzus (IFSB-10)
- Svaka stvar se može označiti *treba sobu* → dnevni red sjednice se sam složi.
- Glasanje prvo pokazuje konsenzus (*4 od 5 saglasna, jedan nije odgovorio* —
  `heard`/`waitingOn` već postoje), odbor postavlja razuman rok, poslije
  kojeg većina; zapis kaže da je odluka većinska jer konsenzusa nije bilo.

### 4.5 · RED 6 + 7 — izmjena uvjeta otvara reviziju; lanac
- Amandman: nabrojati sve presuđeno po zamijenjenoj verziji i to staviti
  pred odbor (čista logika).
- Lanac odluka → uvjet → obaveza banke → dokaz → odbor vidi; spojiti registar
  i ispitivanja na odluke.

### 4.6 · P4 + P6 — trijaža u redu i obavijesti
- Činovi na samom redu (uzmi / daj, `t` = uzmi), meni na desni klik,
  prevlačenje na telefonu. *Podsjeti me* — nova vrsta zapisa, **pitati
  vlasnika** prije.
- Obavijesti: sažetak *3 stvari čekaju tebe* s vezom na tačan korak;
  podsjetnik 24 h prije sjednice; *dodijeljeno tebi*. Povjerljivost: ništa
  bankino, ništa o tome ko drži šta (`visibleTo`).

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
