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

### FAZA 0 · Primitivi i ljuska — **URAĐENO 15.09.2026.**

> Bez ovoga svaka sljedeća faza nasljeđuje istu grešku. **Ovo je razlog zašto
> se dosad svaka popravka osjetila kao minimalna.**

**Mjereno poslije, ne procijenjeno:**

```
dokument se skrola            NE — na svih devet provjerenih ruta, 800 = 800
text-[..px] u markupu         0    (bilo 1273, na 10 koraka)
leading-[..] · tracking-[..]  0    (bilo 289 i 195, na 5 i 5)
shadow-[..]                   7    (bilo 100; preostalih 7 su ivice, ne visina)
goli <button>                 0    (bilo 197, svi na jednu komponentu)
focus-visible                 svuda — pisan protiv elementa, hvata i onih 49
testovi                       360 prolazi · tipovi čisti
```

**Osam heksova bez imena ostavljeno je netaknuto** i čeka tvoju odluku, kako
i piše u pravilu — ne izmišljaju se:
`#F7F0E2` ×3 · `#A67A28` · `#133A5F` · `#F2DFB5` · `#FBF1DF` · `#235A49` ·
`#FCF6EA` · `#FCF6EC`

**Dva fajla više ne mogu razići boju.** `tailwind.config.js` je na vrhu pisao
da je duplikacija **već jednom napravila drift** — a upozorenje u komentaru je
nešto što se pročita jednom. Sada `scripts/tokens.mjs` uporedi obje palete i
odbije ih pustiti da se ne slažu, i to se vrti u testovima, ne u nečijem
sjećanju. Prvo pokretanje je našlo pet stvarnih razilaženja; sva su zatvorena u
`tokens.css`. **22 boje provjerene, nula razilaženja.**

Nije generator nego provjera, namjerno: generisan fajl je fajl koji će neko
ipak jednom urediti rukom, a problem nikad nije bila duplikacija nego **tišina**.

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

### FAZA 1 · Obavijesti — **URAĐENO 15.09.2026.**

> *„Dođe pitanje → odmah iskoči obavijest"* je prva rečenica cijelog zahtjeva.
> Iza nje nije stajalo ništa: `notifier` je gađao **samo banku**.

**Kako je riješeno — brojka putuje, nikad lista**

Očigledna gradnja je tablica obavijesti: glasa se, upiše se red po članu, zvono
čita redove. Cijela aplikacija odbija taj oblik i `attention.ts` kaže zašto:
*zapisana lista je druga kopija istine, a druga kopija se razilazi.* Predmet se
povuče a obavijest ostane. Član glasa a obavijest ostane.

Zato se ne pamti **šta** se desilo, nego samo **koliko puta** se zapis pomjerio.
Ekran koji drži svoju kopiju čuje da je brojka porasla, zatraži listu ponovo, i
sam uporedi. Istina ostaje na jednom mjestu i zvono se ne može s njom razići.

**Gdje zvono stoji:** ispod svih 74 čina, ne uz njih. `Store` je omotan, pa čin
ne može promijeniti zapis a da zvono ne čuje — uključujući činove pisane
poslije danas. Da je bilo uz svaki čin, bilo bi 74 prilike da se jedan zaboravi,
a zaboravljeni bi bio nevidljiv: zapis tačan, samo zvono krivo.

**Provjereno na živom serveru, ne samo u testu**

```
tri zapisa koja su sjela (201)   →  linija javila 1, 2, 3
jedno čitanje (200)              →  ništa
jedan odbijen zapis (400)        →  ništa
```

Uz to pet testova koji čuvaju klasifikaciju: lista čitača se provjerava protiv
**stvarne** površine `Store`-a, pa metoda dodana sutra ne može proći
neklasifikovana. 1748 server testova, 360 client testova.

**Obavijest koja iskoči sama** — jer tačka na zvonu nije ono što je traženo.
Tačka je nešto što član nađe ako slučajno pogleda u traku, a cijela poenta je
da ne mora gledati. Iskače bez pitanja, kaže šta je stiglo i od koga, i nudi
jedan pritisak koji to otvara. Bez tajmera: obavijest koja nestane za pet
sekundi je obećanje da je član gledao u ekran baš tada, a učenjak koji čita
ugovor nije. Odlazi kad je pritisne, odbaci, ili otvori zvono.

Najviše dvije odjednom, i samo one vrste koje §N-02 imenuje glasnim. Tri
naslagane obavijesti se odbace bez čitanja, što je gore nego ne javiti.

**Greška koju je našlo pokretanje, a testovi nisu.** Prva verzija je poredila
redove po tome **gdje se otvaraju**. Sva pitanja koja čekaju otvaraju se na
istom mjestu, pa je drugo pitanje izgledalo kao prvo koje je još tu: red je na
ekranu rastao sa 11 na 12, a zvono ćutalo. Ključ je sada vrsta i broj zajedno.
Ovo se ne bi vidjelo ni u jednom testu koji sam napisao.

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

### FAZA 2 · Verzija i ključ zahtjeva — **URAĐENO 15.09.2026.**

**Verzija je izvedena iz sadržaja, nije zapisana pored njega.** Očigledna
gradnja je brojač na predmetu koji svaki zapis uveća. Zapisan broj je druga
kopija istine, a zapis koji zaboravi uvećati ga čini da verzija laže **u smjeru
koji gubi rad** — opasnom smjeru. Zato verzija **jeste** sadržaj: otisak
predmeta kakav stoji. Nema se šta zaboraviti ažurirati i nema se od čega
razići. Ključevi se sortiraju na svakoj dubini, inače bi isti predmet složen
drugim redom dao drugi otisak i odbio zapis koji je smio proći.

**Odbijanje ide kroz grešku, ne kroz povratnu vrijednost.** Prvi pokušaj je
vraćao `null` i ostavljao svakom od osamnaest činova da to primijeti — osamnaest
prilika da se jedan zaboravi, a zaboravljeni bi članu odgovorio `null` kao da
je čin prošao. Svako odbijanje u ovoj aplikaciji već putuje kao greška.

**Ključ zahtjeva stoji iznad svih 74 čina**, poslije prijave a prije ruta. Ko
radi je dio otiska: dva člana mogu izabrati isti ključ, a da jedan dobije tuđi
odgovor bilo bi gore od ijednog duplikata. Odbijanja se ne pamte — 400 je poziv
da se nešto popravi i pošalje opet.

**Tri greške koje je našlo pokretanje, ne testovi:**

1. **Express je gazio moj `ETag` svojim.** Njegov je keš-oznaka — *ovaj odgovor
   je bajt-identičan prošlom* — što je drugo pitanje od *ovo je verzija koju
   držiš*. Vraćalo se `W/"6cc-…"` i **svaki zapis sa `If-Match` bi pao**.
2. **Dva sata u istom mehanizmu.** Ključ se pamtio sa stvarnim vremenom a
   istjecao protiv testnog — pa nikad nije istekao. Sada sat ima jedno mjesto.
3. **Prozor sudara nije pokazivao šta je stiglo.** Čitao je zadnju riječ iz
   kopije koju preglednik već drži — a ona po definiciji ne sadrži ono što je
   upravo stiglo. Pisalo je *nešto se promijenilo, otvori da vidiš šta*, što je
   tačno ona beskorisnost zbog koje prozor postoji.

**Provjereno na živom serveru i u pregledniku:**

```
Amir pise sa svojom verzijom              201
Lejla pise sa istom, sad zastarjelom      409 + trenutna verzija, nista upisano
Lejla procita ponovo pa posalje           201
u zapisu                                  obje rijeci — nijedna izgubljena

isti kljuc dvaput                         201, 201 · drugi oznacen kao ponavljanje
u zapisu                                  jedan unos, ne dva
isti kljuc za DRUGI cin                   409 odbijen
bez kljuca                                201 — stari put i dalje radi
```

U pregledniku, sa dva člana: kolega piše dok član kuca, pritisak otvori prozor
koji pokazuje **stvarne riječi kolege** i **otkucani tekst koji nije nestao**,
a poslije čitanja isti pritisak prođe i traka ode na sljedeći korak. **Jedan
nalaz u zapisu, ne dva.**

<details><summary>Šta je faza tražila prije nego je urađena</summary>

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

</details>

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

### FAZA 4 · Do alata — **URAĐENO 15.09.2026.**

**Ispravka koja je došla od vlasnika, i bila je tačna.** Prvi pokušaj je alat
sakrio iza `Ctrl+K`. To radi samo za onoga ko već zna da tipka postoji — a to
nije niko, prvog dana. **Kratica je brži put za onoga ko zna; nikad nije put.**

**Posao, kako je urađen**

1. **Polica na desnoj ivici okvira** — sedam alata, imenom, na **svakom**
   ekranu. Nije nešto što se otvara: dio je okvira. Jedan pritisak otvara
   **taj alat**, ne panel u kojem ga treba ponovo naći.
2. Panel prima `at` — ime alata. Prije je imao sedam kartica ali ga ništa nije
   moglo otvoriti *na* jednoj: pritisneš Alati, dobiješ sedam imena, biraš
   drugi put. Meni čiji je jedini sadržaj drugi meni.
3. `Ctrl+K` paleta — sedam alata i osam odredišta, po imenu, sa bilo kojeg
   ekrana. Strelice, `Enter`, `Esc`. Fokus se vraća na kontrolu koja ju je
   otvorila.

**Provjereno u pregledniku, ne pretpostavljeno**

```
polica                7 gumbi, na svakom ekranu
pritisak na četvrti   panel se otvara NA četvrtom (aria-current na oba)
Ctrl+K                otvara, fokus sjeda u polje, 15 redova (7 alata + 8 mjesta)
dokument              i dalje se ne skrola
```

**`?` pokazuje tipke tekućeg ekrana**, ne opšti spisak. Jedan list svih kratica
u aplikaciji je referentni dokument, a referentni dokument se pročita jednom i
nikad više. Ono što član hoće je *šta mogu odavde gdje stojim* — šest ili sedam
stvari koje stanu u glavu. List se sastavlja od toga gdje je član: na koraku
imenuje tri nalaza i dvije strelice, na listi strelice i `Enter`, svuda paletu
i pretragu. **Ništa se ne navodi što na tom ekranu ne radi** — kratica koja je
oglašena a ne radi gora je od one koja nikad nije spomenuta.

**`/` vodi na pretragu**, i nikad se ne otima iz polja: član koji kuca datum
ili oznaku ugovora ima pravo na kosu crtu.

**Paleta zna i za zapis.** Alati i odredišta su poznati prije nego iko išta
otkuca; predmeta ima na stotine, pa se traže tek kad član otkuca bar dva znaka,
i to **serverovom vlastitom pretragom** — istom koju koristi ekran pretrage,
pa se to dvoje ne može razići oko toga šta postoji.

**Provjereno u pregledniku:** `Ctrl K` otvara i fokus sjeda u polje · `?` na
početnom ekranu pokazuje tačno tri odjeljka — *ova lista*, *svuda*, *pisanje* —
i nijedan korak, jer koraka tu nema.

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
