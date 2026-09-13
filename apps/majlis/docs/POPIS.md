# Popis — šta je dogovoreno, šta postoji, i vodi li aplikacija

Pisano 13. septembra 2026. Drugi prolaz, sa strožim mjerilom.

---

## Mjerilo

Vlasnikovim riječima, jer po ovome se sve mjeri:

> Aplikacija mora imati sve funkcionalnosti povezane kroz UI. Kad korisnik uđe,
> da zna sve što raditi bez da je ikad koristio aplikaciju prije.
>
> Ne samo da se može doći klikom, nego da su funkcionalnosti u putu. Kad dođe
> pitanje, po automatizmu se ubacuju u svaki korak, kako aplikacija vodi
> korisnika.

Iz toga slijede tri praga, i svaki je stroži od prethodnog:

1. **Postoji** — servis radi
2. **Dostupno** — postoji ekran koji ga zove, i do njega se dolazi klikom
3. **U putu** — sam se pojavi na koraku gdje treba, bez da ga čovjek traži

Prvi prolaz ovog popisa mjerio je samo prva dva praga. Treći je ono što je
vlasnik tražio od početka i on mijenja ocjenu na više mjesta: šest kalkulatora
je bilo označeno kao gotovo jer ih ima na `/calculations`, a po trećem pragu
samo jedan od šest je i blizu.

## Oznake

| | postoji | dostupno | u putu |
|---|---|---|---|
| **DA** | da | da | da |
| **DOST** | da | da | ne, moraš ga sam potražiti |
| **KOD** | da | ne, nijedan ekran ga ne zove | ne |
| **NE** | ne | | |
| **VANI** | koliko se može bez banke ili bez izmjene ugovora | | |
| **—** | nije alat u toku, pa treći prag ne važi | | |

---

# Dio A — Put korisnika

Ovdje se vidi šta zapravo ne valja. Ovo nije popis funkcija nego redoslijed
kojim čovjek prolazi, i na svakom koraku piše šta aplikacija sama ponudi.

## A1. Pitanje stiže

Banka ga postavi na `/ask`, ili sekretar unese.

| šta treba da se desi | stanje |
|---|---|
| Pitanje se pojavi na ekranu pitanja | DA |
| Ugovor koji je stigao uz pitanje se vidi, cijeli tekst | DA |
| **Aplikacija sama prepozna koju od 19 formi ugovor liči** | DA — `TheDraftThatCame.tsx` to radi sam, čim se pitanje otvori |
| Sažetak dugog dokumenta | DOST — dugme, ne sam |
| Potvrda banci da je pitanje stiglo | VANI — tekst se sastavi, email se ne šalje |

**Ocjena koraka: dobar.** Ovo je jedino mjesto u cijeloj aplikaciji gdje se
alat pojavi sam od sebe na pravom mjestu.

## A2. Pitanje postaje predmet

| šta treba da se desi | stanje |
|---|---|
| Jedan čin otvara predmet iz pitanja | DA — `SmartRaise.tsx`, pita u ljudskim riječima |
| Nacrt predmeta se popuni iz pitanja | DA |
| Smjer (dozvola ili zabrana) bira čovjek, ne softver | DA, namjerno |

**Ocjena koraka: dobar.**

## A3. Predmet se radi

Ovo je srce aplikacije i najslabiji dio.

Danas je stranica predmeta **zid od dvanaest odjeljaka**, jedan ispod drugog:
prolaz, naslijeđeno, gdje završava, potpis, šta radi u praksi, uslovi,
vijećanje, dokazi, lista za kvačicu, screening, presedan, izvori, glasanje.

Sve postoji. Ništa ne vodi.

| šta dokument obećava (pogl. 4) | stanje |
|---|---|
| **Uslovi forme postaju koraci predmeta** | NE — `Checklist.tsx` je popis za kvačicu, ne koraci |
| **Korak koji traži brojku otvara kalkulator u sebi, već popunjen** | NE |
| Svaka brojka pokazuje stranicu iz koje je uzeta | KOD — `extraction.ts` to zna, nije spojeno |
| Rezultat ostaje na uslovu, ne odlazi na poseban ekran | NE |
| Korak koji dokument ne odgovara postaje pitanje banci | NE |
| Sat na predmetu staje dok banka odgovara | NE |
| **Glasanje se ne otvara dok svi koraci nisu odgovoreni** | NE — ruta za glasanje ovo ne provjerava |
| Uslov koji odbor izuzme putuje na pisanu odluku | NE |

**Ocjena koraka: ovdje je posao.** Od osam obećanja iz poglavlja 4, nijedno
nije ispunjeno u obliku koji vodi.

### Kalkulatori, po trećem pragu

| kalkulator | postoji | otvara se sam iz koraka |
|---|---|---|
| Screening | DA | skoro — jedini je na stranici predmeta, ali kao odjeljak, ne kao korak |
| Tangibilnost | DA | NE |
| Purifikacija | DA | NE |
| Zekat | DA | NE |
| Raspodjela dobiti | DA | NE |
| Zatezna kamata | DA | NE |

## A4. Glasanje i period čekanja

| šta treba | stanje |
|---|---|
| Brojanje glasova naspram praga | DA |
| Prigovor u periodu čekanja zaustavlja odluku | DA |
| **Potpis otiskom, licem ili PIN-om** | NE — nula rezultata za passkey u cijelom kodu |
| Broj sakupljenih potpisa | DA |
| Obavijest potpisnicima da je glasanje otvoreno | VANI — email |

## A5. Odluka izlazi

| šta treba | stanje |
|---|---|
| Fatva sa brojem, potpisom, u dva jezika | DA |
| Nacrt klauzula ugovora iz onoga što je odbor odlučio | DA |
| **Odluka emailom onome ko je pitao** | VANI — ne šalje se |
| **Upis u policy registry** | VANI — registry je `onlyOwner` |
| Veza verzije registryja nazad na odluku | NE |

## A6. Odluka na snazi

| šta treba | stanje |
|---|---|
| Pravilo ima svoju stranicu | DA — od 13.09. |
| **Šest pitanja na istih šest mjesta** (pogl. 12) | 2 od 6, i to na pogrešnom ekranu |
| Šta odbor odlučio, njegovim riječima | DA |
| Kako se mjeri | POLA — kroz `meaning` parametra |
| Kreće li se | NE |
| Kad se provjerava | postoji u `carrying.ts`, **vidi se samo na predmetu prije glasanja** |
| Šta se dešava ako padne | isto |
| Ko se obavještava | NE |
| Gdje pravilo nije mjerenje, reći da ga ništa ne mjeri | NE |

## A7. Banka radi po odluci

| šta treba | stanje |
|---|---|
| Banka ima svoja tri vrata i ne vidi odborove ekrane | DA |
| Šta me obavezuje, operativno | DA — `BindsMe.tsx` |
| **Padajući popis dozvoljenih instrumenata iz registra** | NE |
| Popis pokazuje i ono što odboru nikad nije postavljeno | NE |
| Šta dugujem | DA — `IOwe.tsx` |

## A8. Kasnije: pregled, prekršaj, drift

| šta treba | stanje |
|---|---|
| Pregled bilježi period, uzorak, kako je biran | DA |
| Uslovi koje pregled nije dosegao se imenuju | DA |
| Prekršaj kroz osam faza, 30 dana od nalaza | DA |
| Purifikacija se računa, ne kuca napamet | DA |
| Drift kao pitanje, ne kao prekršaj | DA |
| **Provedba: je li urađeno ono što je odbor tražio** | KOD — ruta postoji, nijedan ekran je ne zove |
| Podsjetnici na sat od 30 dana | VANI — email |

## A9. Godina za revizora

| šta treba | stanje |
|---|---|
| Godišnji paket sa svim iz poglavlja 8 | DA |
| Paket kaže svoja ograničenja na prvoj stranici | DA |
| Kao dokument, kao podaci, kao pojedinačne odluke | DA |
| Banka može skinuti prošlu godinu za revizora | DA |

---

# Dio B — Po poglavljima dogovora

Isto gradivo, poređano kao u priručniku, da se može provjeriti stavku po
stavku. Kolona **put** je treći prag.

## 1–3. Šta je, ko koristi, od pitanja do odluke

| stavka | stanje | put |
|---|---|---|
| Sve je predmet sa fazom, sljedećim činom i vlasnikom | DA | — |
| Pet uloga na odboru | DA | — |
| Strana banke ne vidi odborove ekrane | DA | — |
| Životni ciklus od pitanja do snage | DA | — |

## 4. Kako softver vodi

Vidi A3. **Nijedna od osam stavki nije ispunjena.**

## 5. Alati

### Čitanje dokumenta

| alat | stanje | put |
|---|---|---|
| Sažetak | DOST | NE — dugme |
| Prepoznavanje forme | DA | DA |
| Provjera uslova | DOST | NE |
| Brojke iz dokumenta | KOD | NE |
| Bilješke na pasusu | DA | DA |
| Pretraga | DA | — |
| Dokument se sažima čim stigne | NE | |

### Kalkulatori

Vidi tabelu u A3. Šest postoji, nijedan se ne otvara iz koraka.

| stavka | stanje |
|---|---|
| Novac kao tačan decimalni broj | DA |
| Svaki izračun ima adresu i pokazuje aritmetiku | DA |
| Povlačenje izračuna | KOD |

### Odlučivanje

| alat | stanje | put |
|---|---|---|
| Šta se dešava sljedeće | DA | DA |
| Presedan | DA | DOST |
| Uslovi od prošlog puta | DA | DOST |
| Šta pravilo radi u praksi | DA na predmetu | NE na pravilu |
| Dokazi za i protiv | DA | DOST |
| Komisije: formiranje i čitanje | DA | DOST |
| Komisije: izvještaj nazad | KOD | NE |
| Brojanje glasova | DA | DA |
| Prigovor | DA | DA |
| Nacrt klauzula | DA | DOST |
| Pisana odluka | DA | DA |

### Nadzor

| alat | stanje |
|---|---|
| Drift | DA |
| Pregledi na redu | DA |
| Rokovi | DA |
| Provedba | KOD |
| Tempo | DA |
| Kalendar sa pretplatom | DA |

### Zapis

| alat | stanje |
|---|---|
| Registar za čitanje | DA |
| Dodavanje holdinga | KOD |
| Povlačenje holdinga | KOD |
| Dosje holdinga | DA |
| Forme ugovora, svaka sa svojom stranicom | DA |
| Historija izmjena forme | KOD |
| Priručnik usklađenosti | DA |
| Papiri za sjednicu | DA |
| Godišnji paket | DA |
| Obavijesti | VANI |
| Izvoz | DA |

## 6–8. Prekršaj, pregledi, godina

Vidi A8 i A9. Sve DA osim provedbe (KOD) i podsjetnika (VANI).

## 9. Asistent

| stavka | stanje |
|---|---|
| Čita, prepoznaje, pamti, sastavlja, objašnjava | DA u kodu |
| Radi bez ključa, ugašen, i to kaže | DA — `AssistantOff` |
| Živi poziv modelu | VANI — treba `ANTHROPIC_API_KEY` |
| Ne kaže šta je dozvoljeno, ne preporučuje glas | DA |
| Sažetak prije glasanja šta će odluka raditi | DA na predmetu, NE na pravilu |

## 10. Potpisivanje

| stavka | stanje |
|---|---|
| Passkey potpis | NE |
| Upis uređaja | NE |
| Bez novčanika i naknade | DA po dizajnu |

## 11. Sa lancem i bez

| stavka | stanje |
|---|---|
| Radi potpuno bez lanca | DA |
| Čitanje policy registryja | DA |
| Upis u registry | VANI |
| **Oznaka na svakom holdingu i svakom pravilu: konvencionalno ili tokenizirano** | NE — danas je to postavka cijele instalacije, ne osobina holdinga |
| Obrazloženje nikad na lanac | DA po dizajnu |

## 12. Stolovi u banci

| stavka | stanje |
|---|---|
| Padajući popis instrumenata iz registra | NE |
| Red za ono što odboru nikad nije postavljeno | NE |
| Šest pitanja po pravilu | 2 od 6 |

## 13. Šta sistem šalje

| stavka | stanje |
|---|---|
| Prima nacrte, dokaze, planove, papire | DA |
| Proizvodi odluku, paket, zapisnik, izračun, spis | DA |
| **Šalje emailom** | VANI — danas ne šalje nikome ništa |
| Svako bira šta mu stiže i koliko često | NE |

## 14. Postavke

| stavka | stanje |
|---|---|
| Lozinka | DA |
| Jezik: engleski, arapski, urdu | DA |
| Ime i titula kako stoje na odluci | NE |
| Fotografija | NE |
| Email sa potvrdom nove adrese | NE |
| Telefon | NE |
| Koje obavijesti stižu | NE |
| Potpis | NE |
| Povrat lozinke: izdavanje | DA |
| Povrat lozinke: unovčavanje | KOD |
| Predsjedavajući mijenja članove, kvorum, intervale | NE — sve se samo vidi |
| Ime odbora i serija brojeva odluka | NE |
| Šta ova kopija može, na dnu navigacije | DA |

## 15. Šta Majlis ne radi

Svih osam obećanja održano i pokriveno testovima. Ništa otvoreno.

---

# Dio C — Brojevi

Prebrojano iz Dijela B, koji je popis po poglavljima i jedini se broji. Dio A
je isto gradivo poredano po putu korisnika, pa bi zbrajanje oba bilo duplo.

| | broj |
|---|---|
| DA | 51 |
| DOST (postoji, ali ga moraš tražiti) | 7 |
| KOD (radi, nijedan ekran ne zove) | 8 |
| NE | 20 |
| VANI | 4 |
| ukupno stavki | 90 |

Prvi put sam ovakve brojeve napisao napamet i sva četiri su bila pogrešna.
Ovi su prebrojani naredbom nad samim fajlom. Ako se ikad ne slažu sa tabelama,
tabele su tačne.

Po drugom pragu, dostupnosti, oko **dvije trećine je gotovo**. Po **trećem
pragu**, onom koji je vlasnik tražio, glavni tok predmeta ne vodi nikoga
nigdje: od osam obećanja poglavlja 4, nijedno.

## Osam stvari koje rade a nijedan ekran ih ne zove

Najjeftiniji posao u cijelom popisu, jer je server gotov.

1. `oversight.addAsset` — dodavanje holdinga
2. `oversight.retireAsset` — povlačenje holdinga
3. `oversight.setImplementation` — provedba odluke
4. `oversight.withdrawComputation` — povlačenje izračuna
5. `oversight.adoptionHistory` — historija izmjena forme
6. `oversight.reportOnReferral` — izvještaj komisije nazad
7. `account.redeemReset` — unovčavanje povrata lozinke
8. `extraction.ts` — brojke sa stranicom izvora, nikad spojeno na korak

Plus `components/SignedInAs.tsx` koju ništa ne prikazuje, i `pages/Guided.tsx`
na `/guided` do koje ne vodi nijedan link.

---

# Dio D — Šta znači "spremno za banku"

Pitano je da potvrdim sto posto. Ne mogu potvrditi ono što nije napravljeno, ali
mogu tačno reći šta mora biti istina da bi odgovor bio da.

## Za slanje banci kao dokumentacija

| uslov | danas |
|---|---|
| Priručnik proizvoda, čitljiv nekome ko prvi put čita | POLA — postoji, vlasnik ga je ocijenio kao loš i treba prepisati |
| Godišnji paket na uzorku podataka | DA |
| Primjer fatve sa brojem i potpisom | DA |
| Popis šta radi bez lanca i šta sa lancem | DA u dokumentu |

## Za demo kod njih u banci

| uslov | danas |
|---|---|
| Radi bez interneta i bez API ključa | DA — asistent se ugasi i to kaže |
| Pet uloga sa lozinkama, da se demo može odigrati iz više uglova | DA u sjemenu |
| Podaci koji izgledaju kao stvarna banka | DA |
| Tri jezika, uključujući desno-na-lijevo | DA |
| **Tok koji se može odigrati od pitanja do fatve bez objašnjavanja** | NE — ovo je A3 |
| Ništa ne puca ako se klikne krivo | DA — 332 testa, dosad |
| Reset da se demo može ponoviti | DA — bez `MAJLIS_DB` zapis živi u memoriji sa demo podacima, pa ponovno pokretanje vraća demo na početak. U produkciji server odbija da se pokrene bez putanje, da odluke ne nestanu |

**Presuda:** aplikacija je danas spremna da se **pokaže**, nije spremna da se
**preda**. Razlika je poglavlje 4. Bankar kome se pokaže zid od dvanaest
odjeljaka vidi bogat sistem kojim neko drugi mora upravljati. Bankar kome se
pokaže tok koji vodi vidi proizvod.

## Šta mora biti istina da odgovor bude sto posto da

1. Poglavlje 4 napravljeno: uslovi kao koraci, kalkulator u koraku, glasanje
   zaključano dok koraci nisu odgovoreni
2. Šest pitanja na svakoj stranici pravila
3. Osam mrtvih ruta dobije mjesto u sučelju
4. Postavke člana: ime, titula, slika, email, telefon, obavijesti, potpis
5. Padajući popis instrumenata za stolove banke
6. Passkey potpis
7. Priručnik prepisan ljudskim jezikom
8. Email i upis u registry ostaju VANI, i to se banci kaže otvoreno, jer
   zavise od njihovog relaya i od izmjene ugovora

Kad ovih sedam bude zatvoreno i osmo rečeno, odgovor je da. Ne prije.

---

# Dio E — Redoslijed

**Korak 3. Pravilo govori.** Šest pitanja na stranici pravila, `carrying.ts`
premješten sa predmeta na pravilo. Osam mrtvih ruta dobija mjesto. Najveći
dobitak po uloženom satu.

**Korak 4. Predmet vodi.** Poglavlje 4 u cijelosti. Uslovi postaju koraci,
kalkulator se otvara u koraku i sam se popuni iz dokumenta, glasanje se ne
otvara dok koraci nisu odgovoreni. Najviše novog koda i najvažniji korak za
demo.

**Korak 5. Postavke i stolovi.** Postavke člana i odbora. Padajući popis
instrumenata, sa redom za ono što odboru nikad nije postavljeno.

**Korak 6. Potpis.** Passkey.

**Korak 7. Lanac.** Oznaka po holdingu i po pravilu. Upis u registry, koji
traži izmjenu ugovora, pa ide zadnji.

**Korak 8. Priručnik.** Prepisati ljudskim jezikom, za banku.

Email ostaje VANI dok banka ne da relay. To nije naš posao da završimo, ali
jeste naš posao da im kažemo.
