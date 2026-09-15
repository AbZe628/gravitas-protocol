# Gradnja — red kojim se Majlis završava

Ovo nije popis želja. Ovo je **radni nalog**: jedanaest faza, svaka sa
poslom, posljedicama koje se rješavaju **u istom prolazu**, i mjerom po kojoj
se zna da je gotova.

Specifikacija je `FLOW.md`. Ovaj dokument je red kojim se ona gradi.

---

## 0 · Kako se ovo koristi

| pravilo | zašto |
|---|---|
| **Jedna faza u jednom prolazu.** Ne dvije, ne pola. | Dvije tri sitnice u hodu su nas dovele dovde |
| **Posljedice su dio faze, ne sljedeći zadatak.** | Ako se riješi gumb a ne riješi gdje vodi, to je pola rješenja i gore je od ničeg |
| **Faza je gotova kad je mjerena, ne kad izgleda gotovo.** | Svaki brojač ovdje je bio pogrešan bar jednom |
| **Ništa se ne briše.** Staro ostaje dostupno dok novo ne prođe mjeru. | — |
| **Ako faza otkrije rupu, rupa se zapisuje u §9 FLOW.md — ne rješava usput.** | Usputno rješavanje je kako su nastale sve dosadašnje polovine |

**Zakon nad zakonima:** ako se krene rješavati nešto, rješavaju se i
posljedice toga. Gumb koji dobije prozor mora dobiti i „šta slijedi", i mjesto
u matrici, i pet stanja, i tipku. Inače se ne dira.

---

## 1 · Stanje danas — mjereno, ne procijenjeno

| | |
|---|---|
| Server testovi | 1743, prolaze |
| Client testovi | 360, prolaze |
| Mutirajućih činova | **74** *(brojano iz `routes/`)* |
| Ruta / radnih ekrana | 36 / ~29 |
| Čvorova u specifikaciji | 50 |
| Komponenti / stranica | 77 / 34 |
| i18n pozivi | 1616, bez golih stringova |

**Šta je dobro i ne dira se:** zapis koji se samo dopunjava · troji jezici bez
rupa · greške i prazna stanja pokrivena u 86 od 111 fajlova · 33 test fajla ·
model koji računa a nikad ne zaključuje.

**Šta je mjereno loše:**

| | broj | posljedica |
|---|---|---|
| Golih `<button>` bez komponente | **197** | *mrtav · radi · greška* ne mogu biti dosljedni ni u principu |
| Zajedničkih helpera za klase | **0** | svaki gumb izmišlja visinu → traka činova nije na istom pikselu |
| Različitih veličina slova | **40** *(sa polupikselima)* | nema ritma; dva ekrana se nikad ne poklope |
| Proizvoljnih Tailwind vrijednosti | **2223** | — |
| Tvrdo upisanih boja | **119** | neke nisu ni u paleti |
| Upotreba ljestvice iz `tokens.css` | **0** | postoje dva sistema, koristi se onaj koji niko nije osmislio |
| `outline-none` bez `focus-visible` | **49 : 0** | **fokus je nevidljiv** — tastatura ne postoji za oko |
| `aria-busy` / `aria-live` / `aria-invalid` | **0 / 0 / 0** | čitač ekrana ne zna da se nešto učitalo, promijenilo ni pokvarilo |
| `autoFocus` / `.focus()` | **0 / 3** | fokus nigdje ne sjeda |
| Obrađenih tipki | **Escape 3 · Enter 1** | §J.2 tablica je praktično prazna |
| `h-screen` / `100vh` | **3** | **dokument se skrola** — zakon 1 iz §35 pada |
| `role="dialog"` | **2** | prozori nisu prozori za čitač ekrana |

---

## 2 · Faze

### FAZA 0 · Primitivi i ljuska

> Bez ovoga svaka sljedeća faza nasljeđuje istu grešku. **Ovo je razlog zašto
> se dosad svaka popravka osjetila kao minimalna.**

**Posao**

1. `Button` — jedna komponenta. Varijante: *glavni · sporedni · tihi ·
   opasni*. Stanja: *mirno · pod mišem · pritisnut · **mrtav** · **radi** ·
   **greška***. Veličine: *sm · md*. Tipka `Enter` kad je glavni.
2. `Field` · `Select` · `Textarea` — oznaka, pomoć, greška **uz polje**,
   `aria-invalid`, `aria-describedby`.
3. `ActBar` — traka činova. **Uvijek ista visina, uvijek isti redoslijed:**
   opasno lijevo, glavno desno *(obrnuto u RTL)*.
4. **40 veličina slova → 6 tokena.** Mehanički prolaz, jedan commit.
5. `tokens.css` → generiše `tailwind.config.js`. Drift prestaje biti moguć.
6. `Shell` — `100dvh`, zaglavlje i traka činova fiksni, **skrolaju samo okna**.
7. `focus-visible` prsten svuda gdje je `outline-none`.

**Posljedice koje se rješavaju u istom prolazu**

- svih **197** `<button>` prelazi na `Button` — ne dio njih
- svih **119** tvrdih boja na tokene; one kojih nema u paleti **odlaze vlasniku
  na odluku**, ne izmišljaju se
- `weigh.mjs` dobija dvije mjere: skrola li se dokument, i je li `offsetTop`
  trake činova isti na svim čvorovima
- svaki ekran koji je skrolao kao dokument mora se **preraspodijeliti u okna** —
  ovo je pravi posao faze, ne CSS

**Gotovo je kad**

```
document.body.scrollHeight === window.innerHeight     na svih 50 čvorova
offsetTop trake činova                                isti na svim čvorovima
<button> bez Button komponente                        0
text-[..px]                                           0
focus-visible                                         svuda gdje je outline-none
```

**Ako se preskoči:** sve ostalo se gradi na krivom temelju i osjeća se kao
minimalna promjena — tačno kao dosad.

---

### FAZA 1 · Obavijesti

> *„Dođe pitanje → odmah iskoči obavijest"* je prva rečenica cijelog zahtjeva.
> Iza nje danas ne stoji ništa: `notifier` gađa **samo banku**.

**Posao**

1. Server: tok događaja prema prijavljenom članu *(SSE — jedna veza, bez
   ankete)*.
2. `N-02` zvono u traci: neprocitano, slajd, „pročitano", „sve pročitano".
3. `N-01` red „Šta te treba" — **izveden iz zapisa**, po pseudokodu iz §28.
4. Šta stiže odmah, šta tiho, šta bez zvona — tablica §J.3, doslovno.

**Posljedice u istom prolazu**

- brojka u traci se mijenja **uživo** — §11.7, inače je zvono laž
- red pokazuje **samo ono što traži mene**; posmatrač ne vidi tuđi posao
- prazan red **ne piše „nema podataka"** — piše šta je zadnje zatvoreno i nudi
  tri diskreciona čina
- svaki red vodi **tačno tamo gdje se radi**, ne na pregled

**Gotovo je kad:** pitanje predato u jednom pregledniku iskoči u drugom **bez
osvježavanja**, i klik vodi na stanicu na kojoj se stalo.

---

### FAZA 2 · Verzija i ključ zahtjeva

> Odbor od pet ljudi radi isti predmet istovremeno. To je cijela poenta
> proizvoda, i danas drugi tiho pregazi prvog.

**Posao**

1. Predmet nosi verziju; svaki čin nosi verziju koju je član vidio.
2. Razilaženje → **409**, ništa se ne piše.
3. `Idempotency-Key` na svim 74 čina — isti ključ, isti odgovor, bez drugog
   zapisa.
4. `N-04` prozor sudara: **oba teksta jedan uz drugi, tvoj ostaje u polju**.

**Posljedice u istom prolazu**

- `Button` u stanju *radi* ne prima drugi pritisak — ali to je samo prvi sloj;
  **bez ključa na serveru F5 i dalje piše dvaput**
- zastarjeli ekran kaže da je zastario: *„promijenjeno prije 12 sekundi —
  [Osvježi]"*, **nikad sam od sebe**, jer bi pobjegao tekst koji kucaš
- ispravka nalaza zamjenjuje stari, stari se vidi u historiji — zapis ostaje
  samo-dopunjiv

**Gotovo je kad:** dva preglednika zapišu nalaz na isti uslov, drugi dobije
409 i vidi prvi; dupli klik i F5 naprave **jedan** zapis.

---

### FAZA 3 · Ponašanje — §11

**Posao**

1. Stanica u adresi: `/matters/x?step=03`. F5 vraća isti čvor.
2. Otkucano preživi otvaranje alata, bočnog okna, prelazak na drugu stanicu.
3. Tastatura — cijela tablica §J.2, ne dio.
4. Brojevi koji žive: „Šta te treba", traka stanica, „2 od 3".
5. Čekanje: ekran ostaje, sporost se javlja gdje je, preko 2s kaže **šta** čeka.

**Posljedice u istom prolazu**

- naprijed/nazad u pregledniku rade kroz stanice
- zatvaranje prozora vraća **tačno** gdje si bio — ista pozicija skrola
- čin koji uspije **ne prebacuje** te sam; „šta slijedi" daje izbor
- dijalog sa otkucanim tekstom **pita** prije nego ga baci

**Gotovo je kad:** cijeli jedan predmet, od otvaranja do glasa, obavljen **bez
miša**; F5 na svakoj stanici vraća istu stanicu.

---

### FAZA 4 · Komandna paleta

**Posao:** `N-03`. `Ctrl+K` sa bilo kojeg ekrana, uključujući otvoren prozor.
Alati, oblici, banke, brojevi odluka, činovi.

**Posljedice u istom prolazu**

- paleta **nikad** ne mijenja glavni ekran dok je otvoren radni prozor — alat
  se otvara sa strane, iznad njega
- alat otvoren iz palete **ne veže se ni za šta** dok se ne zapiše; alat
  otvoren iz koraka veže se za uslov. Razlika mora pisati **na ekranu**
- `?` pokazuje tipke; `/` pretragu

**Gotovo je kad:** svaki diskrecioni zadatak iz §C dostupan sa svakog čvora,
bez napuštanja posla.

---

### FAZA 5 · Prozor i „šta slijedi" na svih 74 čina

> Danas ih ima oko 8. **Ovdje se ne smije preskočiti nijedan.**

**Posao:** za svaki čin iz matrice §E i §33 — dijalog koji kaže *šta radi i
kome*, i POSLIJE koje kaže *šta je urađeno · šta to znači · šta slijedi (≤3)*.

**Posljedice u istom prolazu**

- gumb čiji uslov nije ispunjen je **odsutan sa razlogom**, ne mrtav bez
  objašnjenja — osim kad član uslov može ispuniti tu *(razlog nije upisan →
  mrtav, a traka piše šta fali)*
- svaki čin koji šalje nešto banci mora pokazati **šta banka vidi**
- „ništa više" je imenovan ishod, ne prazan ekran

**Gotovo je kad:** kontrolna lista §3 ovog dokumenta ima **74 od 74**.

---

### FAZA 6 · Pet stanja svakog ekrana

**Posao:** *prazno · učitava · djelimično · greška · idealno* na svih 50
čvorova. Uz njih dva koja su naša: **zid** *(čin postoji, ekran ne)* i **nema
pojma** *(nema ključa, lanca, volumena, releja)*.

**Posljedice u istom prolazu**

- prazno nikad ne piše „nema podataka" — piše **zašto** je prazno i **šta
  uraditi**
- server koji ćuti ≠ *nema ničega*. Dvije rečenice
- greška koja se ponovi tri puta nudi šta dalje
- `aria-busy`, `aria-live`, `aria-invalid` — inače čitač ekrana ne zna ništa
  od ovoga

**Gotovo je kad:** svaki čvor prođe test od šest pitanja iz §35.5.

---

### FAZA 7 · Automatizam izdavanja

> *„Kad je glasanje gotovo automatski ispušuje PDF ili upisuje u policy
> registri."*

**Posao:** čim stanje postane NA SNAZI — odluka, klauzule, broj iz serije,
upis u registry ako je web3 i holding tokeniziran, obavijest banci, otvoreno
potpisivanje. Bez ijednog klika.

**Posljedice u istom prolazu**

- **PDF se ne šalje sam** — sastavlja se sam, čovjek šalje. Granica §11.9
- ako upis u registry padne, odluka **i dalje stoji**; ekran kaže da upis nije
  prošao i nudi ponovo
- broj iz serije mora biti jedinstven i kad dvije odluke stupe u istoj sekundi

**Gotovo je kad:** od zatvaranja glasanja do gotovog papira — nijedan klik.

---

### FAZA 8 · Rupe koje nisu ukras

| | |
|---|---|
| Timelock kad istekne | danas ništa ne prevrne stanje samo |
| Stare adrese ugovora | moraju se odbiti, ne prihvatiti tiho |
| Spajanje instrumenata *(N-74)* | **rute nema** — dva zapisa o istom ostaju dva |
| Zid: unovčavanje koda | čin postoji, ekrana nema |
| Zid: prijava banke | uloga postoji, vjerodajnica ne |

**Posljedica:** svaki zid se **piše kao zid** na ekranu, ne kao greška i ne
kao tišina.

---

### FAZA 9 · Sedam odluka vlasnika

Ne rješavaju se kodom. Dok ne odluči, **ostaju napisane na ekranu kao
nedostatak**, ne prešućene.

1. Izuzeće člana — nema rute nigdje
2. Ratifikacija zabrane — **zabrana danas nikad ne istekne**
3. Ko prijavljuje prekršaj i plaća purifikaciju — danas samo odbor
4. Nalaz dok je glasanje otvoreno — kod ne brani
5. Promjena glasa — nedefinisano
6. Glasanje bez rasprave — server odbija, ekran ne kaže unaprijed
7. Kvorum i serija — **rute nema**, a kod se štiti od promjene koja ne postoji

---

### FAZA 10 · Ono što je vani

| | traži |
|---|---|
| Sažetak pitanja i brojke iz PDF-a | **KLJUČ** — vlasnikov, nikad moj |
| Slanje banci | **RELEJ** banke |
| Upis u registry | `onlyOwner` na ugovoru |

Dok toga nema: **gumba nema, a statusna traka piše šta nedostaje.** To je
pravilo koje već postoji i ostaje.

---

## 3 · Kontrolna lista — svih 74 čina

Faza 5 je gotova kad je svaki red pun. Nijedan se ne preskače.

**Predmet — 24:** postavi pitanje · otvori raspravu · promijeni oblik ·
postavi termine · nalaz *(ispunjen)* · nalaz *(nije)* · nalaz *(ne
primjenjuje)* · pročitaj nacrt · reci nešto · pitaj banku · odgovor banke ·
priloži izvor · priloži dokument · povuci izvor · prigovori izvoru · pročitaj
brojke · prigovori prijedlogu · otvori glasanje · glasaj · zatvori glasanje ·
vrati u raspravu · stupa na snagu · povuci predmet · šta banka mora poslije

**Potpis — 2:** traži potpis uređajem · potpiši
**Uređaji — 3:** počni upis · upiši · zaboravi
**Registar — 3:** unesi holding · označi kako se drži · povuci iz registra
**Pitanja banke — 4:** predaj · uzmi kao predmet · ne uzimaj · povuci
**Sjednice — 4:** sazovi · prisustvo · zapisnik · zatvori
**Komiteti — 5:** osnuj · raspusti · uputi · izvještaj · povuci upućivanje
**Alati — 8:** šest računa · zapiši račun · povuci račun
**Čitanje — 2:** pročitaj nacrt · koji je ovo oblik
**Prekršaji — 11:** prijavi · je li stvaran · zaustavljeno · koliko se očisti ·
plaćeno · plan · odobri · vrati · uprava · regulator · zatvori
**Ostalo — 6:** uzmi oblik · bilješka · povuci bilješku · zapiši obavezu ·
reci šta je bilo · zapiši pregled
**Nalog — 2:** ime i titula · lozinka
**Povratak — 2:** izdaj kod · unovči kod *(zid)*

> **24 + 2 + 3 + 3 + 4 + 4 + 5 + 8 + 2 + 11 + 6 + 2 + 2 = 76 stavki za 74
> čina** — nalaz je jedan čin sa tri gumba, pa se broji triput ovdje i jednom
> u kodu. To je namjerno: lista je popis **gumbi**, ne ruta.

---

## 4 · Test svakog čvora — 50 puta šest pitanja

| | pada ako |
|---|---|
| 1 | dokument se skrola |
| 2 | traka činova nije na istom pikselu kao na prethodnom čvoru |
| 3 | Tab poslije otvaranja ide u traku umjesto na sljedeću kontrolu |
| 4 | korak se ne može obaviti bez miša |
| 5 | radno okno ima preko **150 riječi** |
| 6 | do prvog stvarnog čina ima preko **400 piksela** |

Mjeri `weigh.mjs`. **Čvor koji padne nije stvar ukusa — to je greška u kodu.**

---

## 5 · Pravila rada

| | |
|---|---|
| **Mjeri, ne raspravljaj** | svaki brojač ovdje je bio pogrešan bar jednom; broji iz izvora |
| **Pokreni, ne samo testiraj** | zeleni testovi su sakrili šest stvarnih grešaka u dva kruga |
| **Traži prije nego napraviš** | dvaput sam napravio ono što Majlis već ima; grep za sposobnost **i** za i18n prefiks |
| **Ništa ne postaje obavezujuće administracijom** | mijenjanje standarda traži odluku na snazi, ne gumb |
| **Aplikacija predlaže, čovjek odlučuje** | granica §11.9 je granica cijelog proizvoda |
| **Proza nikad kroz `node -e`** | navodnici i CRLF tiho pojedu tekst; `Edit` ili `.mjs` fajl |
| **Port 4102**, nikad 4000 | 4000 je vlasnikova instanca |
| **Commit je AbZe628**, bez ikakvog traga alata | — |
| **Pitaj prije svakog guranja na GitHub** | svaki put, bez izuzetka |

---

## 6 · Šta se pita vlasnika, a šta ne

**Ne pita se:** kako se nešto zove u kodu, koji CSS, kojim redom unutar faze,
kako se mjeri.

**Pita se:** sedam odluka iz faze 9 · boje kojih nema u paleti · prag
pouzdanosti za brojke iz PDF-a · **prije svakog guranja na GitHub**.
