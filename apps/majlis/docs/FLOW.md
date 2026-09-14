# Algoritam — cijeli Majlis: šta se klika, gdje, i gdje vodi

Vlasnik je bio u pravu dva puta. Prvo: radio sam u hodu, bez plana. Drugo:
prvi pokušaj ovog dokumenta pokrio je put jednog pitanja i to nije ni 10%
Majlisa.

Ovo je cijelo. **36 ekrana, 74 čina** — prebrojano iz `App.tsx` i iz popisa
ruta u `test/majlis.test.ts`, ne po sjećanju. Svaki čin je ovdje.

Prvo se dogovori. Tek onda se gradi.

---

## Pravila koja važe svuda

1. **Čin kaže posljedicu prije nego se pritisne.**
2. **Čin koji dopire izvan ekrana otvara prozor** — šta radi, kome, i razlog.
3. **Svaki čin završava sa „šta slijedi"** — najviše tri, i „ništa više" je jedna.
4. **Kontrola koja se ne može ispuniti je mrtva ili odsutna**, nikad živa pa izvini.
5. **Alat se otvara sam u koraku.** Ručno — u slajdu, nikad kao stranica.
6. **Lista izbora se otvara u slajdu**, ne vodi te sa liste.

## Oznake

**IMA** radi · **DIO** postoji, ne vodi dalje · **NEMA** treba napraviti ·
**KLJUČ** traži vlasnikov API ključ · **BANKA** traži mail relay

---

# A. Stol u banci — troja vrata

| ekran | čin | prozor | šta slijedi | |
|---|---|---|---|---|
| `/ask` | Izaberi fajl | — | ostaje | IMA |
| | **Postavi odboru** | *predato, čeka odbor* | vidi svoja pitanja · šta me obavezuje | DIO |
| | Povuci pitanje | *povlačenje, razlog* | nazad na listu | DIO |
| `/binds-me` | — čita se | | | IMA |
| `/may-deal` | — čita se | | | IMA |
| `/i-owe` | **Plati purifikaciju** | *iznos, kome, da je nepovratno* | potvrda · šta još dugujem | DIO |
| | **Odgovori odboru** | *pitanje odbora, tvoj odgovor ide u zapis* | odgovoreno · sljedeće pitanje | DIO |
| | **Prijavi da je ispravljeno** | *šta si uradio, odbor provjerava* | poslano | DIO |

**NEMA:** notifikacija odboru čim pitanje stigne.

---

# B. Pitanje → predmet

| ekran | čin | prozor | šta slijedi | |
|---|---|---|---|---|
| `/` *Šta te treba* | red → otvara predmet/pitanje | — | | IMA |
| | **Sva pitanja** / **Svi predmeti** | — | liste | IMA |
| `/questions` | **Uzmi kao predmet** | *sudi se po obliku X, N uslova* | **idi na korak 01** | DIO |
| | **Ne uzimaj** | *razlog ide banci* | nazad na red | DIO |
| | Više o ovom pitanju | sklopljeno | | IMA |

---

# C. Predmet — prozor sa koracima

**Prije koraka:** *šta su poslali · šta traže · po čemu se sudi · koje alate
traži · hoće li brojke doći popunjene* → **Pročitao sam — kreni** · IMA
(**KLJUČ** za AI sažetak)

## Svaki korak

| čin | prozor | šta slijedi | |
|---|---|---|---|
| **Ispunjen — dalje** | — | sljedeći korak | IMA |
| **Nije ispunjen** | *ide na odluku **i u klauzule banci**, sa linijom da ugovor mora predvidjeti* | **postavi banci zahtjev** → sljedeći korak | IMA |
| **Ne primjenjuje se** | *ide na odluku, **ne pravi klauzulu**, banka ne vidi* | sljedeći korak | IMA |
| Svi traže razlog | mrtvi bez njega, piše zašto | | IMA |
| **Pitaj banku o ovom uslovu** | *nacrt sa uslovom u sebi* | čeka odgovor, sat se odvaja | IMA |
| kalkulator u koraku | | | IMA |
| **Zapiši ovaj račun** | *vezan za ovaj uslov* | → zapiši nalaz | DIO |
| **Pročitaj brojke iz PDF-a** | *citat i stranica, ti potvrđuješ* | brojke u kalkulatoru | KLJUČ |
| **Priloži dokument** | *ostaje na predmetu, vidi ga cijeli odbor* | → čitaj protiv uslova | DIO |
| **Prigovori dokazu** | *zašto ne stoji* | zapisano uz dokaz | DIO |
| **Povuci dokaz** | *ostaje u zapisu kao povučen* | | DIO |
| **Promijeni oblik po kojem se sudi** | *koraci se mijenjaju, nalazi ostaju* | novi koraci | DIO |
| **Postavi termine** | *ovo je ono što se upisuje u registry* | → glasanje | DIO |
| **Šta se mora desiti kad ovo prođe** | *koraci za banku poslije odluke* | | DIO |
| **Reci nešto na predmetu** | — | u raspravi | IMA |
| **Označi riječi u tekstu** | *bilješka uz tačno te riječi* | | IMA |
| **Povuci bilješku** | *ostaje, označena povučenom* | | DIO |
| **Pošalji komitetu** | *komitet čita i javlja, ne presuđuje* | čeka izvještaj | DIO |
| **Povuci predmet** | *ništa ne slijedi iz njega* | nazad na listu | DIO |

---

# D. Glasanje — stanica `V`

| čin | prozor | šta slijedi | |
|---|---|---|---|
| **Otvori glasanje** | *prag, ko mora potpisati, šta ako ne prođe* | otvoreno → obavijest (BANKA) | DIO |
| | **ne otvara se dok koraci nemaju odgovor** | | IMA |
| **Zapiši glas** | *za/protiv/suzdržan + razlog, koliko fali do praga* | koliko još fali | DIO |
| **Zatvori glasanje** | *prag met/nije, šta slijedi u oba slučaja* | dozvola → 48h · zabrana → odmah | DIO |
| **Prigovori u periodu** | *zaustavlja odluku, pisani razlog* | zaustavljeno | DIO |
| **Stupi na snagu** | *šta se mijenja od ovog trenutka* | **PDF + registry** | DIO |
| **Vrati u raspravu** | *glasovi padaju, zašto* | nazad na korake | DIO |

---

# E. Odluka izlazi — najveća rupa

| šta treba samo od sebe | |
|---|---|
| broj iz serije odbora | IMA |
| **PDF se sam sastavi i iskoči** | **NEMA** |
| **web3: upis u registry** | **NEMA** — ugovor `onlyOwner` |
| **web2: PDF banci** | BANKA |
| nacrt klauzula | IMA |
| **Potpiši uređajem** → *šta potpis dokazuje a šta ne* | IMA |
| **Upiši uređaj** → *ključ ostaje u uređaju* | IMA |
| **Zaboravi uređaj** → *potpisi ostaju* | DIO |

---

# F. Poslije odluke — registar, drift, pregled, prekršaj

| ekran | čin | prozor | |
|---|---|---|---|
| `/register` | **Unesi holding** | *ulazi u univerzum, ne znači odobren* | DIO |
| `/register/:id` | **Povuci holding** | *ostaje u zapisu* | DIO |
| | **Označi konvencionalan/tokeniziran** | *mijenja ko izvršava odluke o njemu* | DIO |
| | **Prepoznaj kao isti instrument** | *spaja dva zapisa* | DIO |
| | **Otvori predmet o driftu** | *šta se pomjerilo* | DIO |
| `/examinations` | **Zapiši pregled** | *uzorak je tvoj, Majlis ga ne bira* | DIO |
| `/incidents` | **Prijavi prekršaj** | *odbor odlučuje je li stvaran* | DIO |
| `/incidents/:id` | **Slažem se da je stvaran** | *od ovog trenutka teče 30 dana* | DIO |
| | **Aktivnost je zaustavljena** | *datum ulazi u zapis* | DIO |
| | **Na upravni odbor** | *ide van šerijatskog odbora* | DIO |
| | **Plan ispravke** | *devet koraka, četiri su bančina* | DIO |
| | **Prihvati plan** / **Vrati plan** | *šta banka mora dopuniti* | DIO |
| | **Odredi purifikaciju** | *iznos, kome ide* | DIO |
| | **Plaćeno** | *dokaz uplate* | DIO |
| | **Zatvori prekršaj** | *šta ostaje u godišnjem izvještaju* | DIO |

---

# G. Sjednice, obaveze, komiteti

| ekran | čin | prozor | |
|---|---|---|---|
| `/meetings` | **Sazovi sjednicu** | *datum, dnevni red* | DIO |
| `/meetings/:id/book` | **Prisustvo** | *ko je bio, ko nije* | DIO |
| | **Zapisnik** | *odbor ga odobrava, poslije se ne mijenja* | DIO |
| | **Zatvori sjednicu** | *zapisnik postaje konačan* | DIO |
| `/undertakings` | **Zapiši obavezu** | *ko, šta, do kad* | DIO |
| | **Reci šta se desilo** | *zatvara obavezu* | DIO |
| `/settings` | **Osnuj komitet** / **Raspusti** | *ko sjedi, šta radi* | DIO |
| | **Pošalji komitetu** / **Izvještaj** / **Povuci** | | DIO |

---

# H. Biblioteka i oblici

| čin | prozor | šta slijedi | |
|---|---|---|---|
| oblik → **slajd** | | | IMA |
| **Uzmi ovaj oblik** | *uslovi su sad odborovi* | provjeri nacrt · postavi pitanje | IMA |
| **Provjeri nacrt protiv ovoga** | | **DIO** — vodi na `/check` gdje **opet biraš oblik** | DIO |
| `/check` **Pročitaj** | *čita se protiv uslova, ne presuđuje* | → otvori predmet | DIO |

---

# I. Alati — šest kalkulatora

| | |
|---|---|
| **Dugme „Alati" u zaglavlju → slajd** | **NEMA** |
| Screening · Purifikacija · Zekat · Raspodjela · Trgovljivost · Zatezna | IMA |
| **Zapiši račun** → *ulazi u zapis, veže se za predmet* | DIO |
| **Povuci račun** → *aritmetika ostaje, označen povučenim* | DIO |
| `/figures/:id` — cijeli račun | IMA |

**Ovo je vlasnikovo „kako će iko doći do bilo kojeg toolkita".**

---

# J. Odbor, članovi, pristup

| čin | prozor | |
|---|---|---|
| **Ime i titula** | *mijenja se odsad, izdane odluke ne* | IMA |
| **Lozinka** | | IMA |
| **Izdaj kod za povratak** | *tvoje ime u zapisu* | DIO |
| **Unovči kod** | | ZID |
| **Kvorum / prozor / serija brojeva** | *ne dira otvoreno glasanje* | IMA |

---

# K. Papiri, pretraga, asistent

| | |
|---|---|
| Odluka · klauzule · priručnik · godišnji · holding · izvoz · kalendar | IMA |
| `/search` | IMA |
| `/assistant` **Pitaj** → *objašnjava, ne presuđuje* | KLJUČ |
| **Pročitaj dokument modelom** | KLJUČ |

---

# L. Red kojim se gradi

1. **Dugme „Alati" → slajd** — alati nemaju nijedan put
2. **Prozor + „šta slijedi" na svakih 74 čina** — danas ih ima ~6
3. **„Provjeri nacrt" iz oblika** otvara čitač sa već izabranim oblikom
4. **Automatsko izdavanje** kad odluka stupi na snagu
5. **Notifikacija** kad pitanje stigne
6. KLJUČ · 7. BANKA

---

*Ako se gradi nešto što nije ovdje, prvo se dodaje ovdje.*
