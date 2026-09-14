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

Ovo je srce aplikacije, i od 14.09. najjači dio umjesto najslabijeg.

Uslovi su numerisani koraci, jedan otvoren u isto vrijeme, i svaki nosi alat
koji mu treba. Okvir oko njih je 14.09. skraćen: čitač ugovora se sklopio u
dugme, dijelovi su dobili prave naslove, i stranica je pala sa 5124 na 4337
piksela.

| šta dokument obećava (pogl. 4) | stanje |
|---|---|
| **Uslovi forme postaju koraci predmeta** | DA — numerisani, jedan otvoren u isto vrijeme, ostali sklopljeni u red. Uslov oko kojeg se odbor ne slaže se nikad ne sklapa |
| **Korak koji traži brojku otvara kalkulator u sebi** | DA — kalkulator se bira iz onoga što oblik imenuje, i sam nosi čitanje brojki iz dokumenta banke |
| Svaka brojka pokazuje stranicu iz koje je uzeta | DA — `ReadDocument` je oduvijek unutar četiri kalkulatora. Nisam to bio primijetio i napravio sam drugi isti alat, pa ga izvadio |
| Rezultat ostaje na uslovu, ne odlazi na poseban ekran | DA — kalkulacija pamti predmet i uslov |
| Korak koji dokument ne odgovara postaje pitanje banci | DA — nacrt se otvara sa samim uslovom u sebi; banka odgovara na svom ekranu; član odbora ne može odgovoriti umjesto banke |
| Sat na predmetu staje dok banka odgovara | DA — vrijeme kod banke se **odvaja, ne skriva**: proteklo ostaje proteklo, a pored njega piše koliko je bilo odborovo. Preklapajuća pitanja se broje jednom |
| **Glasanje se ne otvara dok svi koraci nisu odgovoreni** | DA — odbijanje, ne upozorenje. Izuzet uslov se broji kao odgovoren |
| Uslov koji odbor izuzme putuje na pisanu odluku | DA — već je radilo, provjereno u fatwa.ts |

**Ocjena koraka: osam od osam, 14.09. ujutro.** Kalkulator je u koraku,
rezultat ostaje na uslovu, glasanje je zaključano, izuzeti uslov ide na
odluku, koraci se otvaraju jedan po jedan, brojke nose stranicu izvora,
korak može postaviti pitanje banci, i sat odvaja vrijeme kod banke.

Poglavlje 4 je time zatvoreno.

**Okvir, 14.09.** Uz to je popravljeno troje oko koraka. Dugme "otvori
glasanje" više ne stoji upaljeno kad je glasanje zaključano — nema ga, a na
njegovom mjestu piše koliko uslova još čeka. Čitač ugovora se sklopio u dugme
umjesto da stoji kao velika kutija između člana i njegovog posla. I osam
dijelova paketa je dobilo prave naslove, pa se sa čitačem ekrana može kretati
kroz njih.

### Kalkulatori, po trećem pragu

Svih šest se sada otvara iz koraka koji ih treba. Koji se nudi ne pogađa se iz
teksta uslova nego dolazi iz onoga što sam oblik ugovora imenuje; gdje oblik
imenuje više njih, bira član, jer koji od njih odgovara baš na ovaj uslov je
prosudba.

| kalkulator | postoji | otvara se iz koraka |
|---|---|---|
| Screening | DA | DA |
| Tangibilnost | DA | DA |
| Purifikacija | DA | DA |
| Zekat | DA | DA |
| Raspodjela dobiti | DA | DA |
| Zatezna kamata | DA | DA |

Provjereno u browseru na predmetu sukuka: tri koraka traže brojku, kalkulator
tangibilnosti se otvara **unutar** koraka sa dvanaest polja, i uslov se i dalje
vidi iznad njega. Zapisana brojka od 61% stoji na svom koraku sa linkom na
račun.

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
| **Šest pitanja na istih šest mjesta** (pogl. 12) | DA — od 13.09. na /rules/:id, sva tri pravila provjerena u browseru |
| Šta odbor odlučio, njegovim riječima | DA |
| Kako se mjeri | DA — četiri odgovora: iz izvora, brojka bez izvora, protiv popisa, ili ništa ne mjeri |
| Kreće li se | DA — čita se pri svakoj transakciji, ili se mijenja samo kad odbor promijeni |
| Kad se provjerava | DA — premješteno sa predmeta na pravilo |
| Šta se dešava ako padne | DA — i popravljeno: riječ `revert` je nedostajala, pa dva od tri pravila nisu imala odgovor |
| Ko se obavještava | DA — uključujući da se email ne šalje dok banka ne da relay |
| Gdje pravilo nije mjerenje, reći da ga ništa ne mjeri | DA |

## A7. Banka radi po odluci

| šta treba | stanje |
|---|---|
| Banka ima svoja tri vrata i ne vidi odborove ekrane | DA |
| Šta me obavezuje, operativno | DA — `BindsMe.tsx` |
| **Popis dozvoljenih instrumenata iz registra** | DA — ekran /may-deal u vratima banke, uzet iz registra i filtriran po stanju |
| Popis pokazuje i ono što odboru nikad nije postavljeno | DA — svoja grupa i svoja rečenica: nije dozvoljeno i nije zabranjeno |
| Šta dugujem | DA — `IOwe.tsx` |

## A8. Kasnije: pregled, prekršaj, drift

| šta treba | stanje |
|---|---|
| Pregled bilježi period, uzorak, kako je biran | DA |
| Uslovi koje pregled nije dosegao se imenuju | DA |
| Prekršaj kroz osam faza, 30 dana od nalaza | DA |
| Purifikacija se računa, ne kuca napamet | DA |
| Drift kao pitanje, ne kao prekršaj | DA |
| **Provedba: šta odbor traži da se uradi** | DA — na MatterPack, dio 07. Zamrzava se sa uslovima kad glasanje počne |
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

Vidi A3. **Osam od osam, zatvoreno 14.09.**

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

Vidi tabelu u A3. Šest postoji i svih šest se otvara iz koraka koji ih treba.

| stavka | stanje |
|---|---|
| Novac kao tačan decimalni broj | DA |
| Svaki izračun ima adresu i pokazuje aritmetiku | DA |
| Povlačenje izračuna | DA — sa obaveznim razlogom |

### Odlučivanje

| alat | stanje | put |
|---|---|---|
| Šta se dešava sljedeće | DA | DA |
| Presedan | DA | DOST |
| Uslovi od prošlog puta | DA | DOST |
| Šta pravilo radi u praksi | DA na predmetu | NE na pravilu |
| Dokazi za i protiv | DA | DOST |
| Komisije: formiranje i čitanje | DA | DOST |
| Komisije: izvještaj nazad | DA | DOST — nudi se samo onome ko je sjedio u komisiji |
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
| Provedba | DA |
| Tempo | DA |
| Kalendar sa pretplatom | DA |

### Zapis

| alat | stanje |
|---|---|
| Registar za čitanje | DA |
| Dodavanje holdinga | DA |
| Povlačenje holdinga | DA — složeno pod «još» na stranici holdinga |
| Dosje holdinga | DA |
| Forme ugovora, svaka sa svojom stranicom | DA |
| Historija izmjena forme | DA |
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
| Popis instrumenata iz registra | DA — ekran `/may-deal` |
| Red za ono što odboru nikad nije postavljeno | DA |
| Šest pitanja po pravilu | DA |

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
| Ime i titula kako stoje na odluci | DA — i izdana odluka ne mijenja se: pozicija i nalaz pamte ime pod kojim su zapisani |
| Fotografija | NE |
| Email sa potvrdom nove adrese | POLA — adresa se čuva i označi kao nepotvrđena, jer potvrda znači slanje a ova instalacija ne šalje |
| Telefon | DA |
| Koje obavijesti stižu | NE — namjerno, i rečeno na ekranu: ništa se ne šalje, pa bi panel postavki lagao |
| Potpis | NE — namjerno, i rečeno na ekranu: slika ovdje bi izgledala kao potpis a ne bi bila |
| Povrat lozinke: izdavanje | DA |
| Povrat lozinke: unovčavanje | ZID — vidi ispod |
| Predsjedavajući mijenja kvorum, prozor potvrde, ime odbora | DA — sa obaveznim razlogom i historijom svake promjene. Glasanje koje je već otvoreno sudi se po pragu pod kojim je otvoreno |
| Predsjedavajući mijenja članove | NE — namjerno, i nikad neće: aplikacija koja uređuje svoj odbor odlučivala bi ko sjedi u šerijatskom odboru |
| Serija brojeva odluka | NE |
| Šta ova kopija može, na dnu navigacije | DA |

## 15. Šta Majlis ne radi

Svih osam obećanja održano i pokriveno testovima. Ništa otvoreno.

---

# Dio C — Brojevi

Prebrojano iz Dijela B, koji je popis po poglavljima i jedini se broji. Dio A
je isto gradivo poredano po putu korisnika, pa bi zbrajanje oba bilo duplo.

Stanje nakon koraka 3, prebrojano iz Dijela B.

| | 13.09. ujutro | 13.09. navečer | 14.09. |
|---|---|---|---|
| DA | 51 | 58 | **63** |
| POLA | 0 | 0 | 1 |
| DOST (postoji, ali ga moraš tražiti) | 7 | 8 | 8 |
| KOD (radi, nijedan ekran ne zove) | 8 | 1 | 1 |
| NE | 20 | 19 | **14** |
| VANI (čeka banku ili izmjenu ugovora) | 4 | 4 | 4 |
| ZID (traži odluku o sigurnosti) | 0 | 1 | 1 |
| ukupno stavki | 90 | 91 | 92 |

Prvi put sam ovakve brojeve napisao napamet i sva četiri su bila pogrešna.
Ovi su prebrojani naredbom nad samim fajlom. Ako se ikad ne slažu sa tabelama,
tabele su tačne.

Po drugom pragu, dostupnosti, sada je **skoro sve zatvoreno**: ostala je jedna
stvar koja radi a nema ekran, i ona pripada koraku 5.

Po **trećem pragu**, onom koji je vlasnik tražio, glavni tok predmeta je
**zatvorio svih osam** obećanja poglavlja 4 (13.09. navečer i 14.09. ujutro).

Brojevi u tabeli iznad se zbog toga nisu pomjerili, i to je namjerno: Dio B
nabraja poglavlje 4 kao jedan red koji upućuje na Dio A, pa se napredak unutar
njega tamo i vidi. Dizati broj u zbiru zbog toga bilo bi tačno ono protiv čega
je ovaj popis napravljen.

Ono što ostaje nije poglavlje 4 nego okvir oko njega: stranica predmeta ima
dvanaest odjeljaka, koraci unutar nje vode, a sve ostalo stoji jedno ispod
drugog. To je sljedeći posao.

## Osam stvari koje su radile a nijedan ekran ih nije zvao

Stanje 13. septembra, uveče. Šest zatvoreno, jedno ostaje za korak 5, jedno
nije propust nego zid.

| | stanje |
|---|---|
| Dodavanje holdinga | zatvoreno — dugme na registru |
| Povlačenje holdinga | zatvoreno — pod «još» na stranici holdinga |
| Provedba odluke | zatvoreno — na predmetu, dio 07 |
| Povlačenje izračuna | zatvoreno — na stranici izračuna |
| Historija izmjena forme | zatvoreno — na stranici forme |
| Izvještaj komisije nazad | zatvoreno — samo za onoga ko je sjedio u komisiji |
| Brojke sa stranicom izvora | ostaje za korak 5, jer pripada kalkulatoru u koraku |
| Unovčavanje povrata lozinke | **zid**, vidi ispod |

### Zašto povrat lozinke nije propust nego zid

Ruta na serveru je otvorena kako treba: pozovi je bez lozinke i vrati 400, ne
401. Ali **cijela aplikacija je iza lozinke**, pa čovjek koji je lozinku
zaboravio dobije 401 na samu stranicu i ne može ni doći do polja u koje bi
upisao kod.

Da bi radilo, jedna putanja mora biti otvorena bez lozinke. To mijenja
sigurnosnu granicu aplikacije i nije odluka koju ja donosim sam. Predsjedavajući
danas može izdati kod; niko ga ne može unovčiti.

Plus `components/SignedInAs.tsx` koju ništa ne prikazuje, i `pages/Guided.tsx`
na `/guided` do koje ne vodi nijedan link. Oboje su ostaci, ne propusti.

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
2. ~~Šest pitanja na svakoj stranici pravila~~ — gotovo 13.09.
3. ~~Osam mrtvih ruta dobije mjesto u sučelju~~ — gotovo 13.09., osim povrata
   lozinke koji je zid
4. Postavke člana: ime, titula, slika, email, telefon, obavijesti, potpis
5. ~~Popis instrumenata za stolove banke~~ — gotovo 14.09.
6. Passkey potpis
7. Priručnik prepisan ljudskim jezikom
8. Email i upis u registry ostaju VANI, i to se banci kaže otvoreno, jer
   zavise od njihovog relaya i od izmjene ugovora

Kad ovih sedam bude zatvoreno i osmo rečeno, odgovor je da. Ne prije.

---

# Dio E — Redoslijed

**Korak 3. Pravilo govori. GOTOVO 13.09.** Šest pitanja na stranici pravila,
sa `carrying.ts` premještenim sa predmeta na pravilo. Šest od osam mrtvih ruta
dobilo svoje mjesto; sedma pripada koraku 5, osma je zid.

Usput nađeno i popravljeno: riječ `revert`, koju ugovori koriste za odbijanje,
nije bila na popisu ponašanja, pa dva od tri pravila nisu mogla odgovoriti šta
se dešava ako padnu. I prvi nacrt trećeg pitanja tvrdio je da prag prati
tržište, što je na pravilu o paru bilo naprosto netačno.

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
