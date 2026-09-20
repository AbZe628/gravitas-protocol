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

### FAZA 3 · Ponašanje — §11 — **URAĐENO 15.09.2026.**

**Provjera dogovora je prvo našla skretanje, i to moje.** `?` je oglašavao
tipke `1`, `2`, `3` i strelice na koraku — a **nijedna nije radila**. U samom
`Keys.tsx` piše: *ništa se ne navodi što na tom ekranu ne radi; kratica koja je
oglašena a ne radi gora je od one koja nikad nije spomenuta.* Faza 4 nije bila
gotova nego oglašena. Sada rade, i to je prvo što je ova faza zatvorila.

| §11 | bilo | sada |
|---|---|---|
| 11.1 stanica u adresi | nema | `?step=<uslov>` · F5 vraća na istu stanicu · nazad izlazi iz predmeta, ne šeta kroz korake |
| 11.2 otkucano se ne gubi | brisalo se pri svakoj promjeni stanice | nacrt **po stanici**; odeš pogledati korak 4 i vratiš se — rečenica je tu |
| 11.3 tastatura | `Escape` 3×, `Enter` 1× | `1` `2` `3` nalazi · `←` `→` stanice · nijedna se ne otima iz polja |
| 11.7 brojevi koji žive | sve tek na ponovno učitavanje | red, pažnja i **brojač glasova** se mijenjaju čim se zapis pomjeri |

**Dvije greške koje je našlo pokretanje:**

1. **Hook ispod ranog `return`.** Vezao sam tastaturu poslije
   `if (!matter) return <Loading />`, pa se broj hookova mijenjao između
   renderâ i **cijeli ekran predmeta je nestao** — prazan `<div/>`. Isti kvar
   koji je ovaj repozitorij već imao u `StructureDetail`. Vezanje je sada iznad
   svakog ranog izlaza, a šta tipka radi čita se iz ručke popunjene niže.
2. **Zaštita je gledala u DOM.** *Je li otvoren prozor* pitalo se pretragom
   `[role="dialog"]` po stranici. Danas je tačno; prestaje biti tačno čim išta
   drugo na ekranu uzme tu ulogu — i kvar je nijem: sve tipke tiho prestanu
   raditi. Sada se čita iz stanja ekrana, koje to ionako zna.

**Provjereno u pregledniku, bez ijednog klika:** otkucan razlog, pritisnuta
tipka `1`, nalaz zapisan i traka otišla na sljedeći korak. `2` otvara prozor za
*nije ispunjen*. Tipka otkucana **u polju** ne radi ništa — član koji piše
*1 od 3 vozila* dobije znak, ne nalaz.

<details><summary>Šta je faza tražila prije nego je urađena</summary>

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

</details>

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

### FAZA 5 · Prozor i „šta slijedi" na svakom činu — **URAĐENO 20.09.2026.**

> **49 sa prozorom i „šta slijedi" · 10 odluka sa razlogom upisanim u kod ·
> 0 bez ijednog, od 59 činova koji se zovu sa ekrana.** Mjeri se sa
> `work/majlis-local/faza5b.mjs`, nikad napamet.

**Zašto je datum pomjeren i zašto broj nije isti kao 19.09.**

Ovdje je 19.09. pisalo *50 · 9 · 0*, i to je bilo netačno. Stara mjera
(`faza5.mjs`) je za svaki čin gledala sadrži li **fajl** u kojem se zove
ijedan `<Act`. Ekran sa tri čina i jednim prozorom prolazio je kao da ima
tri. Živa provjera je našla prvi takav — prisustvo na sjednicama slalo je
odmah, bez ijedne riječi — i ispalo je da ih je šest:

`vote` · `object` · `reopen` · `attachSource` · `recordAttendance` ·
`convene`, a za njima još `filePlan` i `prescribe`.

`faza5b.mjs` mjeri **po činu**: traži gdje se poziv nalazi i broji ga samo
ako je unutar nečega što prozor izvršava. Prije nego se povjeruje nuli,
ubaci se pravi kvar i gleda je li prijavljen — ovdje: prozoru se oduzme
poziv, i `filePlan` i `prescribe` se odmah vrate u kolonu *bez*.

**Plan popravke i propisana mjera — jedan prozor koji prima zadatak**

Oba se dižu iz kontrola koje dijele i činovi koji prozor već imaju
(`Reason`, `PrescribeForm`), pa se kontrole ne smiju mijenjati za sve.
Umjesto toga ekran drži jedan prozor kojem se preda *šta radi, šta znači,
šta izvršiti i šta slijedi*.

Uz to: **odustajanje u prozoru ostavlja otkucano na mjestu.** Plan je više
redova nečijeg posla; prozor koji ga pri odustajanju obriše nanio je štetu
umjesto da je spriječi. Zadatak zato nosi i `calledOff`, a obrazac na
odbijanje ostaje otvoren.

Provjereno u pregledniku, ne samo u testu: `work/majlis-local/plan-uzivo.mjs`
— **25 od 25**, oba čina, kao sekretar i kao odbor.

**Posao:** za svaki čin iz matrice §E i §33 — dijalog koji kaže *šta radi i
kome*, i POSLIJE koje kaže *šta je urađeno · šta to znači · šta slijedi (≤3)*.

**Porodica u kojoj mašina čita papir** — `readContract`, `readAgainstShape`,
`readDocument` — nosi najvažniju rečenicu u aplikaciji, jer ono što se vrati
izgleda kao odgovor a nije: nalazi se ne upisuju dok član svaki ne potvrdi
ili ispravi, navod se provjerava doslovno, a polje bez navoda ostaje prazno
i imenovano umjesto da se pogodi.

**Posljedice u istom prolazu**

- gumb čiji uslov nije ispunjen je **odsutan sa razlogom**, ne mrtav bez
  objašnjenja — osim kad član uslov može ispuniti tu *(razlog nije upisan →
  mrtav, a traka piše šta fali)*
- svaki čin koji šalje nešto banci mora pokazati **šta banka vidi**
- „ništa više" je imenovan ishod, ne prazan ekran
- **čin koji propadne mora odbiti, ne javiti uspjeh** — funkcija imenovana u
  `perform=` ne smije uhvatiti vlastiti neuspjeh a ne baciti ga dalje. Čuvar:
  `src/ActsMustRefuse.test.ts`

**Tri vrste ishoda, i zašto se broje odvojeno**

Nijedan brojač ne smije biti namješten da odstupanje prođe kao urađeno. Zato
odstupanje nosi oznaku u kodu, uz razlog:

| oznaka | znači | ko |
|---|---|---|
| — | prozor prije, „šta slijedi" poslije | 49 |
| `NO-WINDOW: <čin>` | prozora nema namjerno | `recordFinding` *(glavna petlja, 6–20 uslova zaredom)* · `screen` i `recognise` *(ne upisuju ništa; `recognise` se i ne pritiska)* · `markHolding` |
| `NO-AFTER: <čin>` | prozor postoji, odgovor se **vidi** umjesto da se izgovori | `openMatter` · `setParameters` · `changeHowItDecides` · `recordComputation` · `withdrawComputation` · `report` *(odvede na sam prekršaj)* |

**Gotovo je kad:** mjera kaže 0 u koloni *bez jednog ili oba*, svaka oznaka
u drugoj i trećoj koloni ima razlog napisan iznad sebe u kodu, i mjera je
dokazala da hvata — ubačen kvar mora biti prijavljen. **Ispunjeno
20.09.2026.**

---

### FAZA 6 · Pet stanja svakog ekrana — **URAĐENO 20.09.2026.**

**Posao:** *prazno · učitava · djelimično · greška · idealno* na svih 50
čvorova. Uz njih dva koja su naša: **zid** *(čin postoji, ekran ne)* i **nema
pojma** *(nema ključa, lanca, volumena, releja)*.

#### Stanje „učitava" — aplikacija je gušila samu sebe · **POPRAVLJENO 20.09.2026.**

Nađeno usput, dok se popravljao uslov smiraja u mjerama: na serveru
usporenom za 2,2 sekunde početni ekran je stajao na „Loading…" **četrnaest
sekundi**, i šest od tih četrnaest bez ijednog zahtjeva u letu.

U tragu jednog otvaranja: dvadeset zahtjeva. `/api/attention` **deset do
dvanaest puta**, `/api/queue` šest, i **četiri odvojene SSE veze** na
`/api/pulse`.

| šta | zašto |
|---|---|
| `useIdentity` se zove na **72 mjesta**, svaki put svoj `/api/attention` | ko gleda se ne mijenja između dvije komponente istog ekrana |
| `useRevision` otvara **`EventSource` po komponenti**, a tok nikad ne završi | preglednik drži **šest** veza po domaćinu; svaki tok preko prvog oduzme mjesto zahtjevu koji stvarno čeka |

Zato su odgovori stizali u parovima. Na lokalnom serveru se ništa od ovoga
ne vidi — odgovor dođe za milisekundu, pa dvanaest istih zahtjeva izgleda
kao jedan.

**Popravka:** pita se jednom i dijeli. Identitet ide kroz jedno obećanje;
tok je jedan za cijelu aplikaciju, otvori se kad prvi ekran pita i zatvori
kad zadnji prestane.

**Šta se odmah vidjelo:** dvanaest testova je palo isti čas. Svaki od njih
se usred testa prijavi kao neko drugi — što je ista zastarjelost koju bi
imao i pravi član da se odjavi i prijavi kao neko drugi. Odatle
`forgetIdentity`, i `beforeEach` u `test-setup.ts` koji svaki test počinje
kao novo učitavanje stranice.

**Mjereno, na proizvodnoj gradnji (bez StrictMode udvostručavanja):**

| | prije | poslije |
|---|---|---|
| `/api/attention` po ekranu | 10–12 | **1** |
| otvorenih tokova, početni ekran | 2 | **1** |
| zahtjeva, početni ekran | 18 | **7** |
| zahtjeva, postavke | 24 | **9** |
| do sadržaja na usporenom serveru | 14,0s | **2,8s** |

Mjere: `work/majlis-local/veze.mjs` *(koliko veza, koliko istih pitanja)* i
`cekanje.mjs` *(trag svakog zahtjeva sa vremenom)*.

**Ostaje zapisano, nije popravljeno:** `/api/queue` se na početnom ekranu
traži četiri puta — dva pozivaoca, svaki uz osvježavanje na puls. Ne drži
prvi prikaz i nije ista vrsta kvara; `lib/news.tsx` poredi staro i novo da
bi znao *šta je novo*, pa dijeljenje te kopije nije bezopasno.

**Posljedice u istom prolazu**

- prazno nikad ne piše „nema podataka" — piše **zašto** je prazno i **šta
  uraditi**
- server koji ćuti ≠ *nema ničega*. Dvije rečenice
- greška koja se ponovi tri puta nudi šta dalje
- `aria-busy`, `aria-live`, `aria-invalid` — inače čitač ekrana ne zna ništa
  od ovoga

#### Šest pitanja §35.5 — **20 od 20, 20.09.2026.**

Mjeri se sa `sest2.mjs` (1, 3, 5, 6) i `traka2.mjs` (2). Četvrto se ne
mjeri: *može li se korak obaviti bez miša* je prolazak, ne brojka.

Od pet ekrana koji su padali, **tri nisu bila kvar nego mjera koja nije
gledala** — puni nalaz je u FLOW §35.5. Dva su bila pravi kvar i popravljena
su: postavke 436 → 335, obaveze 436 → 389.

Uz njih jedan koji je vrijedio svuda: `Division` i `Part` nose
`first:pt-0` da bi prva sekcija stajala spojena sa zaglavljem, a to nije
važilo nijednom — `PageHead` iscrtava `<header>`, pa nijedna sekcija nije
`:first-child`. Sa `first-of-type` prva sekcija napokon stoji spojena, na
svakoj stranici.

#### Tri natjerana stanja — **20 od 20, 20.09.2026.**

`stanja.sh` lomi server na tri načina i gleda šta ekran kaže:

| | |
|---|---|
| puklih | **0** |
| „prazno" i „tišina" istim riječima | **0** |
| bez ijednog `aria-live` u sva tri | **0** |
| neizmjerenih | **0** |

Dva ekrana su izuzeta **sa razlogom upisanim u mjeru**: `/calculations` i
`/search` ne traže ništa pri otvaranju — računanja su aritmetika koja se
radi ovdje, pretraga čeka upit — pa su im tri stanja ista s pravom.
Provjereno sa `veze.mjs`: jedini zahtjevi na tim ekranima su ljuskini. Za
njih se pravo pitanje postavlja drugdje, i postavljeno je: `cinnamrtvom.mjs`
ukuca upit nad mrtvim serverom i pretraga kaže sve troje — *nije mogao
pitati · zapis je netaknut · pokušaj ponovo, pa pogledaj server* — **8 od 8**.

`SVE=1` skine te izuzetke i mjera ih odmah prijavi, što je dokaz da poređenje
radi.

**I jedno o samoj mjeri.** Sva tri stanja u jednom pregledniku ne rade: 60
ekrana ga iscrpe i on počne prijavljivati nasumične ekrane kao pukle. Dva
uzastopna prolaza optužila su *različite* ekrane — prvi obaveze, drugi
prekršaje — a nijedan se ne ponovi kad se pokrene sam. Zato jedna faza po
pregledniku, nalaz na disk, sažetak od tri fajla; `stanja.sh` to veže. Bez
toga sam skoro popravljao dva ekrana koja nikad nisu bila pokvarena.

#### Djelimično — **20 od 20, 20.09.2026.**

Najopasnije od pet stanja, jer se jedino ne vidi. Prazno, greška i tišina
ekran ili nema ili kaže; djelimično znači da je dobio tri od pet stvari,
iscrtao ta tri uredno, i član čita nepotpun zapis kao potpun — pa na njemu
odlučuje.

`djelimicno.mjs` prvo popiše šta ekran traži, pa pusti **glavnu** putanju
čitavu i obori **svaku sljedeću** čitavu. Tako ekran uvijek ima šta pokazati,
i pita se kaže li i šta mu fali.

| | |
|---|---|
| pukli | **0** |
| dobili dio a ćute | **0** *(bilo 6)* |
| neprimjenjivo — jedna putanja | 13 |

Trinaest ekrana traži samo jedan izvor: oboriti ga znači napraviti grešku,
koja je već izmjerena. To nije prolaz nego **neprimjenjivo**, i tako se broji.

**Šest pravih kvarova, svi istog oblika:** neuspjelo čitanje spremano je u
istu vrijednost kao zakonito odsustvo.

| gdje | šta je značilo |
|---|---|
| `MatterFlow` | koraci nisu stigli → isto kao predmet **bez oblika**. Traka koraka nestane, radno okno prazno, ekran ćuti |
| `VotePanel` | zbir glasova nije stigao → isto kao **nijedan glas**. Ekran piše *THE VOTE*, nijedan broj, i nudi **Close the vote** |
| `Record` | šta je odlučeno nije stiglo → prazna lista, a ekran napiše **„Nothing has been settled yet"** |
| `Examinations` | propisi na snazi nisu stigli → **„nema ništa na snazi"**, i izuzetak se ne mjeri ni na šta |
| `Meetings` | sastav odbora nije stigao → prisustvo i kvorum se ne mogu izvesti, tiho |
| `Dashboard` | registry i vremena čekanja nisu stigli → oba tiho odbačena |

**Zatvaranje glasanja je uklonjeno kad zbir nije pročitan.** Isto pravilo
koje već stoji iznad *otvaranja* glasanja: kontrola koja se ne može ispuniti
je **odsutna, ne onemogućena**, a na njenom mjestu stoji rečenica koja kaže
zašto.

**I jedna stvar naučena usput:** prvo sam poruku stavio na dno stranice, a
ekran je i dalje pisao „Nothing has been settled yet" tamo gdje lista treba
biti — lažna tvrdnja prva, ispravka ispod pregiba. Član čita prvu. Poruka
sada stoji **umjesto** liste, ne ispod nje.

`SABOTAZA=1` sakrije sve što mjera traži: tada prijavi 6 ćutljivih. Bez nje
0 — dokaz da poređenje radi.

**Gotovo je kad:** svaki čvor prođe test od šest pitanja iz §35.5.
**Ispunjeno 20.09.2026.** — šest pitanja 20/20, tri natjerana stanja 20/20,
djelimično 20/20.

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

#### Mjereno, 20.09.2026. — **6 od 6**, `work/majlis-local/izdavanje.mjs`

Mjeri se doslovno: zatvori se glasanje u pregledniku i gleda se šta ekran
**sam** ponudi. Sve što traži još jedan pritisak da bi *uopšte postojalo* je
pad; ono što postoji a treba ga samo otvoriti nije — jer papir se sastavlja
sam, a čovjek ga šalje.

| | |
|---|---|
| odluka je na snazi | ✓ |
| broj iz serije dodijeljen sam | ✓ *(`SSB/2026/4`)* |
| odluka kao papir ponuđena bez traženja | ✓ *(bilo: samo kroz dosje)* |
| nacrt klauzula ponuđen bez traženja | ✓ *(bilo: samo kroz dosje)* |
| potpisivanje otvoreno odmah | ✓ |
| obavijest odboru sastavljena sama | ✓ *(bilo: nije postojala)* |

**Dvije stvari su nedostajale, obje nađene mjerenjem.**

**Papiri su se sastavljali i prije** — obje rute odgovaraju 200 čim odluka
sjedne — ali su se dosezali samo kroz dosje. Predsjedavajući koji je tek
zatvorio glasanje morao je ići tražiti ono što je zatvaranje napravilo.
Sada stoje na ekranu na kojem ga je čin ostavio, uz potpisivanje.

**Obavijest kad odbor odluči nije postojala.** `notice.ts` zna sastaviti
tri događaja, a aplikacija je sastavljala **jedan** — *pitanje je stiglo*.
Pitanje koje dobije **odgovor** nije sastavljalo ništa, pa je jedini
trenutak u kojem rad odbora proizvede rezultat bio jedini trenutak u kojem
niko nije obaviješten. Sada se sastavi sama, na oba ulaza u snagu — kad
glasanje sjedne *(zabrana)* i kad istekne rok *(dozvola)* — i putuje uz
sam čin, pa ekran u istom dahu kaže riječi i to da **nisu poslane**.
Šest testova, uključujući dva negativna: odbijen predmet ne sastavlja
ništa, i dozvola u roku ne sastavlja ništa.

#### Broj iz serije pod istovremenošću — **izmjereno jedinstven, ali garancija nije u konstrukciji**

Šest zatvaranja odjednom, dva puta: šest različitih brojeva oba puta.
`work/majlis-local/brojevi.mjs`.

Ali to nije dokaz da ne može. Ruta čita **sve** predmete u `held` *prije*
nego pozove `changeMatter`; upis jeste serijalizovan, a ulaz u račun nije.
Da se dva zahtjeva poklope između tog čitanja i upisa, oba bi izvela isti
sljedeći broj. Nije se desilo ni u jednom pokušaju — **ali razlog je
raspored, ne konstrukcija.** Zapisano ovdje da se zna šta je izmjereno, a
šta nije dokazano.

#### Dvije stvari koje Faza 7 traži, a arhitektura ih namjerno odbija

Ovo se ne rješava usput — ide vlasniku na odluku.

| traženo | šta kod kaže |
|---|---|
| *upis u policy registry* | `enforcement.ts`: **„Nothing here ever performs enforcement. Majlis records a decision; it does not execute it."** Adapter samo **čita** šta izvršni sistem trenutno kaže, da odbor vidi slaže li se to sa odobrenim. Isto piše i u podnožju svakog ekrana: *ništa ovdje ne potpisuje u ime odbora* |
| *obavijest banci* | `notice.ts`: **„Nothing here holds an address book."** Obavijest ide članovima odbora, a kome i kako se javlja institucija je njena stvar. Uz to, predmet nema vezu na upit iz kojeg je nastao, pa se ni ne zna koji je stol pitao |

Obavijest odboru je zato urađena; obavijest **banci** i upis u registar nisu
i **neće biti** dok ne kažeš da granica pada. Izmisliti ih usput značilo bi
srušiti tvrdnju na kojoj cijeli proizvod stoji.

**Gotovo je kad:** od zatvaranja glasanja do gotovog papira — nijedan klik.
**Ispunjeno 20.09.2026.** za sve što ne traži rušenje te granice.

---

### FAZA 8 · Rupe koje nisu ukras — **URAĐENO 20.09.2026.**

| | |
|---|---|
| Timelock kad istekne | danas ništa ne prevrne stanje samo |
| Stare adrese ugovora | moraju se odbiti, ne prihvatiti tiho |
| Spajanje instrumenata *(N-74)* | **rute nema** — dva zapisa o istom ostaju dva |
| Zid: unovčavanje koda | čin postoji, ekrana nema |
| Zid: prijava banke | uloga postoji, vjerodajnica ne |

**Posljedica:** svaki zid se **piše kao zid** na ekranu, ne kao greška i ne
kao tišina.

#### Urađeno 20.09.2026. — dvije popravke i tri zida

**Timelock kad istekne.** Sweep je već hvatao zrcalnu sliku — zabrana koja
preživi rok za ratifikaciju čitala se kao na snazi iako je istekla — a
suprotan smjer je bio ostavljen pritisku. Dozvola kojoj rok prođe stajala je
u `timelock`: zapis kaže *još se čeka* dok je čekanje gotovo. To čini da
datum stupanja na snagu zavisi od toga kad se neko sljedeći put prijavio.

Sweep sada donosi i te dozvole, kroz `bringIntoForce`, koji već nosi sve
brave. **Sedam testova**, tri od njih traže da sweep **ne** dira: prigovor u
roku zaustavlja promjenu · rok koji još teče se ne skraćuje iznutra ·
predmet koji nije u roku se ne dira. Dvije dozvole u istom prolazu dobiju
dva broja, ne jedan dvaput.

**Stare adrese ugovora.** Zamijenjen ugovor **nije nestao** — odgovara na
`paused()` i `owner()` tačno kao i prije, sa stanjem od dana kad je prestao
biti protokolov. Uperi Majlis u njega i svako čitanje uspije: `reachable`,
bez greške, zelen ekran, koji prijavljuje stanje izvršenja registra koji
**ništa ne izvršava**. Odboru bi bilo pokazano da ono što radi odgovara
odobrenom, na dokazu iz mrtvog ugovora.

Odbija se **po adresi, prije ijednog čitanja**, i odbijanje imenuje koji je
ugovor i koja je važeća adresa. **Šest testova**, dva od njih čuvaju od
pretjerivanja: adresa koja nije na popisu prolazi do stvarnog pokušaja veze,
i važeća adresa nikad ne smije biti na popisu.

*Nađeno uživo i popravljeno:* ekran je iznad odbijanja i dalje tvrdio „ono
što registar čita jest ono što je odbor odobrio". Sada pada na formulaciju
koja je istinita, i odbijanje se **ne** piše kao „nedostupno" — inače bi neko
pokušavao ponovo dok jednog dana ne „proradi".

**Tri zida, napisana kao zidovi**

Razlika koju ova faza povlači: nešto pokvareno, nešto čega nema, i nešto što
**nikad nije ni napravljeno**. Ova tri su treća vrsta.

| zid | gdje piše |
|---|---|
| **unovčavanje koda** — `account.redeemReset` stoji u kodu i **niko ga ne zove** | postavke |
| **prijava banke** — uloga postoji, vjerodajnica se ne može izdati nijednoj | postavke |
| **spajanje instrumenata (N-74)** — dva zapisa o istom ostaju dva, i broje se dvaput u svakom zbiru | registar |

Svaki kaže i **šta to košta**, ne samo da nedostaje. Član koji traži
kontrolu koje nema zaključi da je aplikacija pokvarena; nije pokvarena, ovo
ne može, a to je druga rečenica.

**Gotovo je kad:** svaki zid stoji napisan na ekranu na kojem bi ga član
tražio. **Ispunjeno 20.09.2026.**

---

### FAZA 9 · Sedam odluka vlasnika — **URAĐENO 20.09.2026.**

Ne rješavaju se kodom. Dok ne odluči, **ostaju napisane na ekranu kao
nedostatak**, ne prešućene.

#### Izmjereno prije pisanja, 20.09.2026. — dvoje je bilo zastarjelo

Popis je bio napisan ranije i **nije se smio prepisati napamet**. Provjereno
je svih sedam u kodu:

| | stavka | izmjereno stanje |
|---|---|---|
| 1 | **Izuzeće člana** | nema **ničega** nigdje — ni rute, ni polja, ni riječi → **odluka** |
| 2 | **Ratifikacija zabrane** | gore nego što je pisalo: `ratify()` **postoji** u `lifecycle.ts`, **nema rutu**, i **nigdje se ne bilježi** da se desila → svaka zabrana istekne i to se **ne može spriječiti** → **zid** |
| 3 | **Ko prijavljuje prekršaj** | dijelom zastarjelo: prijavljuju potpisnik, savjetodavni član **i veza sa institucijom**; stol institucije ne može. Ko **plaća** purifikaciju se ne bilježi uopšte → **odluka** |
| 4 | **Nalaz dok glasanje traje** | kod **dozvoljava** — `OPEN_TO_FINDINGS` sadrži `voting` → **odluka** |
| 5 | **Promjena glasa** | pravilo **jeste** napisano, u tekstu odbijanja: „može se povući i zamijeniti". Čina za povlačenje **nema** → **zid** |
| 6 | **Glasanje bez rasprave** | bio **kvar**, ne odluka — **popravljen** |
| 7 | **Kvorum i serija** | **zastarjelo** — `changeHowItDecides` postoji i mijenja kvorum, prozor i seriju |

**Šesto je popravljeno, jer nije bila odluka nego kvar.** Pravilo *„kontrola
koja se ne može ispuniti je odsutna, ne onemogućena"* stoji napisano tačno
iznad tog gumba — i bilo je primijenjeno samo na uslove, ne i na raspravu.
Na predmetu na kojem niko ništa nije rekao gumb se nudio, pritiskao, i
server je odgovarao *glasanje se otvara poslije rasprave, ne umjesto nje*.
Tačno onaj gumb za koji komentar iznad kaže da ne smije postojati. Sada je
odsutan, a na njegovom mjestu stoji šta bi ga otvorilo.

Tri testa su pala na tu izmjenu i **sva tri su tvrdila staro ponašanje** —
uključujući fajl koji se zove `TheVoteIsNotOffered.test.tsx` i koji je tražio
gumb na predmetu bez ijedne riječi rasprave.

#### Pet koje ostaju — napisane na ekranu, ne prešućene

| gdje | šta stoji |
|---|---|
| **predmet**, okno *Limits* uz posao | izuzeće · promjena glasa · nalaz dok se glasa · ratifikacija *(samo na zabrani na snazi)* |
| **prekršaji**, ispod liste | ko prijavljuje i ko plaća purifikaciju |

Okno *Limits* je četvrto uz *Guidance · What was said · Sources*, a ne u
radnom oknu — jer §35.5 drži radno okno na 150 riječi i ono stoji na 53.
Šest odlomaka tamo bi zamijenilo jedan standard drugim. Provjereno poslije:
**20 od 20, radno okno i dalje 53 riječi.**

*Nađeno i popravljeno usput:* četvrti jezičak nije stao u okno od 320
piksela — lomio se u tri reda, pa je sa `whitespace-nowrap` ispao van vidika.
Okno je sada 368 piksela i sva četiri stoje. Jezičak koji član ne vidi je
gori od prelomljenog.

Najoštrije od svega je **ratifikacija**: kalendar odbrojava do roka za čin
koji niko ne može izvršiti, i kad rok prođe sweep obori zabranu. Odbor
donese zabranu na smanjenom kvorumu, namjerava je potvrditi u roku, i **ne
može** — a zapis to poslije čita kao da nisu ni pokušali.

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

### FAZA 11 · Pravi upit banke, kao PDF

Traženo 19.09.2026.

Do sada je svaki dokaz da put od banke do odbora radi bio dokaz na tekstu
koji sam sâm utipkao. Banka ne šalje utipkan tekst — šalje dopis i uz njega
nacrt ugovora, u PDF-u, sa zaglavljem, brojem predmeta i potpisom.

| šta | done-uvjet |
|---|---|
| Jedan PDF: dopis treasury stola + nacrt murabahe | postoji u `apps/majlis/samples/`, čita se kao papir a ne kao ispis |
| Prilaže se kroz **Ask** i stiže na predmet | otvoreno pitanje pokazuje priložene riječi, ne ime datoteke |
| Čitanje protiv oblika radi na njemu | `readAgainstShape` vraća uslove sa navodom, doslovno, iz tog PDF-a |
| Ono što se ne može pročitati — kaže se | polje bez navoda je prazno i imenovano, nikad pogođeno |

**Posljedica koja se rješava u istom prolazu:** ako PDF uđe a izvlačenje
pogađa, cijela §7 laž — *citat se provjerava doslovno* — pada na prvom pravom
papiru. Prag pouzdanosti i potvrdi-ili-ispravi moraju raditi na ovom PDF-u,
ne na uzorku koji im odgovara.

---

### FAZA 12 · Upute na engleskom, do zadnjeg detalja

Traženo 19.09.2026.

Ovo je jedina isporuka koju ne mogu provjeriti testom: da neko ko nije ja
otvori aplikaciju i zna šta radi. Sve dosad napisano — FLOW, GRADNJA, RESUME
— pisano je za mene.

| šta | done-uvjet |
|---|---|
| Kako se postavlja i pokreće | banka dobije odbor, ključeve i zapis koji preživi gašenje |
| Svaka od osam uloga: šta vidi i šta smije | za svaku ulogu jedan prolaz kroz njen posao |
| Svaki čin: šta radi, šta znači, šta poslije | 59 činova, nijedan ne fali |
| Svaki ekran: čemu služi i odakle se dolazi | 20 ekrana, sa slikom |
| Sve kratice tipkovnice | ono što `?` pokazuje, i ništa što ne radi |
| Šta aplikacija **ne** radi | izrečeno, ne prešućeno |

**Posljedica koja se rješava u istom prolazu:** upute pisane iz koda uvijek
opisuju ono što je pisac htio. Svaki korak u uputama mora biti prošetan u
pregledniku dok se piše — ono što se ne da prošetati ne ide u upute nego na
popis kvarova.

Piše se na engleskom, jer je to jezik u kojem se ovo prodaje.

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
| **Svako gledanje uživo gleda i četvrto** | vlasnikovo pravilo, 16.09. — vidi ispod |
| **Traži prije nego napraviš** | dvaput sam napravio ono što Majlis već ima; grep za sposobnost **i** za i18n prefiks |
| **Ništa ne postaje obavezujuće administracijom** | mijenjanje standarda traži odluku na snazi, ne gumb |
| **Aplikacija predlaže, čovjek odlučuje** | granica §11.9 je granica cijelog proizvoda |
| **Proza nikad kroz `node -e`** | navodnici i CRLF tiho pojedu tekst; `Edit` ili `.mjs` fajl |
| **Port 4102**, nikad 4000 | 4000 je vlasnikova instanca |
| **Commit je AbZe628**, bez ikakvog traga alata | — |
| **Pitaj prije svakog guranja na GitHub** | svaki put, bez izuzetka |

---

## 5b · Šta se gleda pri svakom gledanju uživo

Vlasnikovo pravilo, 16.09.2026. Pokretanje nije samo *radi li* — nego **i ovo,
svaki put, kroz sve dijelove aplikacije**:

| | pitanje | pada ako |
|---|---|---|
| 1 | **Je li isto kao na slikama?** | ekran odstupa od nacrtanog *(artefakt: osam pa devet radnih prozora)* a promjena nije tražena |
| 2 | **Je li lijepo ispisano?** | rečenica zvuči kao softver a ne kao čovjek |
| 3 | **Ima li AI opisa?** | bilo gdje piše da je nešto „generisano", „AI-powered", ili rečenica u tom registru |
| 4 | **Je li lijepo raspoređeno?** | preklapanje, tekst koji izlazi iz okvira, kolona koja se guši, razmak koji skače |

**Kako se mjeri, ne procjenjuje:**

```js
// preklapanje — dva elementa koja se vizuelno gaze
// tekst koji bjezi iz svog okvira — scrollWidth > clientWidth
// prelomljena rijec — element uzi od svoje najduze rijeci
// AI registar — pretraga po ispisanom tekstu, ne po kodu
```

Nalaz se **ne popravlja usput** ako pripada drugoj fazi — zapisuje se, kao i
svaka druga rupa. Ali **AI registar i preklapanje se popravljaju odmah**: prvo
je laž o tome šta ovo jeste, drugo je kvar koji se vidi.

---

## 6 · Šta se pita vlasnika, a šta ne

**Ne pita se:** kako se nešto zove u kodu, koji CSS, kojim redom unutar faze,
kako se mjeri.

**Pita se:** sedam odluka iz faze 9 · boje kojih nema u paleti · prag
pouzdanosti za brojke iz PDF-a · **prije svakog guranja na GitHub**.
