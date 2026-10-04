# Red — što se radi, kojim redom, i što je od toga gotovo

Ovo je jedan popis. Sve što je nađeno u auditu sučelja i sve što je nađeno u
auditu logike rada stoji ovdje, u dogovorenom redu. Ništa se ne planira po
ekranima — planira se po obećanjima.

Oznake: ✅ gotovo · ◐ u radu · ⬜ nije počelo

**Stanje 29. 9. 2026** (radna grana s commitom `efe47fd`, nije na `main`):
P1, P2, P0 i P3 iz [PRIJEDLOZI-UI.md](PRIJEDLOZI-UI.md) su gotovi — tačka 8
(radni prozor) i T1–T4 iz tačke 9 time zatvoreni. Detalji, nađeni kvarovi i
svaki sljedeći korak: [NASTAVAK.md](NASTAVAK.md).

---

## Nalaz koji sve drži

Gramatika posla **postoji i dobra je**: `server/src/services/passage.ts`. Korak
nosi čin, čije je, u kojem je stanju, što stoji na putu, odbija li se to
zaista ili je samo običaj, i zašto korak postoji. Predmet ima oblikovanje kao
**skup** — jer se radi kojim redom posao ide — i odlučivanje kao **niz**, jer
svaki korak stvarno čeka prethodni. Ništa se ne pohranjuje i ništa se ne
štiklira rukom: korak je gotov kad je stvar u zapisu, i prestaje biti gotov ako
se povuče. I odbija reći da je predmet spreman za glasanje, jer je to presuda.

**Problem nije da logike nema. Logika postoji u četiri izvedbe, na četiri
kvaliteta, a najbolja je iskorištena jednom.**

Sve ostalo — da svaki ekran izgleda drugačije, da te ništa ne nosi, da je to
skup stranica a ne aplikacija — izlazi iz te jedne činjenice. Kad gramatika
bude jedna, svaki ekran se sam od sebe počne ponašati isto.

---

## 0 · Zatvoreno prije ovog reda

- ✅ **O4** — tablica se nije slagala na telefonu: inline `style` sa širinama
  nadjačavao je `grid-cols-1`, šest stupaca u 390 px. Red 250 → 73 px, prvi red
  registra 790 → 301 px. *(commit `9266000`)*
- ✅ **L3** — `whatToDoNow` je bio druga vlast nad pitanjem „što sad". Računao
  je sljedeći čin na klijentu, po slučajevima, i govorio *Glasanje se može
  otvoriti* — presudu koju server izričito odbija izreći. Obrisan; `MatterPack`
  čita `passage` sa servera.
- ✅ **L5** — činovi i objašnjenja bili su engleske niske na serveru, van
  prijevoda, pa su stupac SLJEDEĆE, zvono i obavijesti bili engleski i na
  arapskoj i na urdu instalaciji. Sada su ključevi; 62 rečenice u tri jezika.
- ✅ usput — `passage.ts` je govorio *otvori glasanje* i kad ruta vraća 400 jer
  uvjeti nisu odgovoreni. Dvije vlasti, i glasnija je bila ona koja nije
  pročitala pravila.
- ✅ **L2** — `MatterPack` čita passage, ali crta **jedan** korak. Cijeli spisak
  od trinaest koraka i dalje postoji samo u `Passage.tsx`, koju koristi jedino
  `/classic/matters/:id`. *(Zatvoreno u `efe47fd`: jedan ekran predmeta,
  `MatterPack`, `MatterDetail` i `Passage.tsx` obrisani, stare adrese
  preusmjeravaju.)*

---

## 1 · Gramatika se proširi sa predmeta na sve vrste ✅

Najveći posao i jedini koji mijenja logiku a ne izgled. Radi se prvi jer briše
ručnu izvedbu na ekranu prekršaja i time odmah dokaže da gramatika drži i za
nešto što nije predmet.

- ✅ **L4** — `queue.ts` tvrdi da ništa ne računa sam, a računa: `BREACH_NEXT` je
  ručna tablica od šest faza, u samom `queue.ts`. Za pitanje, obavezu i reviziju
  čin je upisan doslovno. Jedino predmet zove `buildPassage`.
- ✅ **L6** — ekran prekršaja piše gramatiku **treći put**, rukom u komponenti,
  devet koraka, sa `current: i.stage === 'reported'` — i drugačijim riječima za
  iste činove nego `BREACH_NEXT`.
- ✅ **L7** — prekršaj, pitanje, obaveza i revizija čitaju istu gramatiku. Ostaje
  samo **stavka registra**, koja nema svoj tok nego je ulaz u lanac iz tačke 7.
- ✅ **L2** (ostatak) — puni spisak koraka dolazi na živi ekran.

## 2 · Dodjela — korak pripada čovjeku, ne samo ulozi ◐

- ◐ **L8** — `whose` je uvijek uloga: odbor, potpisnik, institucija. Nikad čovjek.
  Nema dodjele, nema preuzimanja, nema predaje. Zato filter „ono što tebe čeka"
  mora **pogađati iz uloge** umjesto da pročita. Predsjednik ne može dati članu
  predmet da ga pripremi — a to je prva stvar koju predsjednik radi.
  - ✅ server: zapis dodjela, jedna ruta za četiri čina, `holder`/`holdable` na
    prolazu, red nosi `who` i `holder` za svih pet vrsta
  - ✅ predmet (`MatterFlow`, bočna ploča) i prekršaj: *uzmi / predaj / vrati
    sobi*, uživo provjereno na 390 i 1440 px, s dva člana u dva prozora
  - ✅ red: ime umjesto `member-a`; *moje* čita držaoca
  - ✅ čin na samom redu, bez otvaranja: jedan pritisak (*uzmi* / *vrati
    odboru*, a predsjedavajućem i tajniku i ono što kolega drži), `t` s
    tastature; ostali činovi u prozoru na desni klik, Menu i dugi pritisak *(`7ca09f3`, `0fa6b0c`)*
  - ✅ **čije je nešto više se ne pogađa ni u pregledniku**: pravilo je jednom,
    na serveru (`services/yours.ts`), red nosi `yours`, ekran ga čita — prije
    ovog ništa izvan otvorene liste nije moglo odgovoriti na pitanje oko kojeg
    je aplikacija složena *(`c1e6d66`)*
  - ✅ imena umjesto id-a na sva 24 mjesta (gornja traka, avatar, rasprava,
    glasovi, sjednice, prekršaj…); `whoName` koji je nosio id preimenovan u `who`
  - ✅ pitanje i revizija: kontrola na kartici pitanja i na stranici odluke;
    red otvara tačno pitanje i tačnu odluku
  - — obaveza namjerno bez kontrole: ime onoga ko je obećao pobjeđuje dodjelu
  - ✅ bankin desk ne vidi ko u odboru drži šta (`visibleTo`), ni tuđa pitanja
  - ✅ desk dobija samo red svojih pitanja; zvono deska ne čita red odbora
  - ⬜ dodjela **jednog koraka** (ne cijele stvari) postoji na serveru, nema je u
    sučelju (`stepKey` u `routes/assignments.ts`)
  - ✅ korak koji svako radi za sebe (glasanje, nalaz) nosi `heard`/`waitingOn`;
    glas koji si dao više nije *tvoj* u redu; prozor u rukama kolege kaže čiji
    je umjesto da nudi čin *(`efe47fd`)*
  - ⬜ isto za **odobravanje plana** na prekršaju — nudi *Endorse* onome ko je
    već odobrio i crta id-jeve (NASTAVAK §3 A)
  - ⬜ arapski i urdu za `hold.*` — moji, nepregledani

## 3 · Sat stvara posao ◐

- **L9** — `sweep.ts` radi ono što radi: obara neratificirano ograničenje, uvodi
  odluku u snagu. Ali dospjela revizija se **izračuna pri čitanju** — ništa ne
  nastane i ne padne nikome u red. Zato „automatizirano" ne može postojati:
  sistem nikad ne pokreće, samo izvještava. Isto za rok koji ističe i prag koji
  je probijen.
- ✅ **L11** — odluka bez intervala revizije: `reviewStatus` to već imenuje
  riječima „ništa je neće vratiti pred odbor", i tu stane. Nije sat koji radi
  krivo, nego sat kojeg nema.
- ◐ **ono što se izračuna sad barem izlazi van.** Sažetak *9 stvari čeka tebe*
  s vezom na tačan korak, i *dodijeljeno tebi* kad posao stave kod tebe:
  sastavljeni uvijek, poslani gdje je kanal spojen, i ekran kaže koje od toga
  *(`c1e6d66`)*. Sat i dalje nije naš — GET sastavlja i ne šalje, a što ih
  nosi samo od sebe je raspoređivač izvan ovog procesa koji zove istu rutu.
- ✅ sjednica koju je predsjedavajući sazvao sad je u kalendaru kao sastanak, sa
  svojim satom i s alarmom 24 h prije na članovom uređaju. Feed je do sad nosio
  samo rok *do 20. februara*, a sjednicu za 15. ovog mjeseca nigdje osim kao
  rečenicu u bilješci tog roka *(`c1e6d66`)*.

## 4 · Požurnica i eskalacija umjesto slijepe ulice ⬜

- **L13** — piše „kod institucije" i tu stane. Nema požurnice, nema zapisa da je
  požureno, nema eskalacije predsjedniku. Četrdeset četiri dana stoji broj i
  ništa se ne nudi.

## 5 · Sam ili u sobi ⬜

- **L12** — odbor radi **između** sjednica i **na** sjednicama. Između —
  pojedinci čitaju i odgovaraju. Na sjednici — rješava se ono što pojedinačno
  nije moglo. To je središnja podjela u radu odbora i u Majlisu je nema.
  Posljedica: dnevni red se kuca rukom umjesto da bude ono što se nakupilo kao
  „ovo traži sobu".

## 6 · Izmjena uvjeta otvara reviziju presuđenog ✅

*Zatvoreno u `cb8a704`. Odluka koja stupi na snagu ulazi u registar, može
zamijeniti postojeću, i pred odbor se stavlja sve što je počivalo na
zamijenjenoj verziji (`services/ruling-register.ts`, `GET
/rules/:id/rested-on`). Prije toga ništa u aplikaciji nikad nije upisalo
odluku u registar, i ništa nikad nije bilo zamijenjeno.*

- **L10** — amandman ispravno nadomješta i čuva staru verziju, ali odbor se ne
  obavijesti što je sve presuđeno po verziji koju je upravo zamijenio. To je
  stvarna noćna mora odbora — *što smo sve presudili po pravilu koje smo jučer
  promijenili* — i to je čista logika, nula sučelja.

## 7 · Lanac odluka → uvjet → obaveza → dokaz ✅

*Zatvoreno u `9e5f0cd`. Presuda nosi svaki uvjet i svaku stavku, ono što banka
mora predočiti za svaki, i šta su ispitivanja našla — uključujući koliko ih
nikad niko nije ispitao (`services/the-chain.ts`, `GET /rules/:id/chain`).
Usput: nalaz protiv stavke nije se mogao pročitati odborovim riječima ni u
jednom obliku, jer su se dva čitača razilazila oko `term:` prefiksa.*

- **L14** — trebalo bi: odluka → uvjet → stvar koju banka mora raditi → dokaz da
  radi → odbor to vidi. Sada su odluke ovdje, registar tamo, ispitivanja treće
  mjesto. Zato ispitivanja djeluju nakalemljeno — jer jesu, lanac je prekinut na
  dva mjesta.

## 8 · Radni prozor kao jedini oblik predmeta ✅

*Zatvoreno u `cb1751f` (lista pored rada) i `efe47fd` (`WorkWindow` za
prekršaj, pitanje, obavezu i reviziju; predmet jedan ekran). Ostaje: prolaz
na 390 px za današnje izmjene, i *na koga glasanje čeka* na ekranu predmeta
(NASTAVAK §3 B, H). Stavka registra i dalje nema svoj tok (tačka 7).*

- **Aplikacija je građena oko imenica, a ne oko posla.** Šesnaest
  ekrana-imenica: pitanja, predmeti, odluke, registar, biblioteka, provjera
  ugovora, računi, kalendar, sjednice, obaveze, prekršaji, sažeci, ispitivanja,
  zapis, pretraga, asistent. Član se kreće po imenicama i sam sklapa posao u
  glavi. Ali posao nije imenica — pitanje, predmet, prekršaj, obaveza i
  nadolazeća revizija su **isto**: predmet u fazi, sa sljedećim korakom i
  vlasnikom. Red na `/` to već zna; sve ostalo ih ponovo razdvaja.
- **Radni prozor postoji jednom u cijeloj aplikaciji.** `StepWindow` — koraci,
  radno okno, bočna ploča — koristi jedan ekran, `MatterFlow`. Od trideset šest
  adresa. Pitanje nema radni prozor; prekršaj ima devet koraka ali je svaki red
  u popisu sa dugmetom; revizija nema ništa osim datuma koji istekne; obaveza
  ima jedan red i dugme; stavka registra nema ništa.
- **Jedan prozor za svaki predmet**, koje god vrste: faze preko vrha sa upaljenom
  trenutnom, rad trenutnog koraka u sredini, ono što treba pri ruci sa strane
  (dokument, uvjeti, tko je što rekao, račun), i čin dolje na istom mjestu
  uvijek.
- **Poslije čina — sljedeći korak, nikad povratak na popis.**

## 9 · Telefon ◐

*T1–T4 zatvoreni u `22c10a8`. Traka činova na telefonu stoji na tabovima
(`efe47fd`). **O1, O2, baner jezika i urdu tabovi zatvoreni u `ac6fca6`** —
mjere i brojevi su u NASTAVAK §4.7. Ostaje traka činova u dva reda (§3 F,
namjerno) i visina reda na telefonu — 128 px, 3,8 reda po ekranu od 14.*

Ide poslije prozora, ne prije. Znači da telefon ostaje ružan još neko vrijeme —
ispravno, jer se svaka od ovih mjera mjeri na ekranu koji će se ionako
prepraviti kad prozor postane jedan.

- **T1** — ljestvica: label 10 px, note 11,5, ui 12,5, body 13,5, lead 15. U 121
  datoteci i 1 261 upotrebi, a veličina se mijenja po širini ekrana na **9
  mjesta ukupno**. Telefon dobiva ljestvicu stola nepromijenjenu. Treba
  17 / 15 / 13, ništa ispod 11.
- **T2** — `muted` #9C9284 na bijelom ≈ 3,0:1; `faint` #B3A896 ≈ 2,3:1. Standard
  traži 4,5:1 ispod 18 px. 777 upotreba.
- **T3** — spojeno: drugi red popisa je 11,5 px na 3:1, a vrsta iznad naslova
  10 px VELIKIM SLOVIMA sa razmakom 0,14em. To je ukras, ne tekst.
- **T4** — naslov reda je serif (Newsreader) na 15 px — tipografija članka na
  radnoj listi.
- ✅ **O1** — bile su dvije trake prikovane na vrh, 112 px okvira na svakoj
  liniji koju član čita. Red grupe je sad unutar okna koje se skrola, pa
  ostaje jedna. Prvi pokušaj — skinuti `sticky` — nije promijenio ništa, jer
  je red bio izvan `main`; vidjelo se samo mjerenjem *(`ac6fca6`)*.
- ✅ **O2** — četiri okrugla dugmeta = 176 od 375 px, zato je ime odbora pisalo
  *Demonst…*. Pretraga je bila na dva mjesta i otišla je s trake u red grupe,
  gdje je rail ionako drži; računari na kraj istog reda. Ostaju dva koja ne
  pripadaju nijednom ekranu *(`ac6fca6`)*.
- ✅ ime ekrana je bilo rečeno tri puta odjednom — u redu grupe, u 30 px ispod
  njega, i u traci na dnu. Gdje red već kaže istu riječ, naslov ostaje u
  dokumentu i prestaje trošiti 65 px *(`ac6fca6`)*.
- ✅ baner o prijevodu 329 px → 64 px, sklopiv i zapamćen po jeziku; traka na
  dnu 94 px → 72 px na urduu *(`ac6fca6`)*.
- Red na telefonu: jedna linija, jedan broj, chevron. Čin kao dugme pune širine
  iznad kartica.

## 10 · Stol ✅

*U `cb1751f`: jezik je skinut s trake (bira se na stranici člana), paleta i
član su sažeti ispod 1280 px, traka (rail) ustupa mjesto stupcu liste.*

- ✅ **O3** — polica računa je jela **100 px od 1622**, trajno, i naslovi u redu
  su bili rezani da bi stala. Skinuta: paleta imenuje svih sedam prije nego
  išta otkucaš i otvara se pritiskom, telefon ima dugme na kraju reda grupe, a
  korak otvara onaj koji mu treba. Posao je dobio 1262 → 1362 px *(`26fa437`)*.

## 11 · AI tamo gdje posao stane ◐ *(4. 10. 2026)*

*Dva reda tabele urađena (`282a316` uvjet, `91e410f` zapisnik), dva su već
postojala (presedan, klauzula na *not met*). Mjere, brojevi i šta je uživo
prošetano: NASTAVAK §4.8. Granica — nacrt, nikad presuda — stoji ispisana u
kodu oba.*

Postoji: čitanje nacrta protiv oblika (sa navodom rečenice) i asistent za
mehanizam (ugašen bez ključa). Sve ostalo član piše rukom.

| gdje | što bi radio |
|---|---|
| kad banka pošalje pitanje | predloži formulaciju pitanja odbora iz bančinih riječi — polje sada namjerno kreće prazno |
| kad se otvori predmet | nađe što je ovaj odbor već presudio o sličnom i ponudi kao presedan |
| na svakom uvjetu | izvuče iz dokumenta rečenicu koja na njega odgovara, predloži *nađeno / nejasno / nema* |
| kad uvjet padne | sastavi klauzulu koju banka mora dodati u ugovor |
| pred glasanje | sažme raspravu: tko je što rekao i gdje se ne slažu |
| poslije glasanja | sastavi nacrt odluke iz odgovorenih uvjeta i upisanih razloga |
| na zapisniku sjednice | izvuče obaveze iz teksta i ponudi ih kao stavke |
| na novom nacrtu | provjeri ga protiv odluka koje **stoje**, ne samo protiv oblika |
| na registru | primijeti da se udio pomjerio ispod praga prije revizije |

**Granica koja se ne prelazi:** svaki takav ishod je nacrt koji čovjek uređuje i
potpisuje, označen kao nacrt, nikad presuda. To je cijelo obećanje proizvoda i
ono ostaje.

## 12 · Apple, kao pravila a ne kao osjećaj ✅ *(3. 10. 2026)*

*Pet stavki, svaka izmjerena prije i poslije; mjere i brojevi su u
NASTAVAK §4.7. Commiti: `15e47a5` (jedna boja), `9514acf` (chevron),
`5745057` (uvučena linija), `0ab6c20` (ploča odozdo, dvije visine),
`ce7c695` (naslov se skuplja u traku).*

Zadnje, kad struktura stoji.

- Veliki naslov koji se skuplja u traku pri skrolanju: ekran se otvara imenom u
  34 px, a kad kreneš dolje naslov se sažme u traku od 44 px. Time nestaje
  potreba za posebnom glavom ekrana.
- Grupirani popisi sa **uvučenim** linijama — linija počinje tamo gdje počinje
  tekst, ne preko cijele širine.
- Chevron desno na svemu što vodi dalje. Čovjek odmah zna što je otvorivo.
- Ploče odozdo sa hvataljkom i dvije visine umjesto panela koji pokriva ekran.
- Jedna naglašena boja (lapis), sve ostalo neutralno. Sada ih ima pet u popisu.
- Sadržaj je sučelje — krom se povlači. Nema dvije trake, nema prebacivača
  jezika na svakom ekranu.

---

## Stalno, uz svaku stavku

- **Uživo u pregledniku na 390 px i 1440 px.** Ne samo testovi — svaka faza
  ovog projekta dosad je sakrila stvarni kvar iza zelenih testova.
- **Mjera se dokazuje prije nego joj se vjeruje.** Ubaci stvarni kvar i gledaj
  da padne. Nula kojoj to nije napravljeno ne vrijedi ništa.
- Priručnik PDF — snimke su stare.
- Push na GitHub — **svaki put pitati.**
- Probne skripte i `vite.probe*.mjs` nikad u repo; recept je u NASTAVAK §5.
