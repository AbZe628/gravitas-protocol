# Red — što se radi, kojim redom, i što je od toga gotovo

Ovo je jedan popis. Sve što je nađeno u auditu sučelja i sve što je nađeno u
auditu logike rada stoji ovdje, u dogovorenom redu. Ništa se ne planira po
ekranima — planira se po obećanjima.

Oznake: ✅ gotovo · ◐ u radu · ⬜ nije počelo

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
- ◐ **L2** — `MatterPack` čita passage, ali crta **jedan** korak. Cijeli spisak
  od trinaest koraka i dalje postoji samo u `Passage.tsx`, koju koristi jedino
  `/classic/matters/:id`. Ostatak ovog koraka.

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
  - ✅ imena umjesto id-a na sva 24 mjesta (gornja traka, avatar, rasprava,
    glasovi, sjednice, prekršaj…); `whoName` koji je nosio id preimenovan u `who`
  - ⬜ pitanje, obaveza i revizija nemaju ekran koji čita prolaz, pa ni kontrolu
    (server ih prima; sučelja nema)
  - ⬜ dodjela **jednog koraka** (ne cijele stvari) postoji na serveru, nema je u
    sučelju
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

## 6 · Izmjena uvjeta otvara reviziju presuđenog ⬜

- **L10** — amandman ispravno nadomješta i čuva staru verziju, ali odbor se ne
  obavijesti što je sve presuđeno po verziji koju je upravo zamijenio. To je
  stvarna noćna mora odbora — *što smo sve presudili po pravilu koje smo jučer
  promijenili* — i to je čista logika, nula sučelja.

## 7 · Lanac odluka → uvjet → obaveza → dokaz ⬜

- **L14** — trebalo bi: odluka → uvjet → stvar koju banka mora raditi → dokaz da
  radi → odbor to vidi. Sada su odluke ovdje, registar tamo, ispitivanja treće
  mjesto. Zato ispitivanja djeluju nakalemljeno — jer jesu, lanac je prekinut na
  dva mjesta.

## 8 · Radni prozor kao jedini oblik predmeta ⬜

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

## 9 · Telefon ⬜

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
- **O1** — gornja traka ~57 px + traka braće ~54 px + tabovi ~61 px = 175 px od
  844 (21 %), plus glava ekrana 105–136 px → prvi red posla oko 230 px. Treba
  jedna traka od 56 px: ime ekrana i jedna radnja.
- **O2** — četiri okrugla dugmeta gore = 176 px od 390 px širine, zato se ime
  odbora lomi u dva reda.
- Red na telefonu: jedna linija, jedan broj, chevron. Čin kao dugme pune širine
  iznad kartica.

## 10 · Stol ⬜

- **O3** — tri okvira oko posla: jarbol lijevo, polica alata desno, gornja traka.
  Polica je otvarač panela koji stalno jede širinu. Jezik stoji na svakom ekranu
  za izbor koji se pravi jednom.

## 11 · AI tamo gdje posao stane ⬜

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

## 12 · Apple, kao pravila a ne kao osjećaj ⬜

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
