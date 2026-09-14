# Algoritam — šta se klika, gdje, i gdje to vodi

Ovo je ono što je falilo. Vlasnik je bio u pravu: radio sam dvije-tri sitnice u
hodu bez plana koji pratim. Ovdje je **cijeli proces**: svaki ekran, svaki
gumb, svaki prozor, i **gdje vodi u svakom scenariju**.

Prvo se ovo dogovori. Tek onda se gradi.

---

## Pravila koja važe svuda

1. **Svaki čin ima posljedicu koja se kaže prije nego se pritisne.**
2. **Čin koji dopire izvan ekrana otvara prozor** koji kaže šta radi, kome, i
   traži razlog. Bez razloga se ne izvršava.
3. **Svaki čin završava sa „šta slijedi"** — najviše tri stavke, i „ništa više
   za sada" je jedna od njih.
4. **Kontrola koja se ne može ispuniti je odsutna ili mrtva**, nikad živa pa
   se izvini.
5. **Alat se otvara sam u koraku kojem treba.** Ručno se otvara u slajdu sa
   strane, nikad kao zasebna stranica.
6. **Lista izbora se otvara u slajdu**, ne vodi te sa liste.

---

## Oznake

| | |
|---|---|
| **IMA** | napravljeno i radi |
| **DIO** | postoji ali ne vodi dalje |
| **NEMA** | mora se napraviti |
| **KLJUČ** | traži vlasnikov API ključ |
| **BANKA** | traži mail relay od banke |

---

# 1. Pitanje stiže

## 1.1 Banka šalje

**Ekran:** `/ask` (stol u banci)

| gumb | šta radi | šta slijedi |
|---|---|---|
| Izaberi fajl | prilaže PDF/tekst uz pitanje | ostaje na formi | **IMA** |
| Postavi odboru | kreira `submission` | **prozor:** *pitanje je predato, čeka odbor* → *vidi svoja pitanja* / *šta me obavezuje* | **DIO** — nema prozora poslije |

**Šta fali:** **NEMA** — notifikacija odboru čim pitanje stigne.

## 1.2 Odbor vidi da je stiglo

**Ekran:** `/` — *Šta te treba*

| stavka | šta radi | šta slijedi |
|---|---|---|
| red pitanja | otvara pitanje | red u listi | **IMA** |

**Šta fali:** **NEMA** — zvono/brojač koji iskoči kad stigne novo, bez osvježavanja stranice.

---

# 2. Pitanje postaje predmet

**Ekran:** `/questions`

| gumb | šta radi | šta slijedi |
|---|---|---|
| Uzmi kao predmet | kreira `matter` iz pitanja | **prozor:** *predmet otvoren, sudi se po obliku X* → **idi na predmet** | **DIO** |
| Ne uzimaj | traži razlog, odbija pitanje | **prozor:** *banka vidi razlog* → *nazad na red* | **DIO** |
| Više o ovom pitanju | otvara sklopljeno: pozadina, ugovor | ostaje | **IMA** |

**Šta fali:** **NEMA** — prozor poslije oba čina; danas se samo osvježi lista.

---

# 3. Prije prvog koraka — „Prije nego kreneš"

**Ekran:** `/matters/:id`, prije trake koraka

Kaže: šta su poslali · šta traže · po čemu se sudi · **koje alate ovo traži** ·
hoće li brojke doći popunjene.

| gumb | šta radi | šta slijedi |
|---|---|---|
| Pročitao sam — kreni | otvara korak 01 | korak 01 | **IMA** |

**Šta fali:** **KLJUČ** — AI koji pročita PDF i kaže *traže ovo i ovo*.
Danas piše pitanje banke doslovno, što je istinito ali nije sažetak.

---

# 4. Koraci — srce svega

**Prozor:** traka `01 02 … N V` · rad u sredini · pitanje sa strane · traka
dugmadi dolje.

## 4.1 Korak koji traži čitanje dokumenta

| gumb | prozor koji otvara | šta slijedi |
|---|---|---|
| **Ispunjen — dalje** | *(bez prozora)* | zapiše nalaz → **automatski sljedeći korak** | **IMA** |
| **Nije ispunjen** | *„Zapiši kao neispunjeno": ide na odluku, **i u klauzule koje banka dobija** sa linijom da ugovor to mora predvidjeti* | zapiše → **prozor:** *postavi banci zahtjev svojim riječima* → sljedeći korak | **IMA** |
| **Ne primjenjuje se** | *„Ne primjenjuje se": ide na odluku, **ne pravi klauzulu**, banka ovo ne vidi* | zapiše → sljedeći korak | **IMA** |

**Svi traže razlog.** Bez njega su mrtvi, i piše zašto. **IMA** (popravljeno)

## 4.2 Korak koji traži brojku

Isto kao gore, **plus kalkulator otvoren u koraku**.

| gumb | šta radi | šta slijedi |
|---|---|---|
| kalkulator: Izračunaj | računa | pokaže rezultat i da li prelazi prag | **IMA** |
| kalkulator: Zapiši ovaj račun | veže račun za **ovaj uslov** | **prozor:** *zapisano, vezano za korak N* → *zapiši nalaz* | **DIO** |
| Pročitaj brojke iz dokumenta | izvuče brojke iz PDF-a sa citatom | brojke u kalkulatoru, **član potvrđuje** | **KLJUČ** |

**Šta fali:** **KLJUČ** — brojke koje same dođu u kalkulator. Motor postoji
(`extraction.ts`), traži model.

## 4.3 Korak na kojem odbor nije složan

Nikad se ne sklapa. Pokazuje ko je šta našao i zašto. **IMA**

## 4.4 Alat koji član hoće sam

| gdje | šta radi | |
|---|---|---|
| dugme **Alati** u zaglavlju | otvara slajd sa šest kalkulatora | **NEMA** |

**Ovo je ono što je vlasnik rekao da fali:** maknuo sam `Kalkulacije` sa
trake a nisam dao drugi put do njih.

---

# 5. Glasanje

**Stanica `V` u traci.** Ne otvara se dok svi koraci nemaju odgovor.

| gumb | prozor | šta slijedi |
|---|---|---|
| Otvori glasanje | *prag, ko mora potpisati, šta se dešava ako ne prođe* | glasanje otvoreno → **obavijest potpisnicima** (**BANKA**) | **DIO** |
| Zapiši svoj glas | *za/protiv/suzdržan + razlog, i šta tvoj glas znači za prag* | zapisan → *koliko još fali* | **DIO** |
| Zatvori glasanje | *prag je met/nije met, šta slijedi u svakom slučaju* | **dozvola** → period čekanja 48h · **zabrana** → odmah na snazi | **DIO** |
| Prigovori (u periodu čekanja) | *prigovor zaustavlja odluku, traži pisani razlog* | odluka zaustavljena | **DIO** |

---

# 6. Odluka izlazi — ovdje je najveća rupa

Čim glasanje padne i period istekne:

| šta treba da se desi sam od sebe | |
|---|---|
| odluka dobije broj iz serije odbora | **IMA** |
| **PDF se sam sastavi i ponudi** | **NEMA** — danas ga moraš otvoriti sam |
| **ako je pitanje web3: upis u registry** | **NEMA** — ugovor je `onlyOwner` |
| **ako je web2: PDF banci** | **BANKA** |
| nacrt klauzula spreman | **IMA** |
| potpis uređajem | **IMA** |

**Ovo je „automatizam cijelom dužinom" koji vlasnik traži i koji ne postoji.**

---

# 7. Scenariji koji nisu „pitanje iz banke"

## 7.1 Učenjak otvori ugovor sam

**Ekran:** `Biblioteka ugovora` → oblik se otvara **u slajdu**

| gumb | šta slijedi |
|---|---|
| Uzmi ovaj oblik | **prozor:** *uslovi su sad odborovi* → *provjeri nacrt* / *postavi pitanje* | **IMA** |
| Provjeri nacrt protiv ovoga | otvara čitač sa **već izabranim oblikom** | **DIO** — danas vodi na `/check` gdje opet biraš oblik |

**Ovo je rupa koju je vlasnik naveo:** klikneš *provjeri nacrt* i dobiješ
stranicu razbacanih ugovora i dva gumba koja ne znaš čemu služe.

## 7.2 Član hoće samo izračunati nešto

| gdje | |
|---|---|
| **Alati** → slajd → izaberi kalkulator → računaj → *zapiši ili odbaci* | **NEMA** |

## 7.3 Banka gleda šta je smije raditi

| ekran | |
|---|---|
| `Šta me obavezuje` · `Šta smijem trgovati` · `Šta dugujem` | **IMA** |

---

# 8. Šta se mora napraviti, redom

1. **Dugme „Alati"** u zaglavlju → slajd sa svih šest kalkulatora *(vlasnik:
   „kako će iko doći do bilo kojeg toolkita")*
2. **Prozor poslije svakog čina** u glasanju, pitanjima, registru, sjednicama
3. **„Provjeri nacrt" iz oblika** otvara čitač sa već izabranim oblikom
4. **Automatsko izdavanje** kad odluka stupi na snagu: PDF sam iskoči
5. **Notifikacija** kad pitanje stigne
6. **KLJUČ:** AI sažetak pitanja i brojke iz PDF-a u kalkulator
7. **BANKA:** slanje

---

*Ovaj dokument je plan. Ako se nešto gradi a nije ovdje, prvo se dodaje ovdje.*
