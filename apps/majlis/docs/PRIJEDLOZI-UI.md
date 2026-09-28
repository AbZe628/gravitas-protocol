# Prijedlozi — UI, tok, jasnoća, jednostavnost

Ovo nije plan — plan je [RED.md](RED.md). Ovo su prijedlozi šta dodati ili
pomjeriti u njemu, iz tri izvora: istraživanje (šta traže oni koji ovakve
aplikacije kupuju i koriste), mjere u samom repou, i ono što se u ovoj sesiji
vidjelo uživo na ekranu.

Dio izvora (IFSB, NN/g) mrežna politika okruženja nije dala otvoriti, pa su ti
nalazi iz sažetaka pretrage. Prije nego što se neki od njih citira banci,
treba pročitati original.

---

## 0 · Mjerilo: aplikacija, ne web stranica sa dugmadima

Tvoje riječi, i mjerilo za sve ispod: **aplikacija mora biti aplikacija — radna,
u Apple stilu — a ne web stranica sa dugmadima.** I drugo, iz istraživanja
portala za odbore: **Majlis mora biti lakši od e-maila**, jer direktor koji
portal nađe težim od maila zaobiđe ga.

Šta tačno razlikuje aplikaciju od stranice, po Appleovim pravilima — i gdje je
Majlis danas (✅ ima · ◐ djelimično · ⬜ nema):

| osobina aplikacije | Majlis danas |
|---|---|
| **Bočna traka → lista → detalj** (split view): odabir reda otvara detalj *pored* liste, lista ostaje. Apple: na iPadu split view umjesto tab bara; sidebar za područja, lista za stvari, detalj za odabranu stvar. | ⬜ red odvodi na novu stranicu, lista nestaje |
| **Okvir stoji, mijenja se samo sadržaj**, s prelazom (push, slide) koji kaže kuda si otišao. | ◐ jedna stranica bez ponovnog učitavanja, ali bez ikakvog prelaza |
| **Nazad vraća tačno gdje si bio** — skrol, odabir, filter. | ⬜ ništa u kodu ne vraća poziciju skrola |
| **Sporedni zadatak u ploči (sheet)** uz trenutni kontekst, s hvataljkom i dvije visine — ne nova stranica. | ◐ prozori za činove postoje; ploče odozdo ne |
| **Činovi su dugmad na stalnom mjestu** (alatna traka gore, traka dolje na telefonu) — nikad podvučen tekst. | ⬜ 74 mjesta u kodu s podvlakom (`underline`); dio su činovi — *Do not take it up*, *Look at this again*, *Reply* |
| **Liste kao u Postavkama:** grupisane, uvučene linije, strelica na svemu što vodi dalje, odabrani red ostaje istaknut dok je njegov detalj otvoren. | ◐ jedna površina s linijama ✅, strelice ⬜, istaknut odabir ⬜ |
| **Radnje na samom redu:** prevlačenje na telefonu, desni klik ili dugi pritisak za meni. | ⬜ |
| **Veliki naslov koji se pri skrolu skupi u traku.** | ⬜ (tačka 12) |
| **Sistemski font za sučelje** (SF / system-ui); serif samo za tekst koji se čita. | ⬜ Manrope za sučelje, serif (Newsreader) i za naslove u redu (T4) |
| **Trenutni odziv:** čin se vidi odmah, kostur umjesto *Loading…*, nikad prazan ekran. | ⬜ činovi čekaju server pa ponovo čitaju sve |
| **Tastatura:** ⌘K, strelice, Enter, Esc. | ◐ ⌘K ✅, 1–9 na redu ✅, strelice ⬜ |
| **Instalira se kao aplikacija:** ikona, bez trake preglednika, radi bez mreže. | ⬜ ikone postoje, `manifest.json` ne postoji |
| **Jedna naglašena boja**, sve ostalo neutralno. | ◐ lapis vodi, ali u redu je pet boja faza |
| **Ništa se ne gubi:** otkucan tekst, odabir, filter. | ◐ nacrti po koraku u predmetu ✅, drugdje ne |

**Najveća poluga je prvi red tabele.** Kad red *šta te čeka* ostane lijevo, a
posao se otvori desno — i kad telefon to isto uradi kao guranje ekrana s
nazadom koji vraća tačno gdje si bio — Majlis prestaje biti skup stranica.
Sve ostalo iz tabele su pravila koja taj okvir drže dosljednim. Zato je to
**P0** ispod.

---

## 1 · Šta istraživanje kaže

| nalaz | šta znači za Majlis |
|---|---|
| **Usvajanje = upotrebljivost.** Portal može ispuniti svaki uslov sigurnosti i funkcija i ipak propasti ako ga direktori ne koriste. | Mjera uspjeha nije broj funkcija nego koliko koraka i sekundi treba za *jednu* stvar. |
| **70 % direktora čita na tabletu**; vrijednost se traži u radu bez mreže i u obavijestima: nov materijal, podsjetnik 24 h prije sjednice, novo pitanje koje traži tvoj odgovor, zadatak dodijeljen tebi, dokument promijenjen otkad si ga vidio. | Učenjak nije dnevni korisnik. Ne otvara Majlis „da vidi" — dovede ga obavijest, na tačno mjesto. |
| **Složene aplikacije (NN/g):** učenje radom umjesto uputstava; manje nereda bez manje mogućnosti; stvari na predvidivim mjestima; progresivno otkrivanje; posao se prekida, pa pokaži gdje je čovjek stao i koliko ostaje. | Rad se vraća na isto mjesto; sekundarno se sklapa; *zašto* stoji uz korak, a ne u priručniku. |
| **Brzina (Nielsen, Doherty):** 0,1 s djeluje trenutno; do 0,4 s čovjek ostaje u toku; 1 s primijeti čekanje; 10 s gubi pažnju. Superhuman cilja 50 ms. Linear: optimistično ažuriranje, lokalna keš memorija, tastatura, ⌘K. | Budžet, ne želja: čin < 100 ms na ekranu, prelaz < 400 ms. |
| **Faze kao traka (Salesforce Path):** faze preko vrha, ispod najviše 5 ključnih polja i „smjernica za uspjeh" za tu fazu. | To je radni prozor iz tačke 8 — i gramatika ga već hrani: svaki korak ima `why`. |
| **Šerijatsko upravljanje (IFSB-10):** pet načela — opšti pristup, **kompetencija, nezavisnost, povjerljivost, dosljednost**. Odbor **prvo traži konsenzus**; tek ako ga u razumnom roku nema, odlučuje prostom većinom. Uz odbor stoje interni šerijatski pregled (ISRU) i jedinica za usklađenost (ISCU). Članovi trebaju biti dosljedni u mišljenjima i kad sjede u odborima različitih institucija. | Glasanje mora znati za konsenzus. Presedan (tačka 11) nije ukras nego zahtjev dosljednosti. Nezavisnost je razlog zašto banka ne smije znati ko drži njeno pitanje (zatvoreno u ovoj sesiji). |
| **BNM 2019:** upravni odbor formalno ocjenjuje šerijatski komitet najmanje jednom godišnje. **SAMA 2020:** mandat tri godine, stalna obuka, imenovanje uz pisani ne-prigovor SAMA-e, obaveze objavljivanja. | Godišnji izvještaj i ocjena rada odbora su posao koji se sam nakupi iz zapisa — ne kuca se. |
| **Arapski / RTL:** arapski font 10–15 % veći od latinice za istu čitljivost; visina reda 1,7+ (dijakritici); bez razmaka između slova; brojevi, telefoni, IBAN, grafikoni se **ne** zrcale. | Ljestvica i visina reda po jeziku, ne jedna za sve. |
| **Pristupačnost (WCAG 2.2 AA):** tekst 4,5:1; meta najmanje 24×24 px; fokus vidljiv. | Današnji `muted` je 3,0:1 na 777 mjesta. |
| **Apple:** 17 pt tijelo je donja granica čitljivosti na dohvat ruke; veliki naslov 34 pt koji se pri skrolu skupi u traku. | Poklapa se s tačkom 12. |
| **AI (Microsoft HAX):** reci šta sistem može i *koliko dobro*; ispravka mora biti laka. | Nacrt se prikazuje s rečenicom iz dokumenta i sigurnošću, i jednim klikom se ispravlja. |

---

## 2 · Šta sam izmjerio u Majlisu

- **Početni paket: 1.236 kB (327 kB gzip), jedan komad.** 37 ruta, nijedna
  lijena; svih 34 ekrana i sva tri rječnika (1.690 ključeva × 3 jezika) stižu
  prije prvog prikaza. Vite to i sam upozorava pri svakom buildu.
- **Šesnaest ekrana-imenica**, a radni prozor ima samo jedan (tačka 8).
- **Za jedan predmet postoje tri ekrana:** `/matters/:id` (MatterFlow),
  `/dossier/matters/:id` (MatterPack) i `/classic/matters/:id` (MatterDetail).
  U ovoj sesiji kontrola dodjele je prvo napisana u pogrešan od tri — i svi
  testovi su bili zeleni. Tri ekrana za jednu stvar su tri mjesta za kvar.
- **Čitljivost:** `muted` ≈ 3,0:1, ljestvica 10–15 px, veličina se po širini
  mijenja na 9 mjesta ukupno (tačka 9, T1/T2).
- **Telefon:** ~175 px okvira prije prvog reda (O1).
- **Viđeno uživo u ovoj sesiji:** gornja traka ~0,7 s tvrdi *Not signed in*
  dok identitet stiže; red je vodio na listu umjesto na stvar; imena su se
  crtala kao `member-a` (zadnje dvoje popravljeno).

---

## 3 · Prijedlozi, redom kojim bih ih radio

Svaki: **šta · zašto · kako u Majlisu · kako se dokazuje**.

### P0 · Aplikacijski okvir: lista lijevo, rad desno
- **Šta:** na stolu i iPadu tri stupca — bočna traka (područja), lista (red
  *šta te čeka*, ili lista jedne vrste), detalj (radni prozor odabrane
  stvari, P3). Odabir reda otvara rad desno; lista ostaje, odabrani red
  istaknut, strelice gore-dolje mijenjaju odabir. Na telefonu isto kao guranje
  ekrana, a nazad vraća skrol i odabir. Sporedni zadaci (forma, potvrda,
  razlog) u ploči, ne na novoj stranici. Činovi kao dugmad u traci na stalnom
  mjestu; nijedan čin kao podvučen tekst.
- **Zašto:** Apple split view / sheet / toolbar; NN/g *sačuvaj kontekst*;
  Superhuman i Linear rade upravo tako. To je jedina izmjena koja sama po sebi
  pretvara stranice u aplikaciju.
- **Kako u Majlisu:** okvir se pravi jednom (Shell), a red i radni prozor se
  u njega uklapaju; adrese ostaju iste (`/`, `/incidents/:id`…), samo se na
  širokom ekranu crtaju jedna pored druge. Prvo red + prekršaj, pa ostale
  vrste kako dobijaju radni prozor.
- **Dokaz:** uživo 390 / 1024 / 1440: odabir reda ne mijenja listu, nazad
  vraća tačno isti skrol i odabir, tastaturom bez miša kroz pet stvari; test da
  nijedan čin nije podvučen link (skener, kao za imena).

### P1 · Brzina kao budžet — ½ do 1 dan, sve ekrane odjednom
- **Šta:** lijene rute (`React.lazy` po ekranu), samo aktivni jezik u paketu,
  predučitavanje ekrana na hover/fokus reda, kostur umjesto *Loading…*,
  optimistično ažuriranje za *uzmi / daj / odgovori na uslov*.
- **Zašto:** 0,1 / 0,4 / 1 s; ljudi koji nisu dnevni korisnici ne opraštaju
  sporo prvo otvaranje.
- **Kako:** `App.tsx` uvozi 34 ekrana odjednom — to je jedna izmjena na
  jednom mjestu. Rječnici se dijele po jeziku.
- **Dokaz:** straža u CI-ju na veličinu početnog paketa (npr. ≤ 250 kB gzip),
  i mjerenje u pregledniku na 390 px uz usporenu mrežu — ne samo broj u buildu.

### P2 · Čitljivost odjednom (T1 + T2 iz tačke 9 naprijed) — ½ do 1 dan
- **Šta:** ljestvica 17 / 15 / 13 na telefonu, ništa ispod 12; `muted` ≥ 4,5:1;
  za arapski +12 % i visina reda 1,7; za urdu (nastaʿlīq) visina reda ≥ 2;
  bez VELIKIH SLOVA i razmaka između slova u arapskom i urduu.
- **Zašto:** WCAG 2.2 AA, Apple 17 pt, RTL nalazi. Mijenja **svaki** ekran
  jednom izmjenom tokena — najveći dobitak po satu rada u cijelom popisu.
- **Dokaz:** test koji računa kontrast svakog para tokena (proširiti
  postojeći `TokensAgree`) i pada ispod 4,5:1; snimci 390 px u sva tri jezika.

### P3 · Jedan radni prozor, kao crtač prolaza (tačka 8)
- **Šta:** jedna komponenta za svaku vrstu: faze preko vrha (grupe i koraci
  iz prolaza), kartica **šta sad** (jedan čin, čiji je, ko ga drži), sa strane
  najviše pet ključnih činjenica i dokument, ispod zapis šta se desilo. Poslije
  čina — sljedeći korak, nikad povratak na listu.
- **Zašto:** Path obrazac; NN/g *sačuvaj kontekst*; gramatika već daje sve
  podatke — `groups`, `next`, `standing`, `why`, `who`, `holder`. Prozor ne
  treba ništa računati, samo crtati.
- **Kako:** prvo prekršaj (devet koraka, dvije polovine — kao što NASTAVAK
  predlaže), pa pitanje, pa predmet. **Predmet svesti na jedan ekran** umjesto
  tri; stari ostaju samo kao preusmjerenje.
- **Dokaz:** isti prolaz daje isti prozor za svih pet vrsta (test po vrsti);
  uživo 390/1440 za svaku vrstu.

### P4 · „Šta te čeka" kao trijaža
- **Šta:** u okviru iz P0 — činovi na samom redu, bez otvaranja: *uzmi*,
  *daj* (prevlačenje na telefonu, meni na desni klik); tastatura `j`/`k`,
  `Enter`, `t` (uzmi); broj „tvojih" po osobi.
- **Zašto:** Superhuman / Linear — trijaža bez napuštanja mjesta; NN/g
  predvidiva mjesta.
- **Za razgovor:** lično *podsjeti me u utorak* — sakriva stvar samo meni,
  nikad odboru. Korisno, ali je nova vrsta zapisa; treba tvoja odluka.

### P5 · Između sjednica i na sjednici, uz konsenzus (tačka 5 + IFSB-10)
- **Šta:** svaka stvar se može označiti *treba sobu* — dnevni red se sam
  složi. Ekran glasanja prvo pokazuje **konsenzus** („4 od 5 saglasna, jedan
  nije odgovorio"); odbor postavlja *razuman rok*, poslije kojeg se smije
  odlučiti većinom, a zapis kaže da je odluka većinska jer konsenzusa nije
  bilo.
- **Zašto:** IFSB-10 to izričito traži. Opšti portali za odbore to ne rade —
  ovo je razlika koju banka odmah prepozna kao „napravljeno za nas".

### P6 · Obavijesti koje vraćaju ljude
- **Šta:** e-mail / push sažetak „3 stvari čekaju tebe", svaka s vezom na
  **tačan korak**; podsjetnik 24 h prije sjednice; *dodijeljeno tebi*;
  *promijenjeno otkad si vidio*.
- **Zašto:** 70 % na tabletu, rijetki posjeti; danas postoji samo zvono u
  aplikaciji (i kalendar).
- **Pazi:** povjerljivost — sažetak nosi samo ono što odbor dozvoli; ništa
  bankino, ništa što bi otkrilo ko drži šta (vidi `visibleTo`).

### P7 · Manje trake oko posla (tačke 9, 10, 12)
- **Šta:** telefon — jedna traka od 56 px (ime ekrana i jedna radnja), veliki
  naslov koji se skupi; stol — polica alata ide u ⌘K paletu (postoji *Go to,
  or open*), ne jede stalnu širinu; jezik se bira jednom, u postavkama.
- **Zašto:** O1–O3; Apple; NN/g manje nereda bez manje mogućnosti.

### P8 · Tri pitanja, isto mjesto, svaki ekran
- **Šta:** svaki ekran na istom mjestu odgovara: **šta je ovo · šta je
  sljedeće · čije je** (uloga i osoba). I nikad ne tvrdi stanje koje ne zna
  (*Not signed in* dok se identitet učitava).
- **Zašto:** dosljednost je ono što aplikaciju čini aplikacijom, a ne skupom
  stranica — tvoja prvobitna pritužba.

### P9 · AI na koraku, kao nacrt (tačka 11 + HAX)
- **Šta:** na koraku uslova — *nađeno / nejasno / nema* s navedenom
  rečenicom i stranicom, jednim klikom *prihvati* ili *uredi*; označeno kao
  nacrt; kaže koliko je siguran; nikad ne popunjava presudu ni glas.
- **Zašto:** HAX — reci šta može i koliko dobro, ispravka laka; granica iz
  tačke 11 ostaje.

### P10 · Arapski i urdu kao prvi jezik, ne prijevod
- **Šta:** izvorni govornik pregleda rječnik prije bilo kakvog pokazivanja
  banci (NASTAVAK to već kaže); RTL prolaz kroz svaki ekran na 390 px; hidžretski
  datum kao opcija; izbor cifara (zapadne / istočne) po instalaciji.

### P11 · Tablet i rad bez mreže
- **Šta:** instalacija kao PWA; čitanje predmeta i napomena bez mreže,
  sinhronizacija kad se vrati; prijava ključem uređaja već postoji.

### P12 · Učenje radom
- **Šta:** prazna stanja koja kažu sljedeći čin; bez paragrafa-uputstava na
  ekranu (idu u priručnik); za novog učenjaka jedan vođeni *prvi predmet* na
  demonstracijskom odboru.

---

## 4 · Šta ne bih radio

- kontrolnu tablu s grafikonima na ulazu — red *šta te čeka* je ispravan ulaz;
- štikliranje *gotovo* — korak je gotov kad zapis kaže da jeste (postojeće
  načelo);
- bodove, nizove i ostalu gamifikaciju;
- AI presude, i AI koji piše u polje glasa ili odluke;
- nove ekrane-imenice — svaka nova potreba je ploča radnog prozora.

---

## 5 · Kako bih ovo uklopio u RED

1. **P1 + P2 odmah** — mehanički, niskog rizika, mijenjaju svaki ekran
   (NASTAVAK, savjet 2). Brzina je pola osjećaja „aplikacije".
2. **P0 + P3 zajedno, na redu i prekršaju** — okvir *lista lijevo, rad desno*
   i u njemu prvi radni prozor. Prva vidljiva stvar poslije dodjele (NASTAVAK,
   savjet 1), i ona koja najviše mijenja utisak. Uz to gašenje dva od tri
   ekrana predmeta.
3. Zatim RED 3–7 kako stoji, s P4/P5/P6 tamo gdje se poklapaju:
   P5 = tačka 5, P9 = tačka 11, P7 = tačke 9/10/12, P0 + P3 = tačka 8.
4. P10 prije bilo kakvog pokazivanja banci — to nije stvar koju ja mogu
   zatvoriti.

---

## Izvori

- [Board Intelligence — top board management platforms 2025](https://www.boardintelligence.com/blog/what-are-the-top-board-management-software-platforms-for-2025)
- [Diligent — security, usability & scalability](https://www.diligent.com/lp/more-than-a-board-portal)
- [OnBoard — what is a board portal](https://www.onboardmeetings.com/board-portal/everything-you-need-to-know/)
- [OnBoard — mobile apps](https://www.onboardmeetings.com/board-portal/apps-ios-android/)
- [Board-room.org — board portal software overview](https://board-room.org/)
- [Azeus Convene — board portal](https://www.azeusconvene.com/board-portal)
- [IFSB-10 — Guiding Principles on Shariah Governance Systems](https://www.ifsb.org/wp-content/uploads/2023/10/IFSB-10-December-2009_En.pdf)
- [IFSB-10 — FAQs](https://www.ifsb.org/wp-content/uploads/2023/10/FAQs-for-IFSB-10_En.pdf)
- [IFSB-31 — Effective Supervision of Shariah Governance (2025)](https://www.ifsb.org/wp-content/uploads/2025/07/IFSB-31-Guiding-Principles-for-Effective-Supervision-of-Shariah-Governance.pdf)
- [Bank Negara Malaysia — Policy Document on Shariah Governance (2019)](https://www.bnm.gov.my/-/policy-document-on-shariah-governance)
- [SAMA — Shariah Governance Framework for Local Banks](https://rulebook.sama.gov.sa/en/shariah-governance-framework-local-banks-operating-saudi-arabia)
- [Intellect Design — Islamic banking solution suite](https://www.intellectdesign.com/solutions/islamic-banking-solution-suite/)
- [NN/g — 8 Design Guidelines for Complex Applications](https://www.nngroup.com/articles/complex-application-design/)
- [NN/g — Designing for Long Waits and Interruptions](https://www.nngroup.com/articles/designing-for-waits-and-interruptions/)
- [NN/g — Response Time Limits](https://www.nngroup.com/articles/response-times-3-important-limits/)
- [Doherty Threshold — 400 ms](https://www.ux-guidelines.com/doherty-threshold.html)
- [How's Linear so fast?](https://performance.dev/how-is-linear-so-fast-a-technical-breakdown)
- [Linear — how we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [Superhuman — email triage](https://blog.superhuman.com/email-triage/)
- [Salesforce — lightning:path](https://developer.salesforce.com/docs/component-library/bundle/lightning:path)
- [Arabic RTL typography for web design](https://voxire.com/blog/arabic-rtl-typography-web-design-2026/)
- [Finastra — RTL guidelines](https://design.fusionfabric.cloud/foundations/rtl)
- [W3C — What's new in WCAG 2.2](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/)
- [Apple — Human Interface Guidelines, Split views](https://developer.apple.com/design/human-interface-guidelines/split-views)
- [Apple — Human Interface Guidelines, Sidebars](https://developer.apple.com/design/human-interface-guidelines/sidebars)
- [Apple — Human Interface Guidelines, Layout](https://developer.apple.com/design/human-interface-guidelines/layout)
- [PWA Builder — mimic native transitions](https://blog.pwabuilder.com/posts/mimic-native-transitions-in-your-progressive-web-app/)
- [pwa-notes — native-feeling PWAs (scroll restoration)](https://github.com/jamesplease/pwa-notes)
- [Apple — Human Interface Guidelines, Typography](https://developers.apple.com/design/human-interface-guidelines/foundations/typography/)
- [Microsoft HAX — Guidelines for Human-AI Interaction](https://www.microsoft.com/en-us/haxtoolkit/ai-guidelines/)
- [Microsoft HAX — Support efficient correction](https://www.microsoft.com/en-us/haxtoolkit/guideline/support-efficient-correction/)
