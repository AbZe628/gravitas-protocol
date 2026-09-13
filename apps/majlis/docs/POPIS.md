# Popis obaveza iz dogovorenog dokumenta

Pisano 13. septembra 2026.

Ovo je popis svake stvari koju smo dogovorili u priručniku (`MAJLIS-ALGORITAM.html`,
15 poglavlja), sa izmjerenim stanjem u kodu pored svake.

## Zašto ovaj popis postoji

Plan od pet koraka koji sam napravio ranije bio je plan o **izgledu** ekrana,
ne o **funkcijama**. Zbog toga su svi koraci mogli proći uspješno, a aplikacija
i dalje ne bi imala ono što piše u dokumentu, jer te funkcije nisu bile stavka
nigdje. Prvi takav propust je nađen kad je pravilo dobilo svoju stranicu a na
njoj nije bilo objašnjenja šta to pravilo radi na mreži.

Ovaj popis je lijek za to. Nijedan korak nije gotov dok se ne provjeri protiv
ovog popisa.

## Pravilo za oznaku "gotovo"

Stavka je gotova tek kad je **dostupna u sučelju**, a ne kad servis postoji.
Sedam endpointa u ovoj aplikaciji rade, a nijedan ekran ih nikad ne zove. To
se ovdje broji kao nedovršeno, jer za onoga ko koristi aplikaciju te funkcije
ne postoje.

## Oznake

| | značenje |
|---|---|
| DA | radi i dostupno je iz sučelja |
| POLA | postoji, ali ne na mjestu gdje dokument kaže, ili samo jedna polovina |
| KOD | servis postoji, nijedan ekran ga ne zove |
| NE | nije napravljeno |
| VANI | napravljeno koliko se može, ostatak zavisi od banke ili od izmjene ugovora |

---

## 1. Čemu Majlis služi

| stavka | stanje | gdje |
|---|---|---|
| Jedna ideja: sve je predmet sa fazom, sljedećim činom i vlasnikom | DA | `lib/spine.ts`, `components/shapes.tsx` |

## 2. Ko koristi

| stavka | stanje | gdje |
|---|---|---|
| Uloge na odboru: predsjedavajući, potpisnik, savjetodavni, sekretar, posmatrač | DA | `lib/identity.ts` |
| Strana banke (institution) ima svoja vrata i ne vidi odborove ekrane | DA | `DESK_DOORS`, `NotYourScreen.tsx` |

## 3. Od pitanja do odluke

| stavka | stanje | gdje |
|---|---|---|
| Pitanje stiže, postaje predmet, vijećanje, glasanje, period čekanja, na snazi | DA | `services/lifecycle.ts`, `passage.ts` |
| Fatva sa brojem, potpisom, u dva jezika | DA | `services/fatwa.ts` |

## 4. Kako softver vodi kroz posao

| stavka | stanje | gdje |
|---|---|---|
| Uslovi forme ugovora postaju koraci predmeta | POLA | `components/Checklist.tsx` postoji i prikazan je, ali to je popis za kvačicu, nije vođenje kroz korake |
| **Kalkulator se otvara unutar koraka, već popunjen iz dokumenta banke** | NE | `Checklist.tsx` ne uvozi nijedan kalkulator |
| Svaka brojka pokazuje stranicu iz koje je uzeta | POLA | `services/extraction.ts` to radi, nije spojeno na korak |
| Rezultat se veže za uslov, ne odlazi na poseban ekran izračuna | NE | izračuni idu na `/calculations` |
| Korak koji dokument ne odgovara postaje pitanje banci | NE | |
| Sat na predmetu staje dok banka odgovara | NE | |
| **Glasanje se ne može otvoriti dok svi koraci nisu odgovoreni** | NE | ruta za glasanje u `routes/governance.ts` ovo ne provjerava |
| Isto i za prekršaj, pregled i sjednicu | NE | |

## 5. Alati i odakle se otvaraju

### Čitanje dokumenta

| alat | stanje | napomena |
|---|---|---|
| Sažetak | DA | `services/reading.ts`, `ReadDocument.tsx` |
| Prepoznavanje forme ugovora | DA | `services/recognise.ts`, `ReadTheContract.tsx` |
| Provjera uslova | DA | `services/reading-a-contract.ts` |
| Brojke iz dokumenta | POLA | `services/extraction.ts` radi, ne otvara se iz koraka |
| Bilješke na pasusu | DA | `services/annotation.ts`, `InTheMargin.tsx` |
| Pretraga | DA | `services/search.ts`, `pages/Search.tsx` |
| Dokument se sažima čim stigne | NE | sažetak se traži ručno |

### Kalkulatori

Svih šest postoji i dostupno je preko `/calculations`. **Nijedan se ne otvara
iz koraka koji ga treba**, što je ono što dokument obećava.

| kalkulator | stanje |
|---|---|
| Screening | DA, ali samo sa `/calculations` |
| Tangibilnost | DA, isto |
| Purifikacija | DA, isto |
| Zekat | DA, isto |
| Raspodjela dobiti | DA, isto |
| Zatezna kamata | DA, isto |
| Novac kao tačan decimalni broj, nikad floating point | DA | `services/money.ts` |
| Svaki izračun ima svoju adresu i pokazuje aritmetiku | DA | `pages/Figure.tsx` |
| Povlačenje izračuna | KOD | endpoint `withdrawComputation` nikad pozvan |

### Odlučivanje

| alat | stanje | napomena |
|---|---|---|
| Šta se dešava sljedeće | DA | `services/passage.ts` |
| Presedan | DA | `Precedent.tsx` |
| Uslovi od prošlog puta | DA | `FromTheLastTime.tsx` |
| **Efekat: šta pravilo radi u praksi** | POLA | `services/carrying.ts` je odličan, ali se vidi **samo na predmetu prije glasanja**. Nema ga na pravilu na snazi |
| Dokazi za i protiv | DA | `Evidence.tsx` |
| Komisije | POLA | formiranje i čitanje izvještaja rade; **podnošenje izvještaja nazad** je KOD (`reportOnReferral` nikad pozvan) |
| Brojanje glasova | DA | `VotePanel.tsx` |
| Prigovor u periodu čekanja | DA | |
| Nacrt klauzula | DA | `services/contract.ts` |
| Pisana odluka | DA | `services/fatwa.ts` |

### Nadzor bez da neko gleda

| alat | stanje |
|---|---|
| Drift | DA |
| Pregledi na redu | DA |
| Rokovi | DA |
| **Provedba: šta je trebalo da se desi i je li se desilo** | KOD — ruta `POST /matters/:id/implementation` postoji, klijent je nikad ne zove, nula spominjanja u UI |
| Tempo | DA |
| Kalendar sa pretplatom | DA |

### Zapis

| alat | stanje |
|---|---|
| Registar | DA za čitanje. **Dodavanje i povlačenje holdinga: KOD** (`addAsset`, `retireAsset` nikad pozvani) |
| Dosje jednog holdinga | DA |
| Forme ugovora sa uslovima | DA (od 13.09. svaka ima svoju stranicu) |
| **Historija izmjena forme** | KOD — `adoptionHistory` nikad pozvan |
| Priručnik usklađenosti | DA |
| Papiri za sjednicu | DA |
| Godišnji paket | DA |
| Obavijesti | POLA — sastavljaju se, **ne šalju se** (vidi 13) |
| Izvoz podataka | DA |

## 6. Kad nešto pođe po zlu

| stavka | stanje |
|---|---|
| Osam faza prekršaja | DA |
| Trideset dana teče od nalaza, ne od prijave | DA |
| Iznos purifikacije se računa, ne kuca napamet | DA |
| Predmet sa neplaćenom purifikacijom se ne može zatvoriti | DA |

## 7. Pregledi, sjednice, datumi

| stavka | stanje |
|---|---|
| Pregled bilježi period, uzorak i kako je biran | DA |
| Uslovi koje pregled nije dosegao se imenuju | DA |
| Jedan čin pretvara nalaz u prijavljen predmet | DA |
| Sjednica, dnevni red iz onoga što čeka, kvorum, obaveze | DA |
| Drift se pokreće kao pitanje, ne kao prekršaj | DA |

## 8. Godina za revizora

| stavka | stanje |
|---|---|
| Godišnji paket sa svim navedenim | DA |
| Paket kaže svoja ograničenja na prvoj stranici | DA |
| Kao dokument, kao podaci, i kao pojedinačne odluke | DA |

## 9. Šta asistent radi

| stavka | stanje |
|---|---|
| Čita, prepoznaje, pamti, sastavlja, objašnjava | DA u kodu |
| **Živi poziv modelu** | VANI — `services/assistant.ts` je spojen na pravi SDK, treba `ANTHROPIC_API_KEY` |
| Ne kaže šta je dozvoljeno, ne preporučuje glas, ne navodi standard | DA |
| **Sažetak prije glasanja: šta će odluka raditi** | POLA — `carrying.ts` to daje, ali sastavljeno a ne od modela, i nema ga na pravilu |

## 10. Potpisivanje

| stavka | stanje |
|---|---|
| **Potpis otiskom, licem ili PIN-om (passkey)** | NE — nula rezultata za `passkey`/`webauthn` u cijelom kodu |
| Upis uređaja kad član dođe na odbor | NE |
| Bez novčanika, bez seed fraze, bez naknade | DA po dizajnu, jer potpis ovako ni ne postoji |
| Broj sakupljenih potpisa naspram potrebnih | DA |

## 11. Sa lancem i bez lanca

| stavka | stanje |
|---|---|
| Radi potpuno bez lanca | DA |
| Oznaka na holdingu i na pravilu da li je konvencionalno ili tokenizirano | POLA |
| Čitanje policy registryja | DA — `services/registry.ts`, `readRegistry` |
| **Upis u policy registry** | VANI — registry je `onlyOwner`, treba izmjena ugovora |
| Veza verzije registryja nazad na odluku | NE |
| Obrazloženje nikad ne ide na lanac | DA po dizajnu |

## 12. Šta stolovi u banci koriste

| stavka | stanje |
|---|---|
| **Padajući popis instrumenata iz registra, filtriran na ono što je na snazi** | NE |
| Popis pokazuje i ono što odboru nikad nije postavljeno | NE |
| **Svako pravilo odgovara na istih šest pitanja na istih šest mjesta** | NE — ovo je najveći propust. Vidi ispod |
| Šta odluka znači iz dana u dan, za stolove | POLA — `pages/BindsMe.tsx` daje uslove i brojke, ne šest pitanja |

### Šest pitanja, jer su srž onoga što si tražio

1. Šta je odbor odlučio, njegovim riječima — **ima** na stranici pravila
2. Kako se mjeri — dijelom, kroz `meaning` parametra
3. Kreće li se — **nema**
4. Kad se provjerava — **ima u `carrying.ts`, ali samo na predmetu**
5. Šta se dešava ako padne — **ima u `carrying.ts`, isto samo na predmetu**
6. Ko se obavještava — **nema**

Gdje pravilo nije mjerenje nego pravilo ponašanja, softver mora reći da ništa
to ne mjeri i da samo čovjek koji pročita spis može reći, umjesto da ostavi
prazno polje. To nije napravljeno.

## 13. Šta sistem šalje i proizvodi

| stavka | stanje |
|---|---|
| Šta se prima: nacrti, dokazi, planovi, dokazi o plaćanju, papiri | DA |
| Šta se proizvodi: odluka, godišnji paket, zapisnik, izračun, spis prekršaja | DA |
| **Šta se šalje emailom** | VANI — `notifierFromEnv` uvijek vraća "ne šalji". Danas aplikacija **ne šalje nijedan email nikome**. Treba relay banke |
| Svako bira šta mu stiže i koliko često | NE |
| Dokument se sažima čim stigne | NE |

## 14. Postavke

### Član

| stavka | stanje |
|---|---|
| Lozinka | DA |
| Jezik | DA (u zaglavlju) |
| **Ime i titula kako stoje na odluci** | NE |
| **Fotografija** | NE |
| **Email, sa potvrdom nove adrese** | NE |
| **Telefon** | NE |
| **Koje obavijesti stižu i koliko često** | NE |
| **Potpis** | NE |
| Povrat lozinke: izdavanje | DA |
| Povrat lozinke: unovčavanje | KOD — `redeemReset` nikad pozvan |

### Predsjedavajući i sekretar

| stavka | stanje |
|---|---|
| Članovi, uloge, pozicije | POLA — vidi se, ne mijenja se |
| Kvorum, period čekanja, prozor potvrde | POLA — vidi se, ne mijenja se |
| Intervali pregleda | POLA |
| Ime odbora i serija brojeva odluka | NE |

### Instalacija

| stavka | stanje |
|---|---|
| Da li je lanac spojen i koji | POLA |
| Da li je asistent uključen | DA |
| Šta ova kopija može i ne može, na dnu navigacije | DA |

## 15. Šta Majlis ne radi

Sve od sedam obećanja je održano i pokriveno testovima.

| stavka | stanje |
|---|---|
| Ne odlučuje | DA |
| Ne imenuje standard | DA |
| Ne potpisuje umjesto odbora | DA |
| Ništa ne postaje obavezno administracijom | DA |
| Ne hostuje sjednice | DA |
| Ne provodi ono što bilježi | DA |
| Ne prepisuje svoj zapis | DA |
| Kaže šta ne vidi | DA |

---

## Sažetak

Prebrojano iz tabela iznad, bez reda sa oznakama.

| | broj |
|---|---|
| DA | 73 |
| POLA | 14 |
| KOD (radi, nedostupno) | 5 |
| NE | 23 |
| VANI (blokirano izvana) | 4 |
| ukupno stavki | 119 |

Prvi put sam ove brojeve napisao napamet i sva četiri su bila pogrešna. Ovi su
prebrojani. Ako se ikad ne slažu sa tabelama, tabele su tačne.

Red "KOD" kaže pet a popis ispod sedam, jer dvije tabele grupišu po dvije
stvari u jedan red (dodavanje i povlačenje holdinga; izvještaj komisije stoji
unutar reda označenog POLA).

Grubo: **dvije trećine je gotovo, jedna trećina nije.** Ono što nije, nije
razbacano nego se skuplja u pet gnijezda: šest pitanja po pravilu, postavke
člana, koraci sa kalkulatorima, popis za stolove, potpis i lanac.

## Sedam stvari koje rade a nijedan ekran ih ne zove

Ovo je najjeftiniji posao u cijelom popisu, jer je server već gotov.

1. `oversight.addAsset` — dodavanje holdinga u registar
2. `oversight.retireAsset` — povlačenje holdinga
3. `oversight.setImplementation` — provedba odluke
4. `oversight.withdrawComputation` — povlačenje izračuna
5. `oversight.adoptionHistory` — historija izmjena forme ugovora
6. `oversight.reportOnReferral` — izvještaj komisije nazad
7. `account.redeemReset` — unovčavanje povrata lozinke

Plus `components/SignedInAs.tsx`, komponenta koju ništa ne prikazuje.

## Redoslijed koji predlažem

**Korak 3 — šest pitanja i sedam mrtvih ruta.** Stranica pravila dobija svih
šest odgovora, uključujući premještanje `carrying.ts` sa predmeta na pravilo.
Sedam ruta iznad dobija svoje mjesto u sučelju. Ovo je najveći dobitak po
uloženom satu.

**Korak 4 — postavke.** Ime, titula, fotografija, email sa potvrdom, telefon,
obavijesti, potpis. Predsjedavajući može mijenjati kvorum i intervale umjesto
da ih samo gleda.

**Korak 5 — koraci i kalkulatori.** Uslovi postaju koraci, kalkulator se otvara
unutar koraka već popunjen, glasanje zaključano dok koraci nisu odgovoreni.
Ovo je najviše novog koda.

**Korak 6 — stolovi.** Padajući popis dozvoljenih instrumenata iz registra, sa
redom za ono što odboru nikad nije postavljeno.

**Korak 7 — potpis i lanac.** Passkey. Upis u registry, koji traži izmjenu
ugovora, pa ide zadnji.

Email ostaje VANI dok banka ne da relay. To nije naš posao da završimo.
