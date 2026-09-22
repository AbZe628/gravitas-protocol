# Nalaz: prolazak kroz Majlis na telefonu, tabletu i stolu

22.09.2026. Prošao sam aplikaciju na tri širine (375×812, 768×1024,
1440×900), kao član odbora i kao banka, i izmjerio pet stvari na svakoj od
25 ruta: šta leži ispod fiksnih traka, šta bježi iz svoje kutije, šta se
preklapa, koliko je meta premala za prst, i prelijeva li se stranica.

Mjera je `work/majlis-local/revizija.mjs`. Brojevi ispod su iz nje, ne iz
oka.

---

## A · Pokvareno — izmjereno, nije utisak

### A1. Sadržaj klizi ispod donje trake. Svaka ruta.

Donja traka je fiksna i visoka 61 px, a stranica ispod nje nema nikakav
razmak. Posljednji red teksta na svakom ekranu leži pod njom.

| ruta | koliko teksta je pod trakom |
|---|---|
| `/matters/matter-2026-07-03` | 15 008 px² |
| `/questions` | 14 520 px² |
| `/examinations` | 11 933 px² |
| `/ask` | 4 414 px² |
| ostale | 1 000 – 4 000 px² |

Na 768 isto. **Ovo je „gubljenje teksta" iz prijave.**

Popravka: `padding-bottom` na poslu jednak visini trake, i to iz jednog
mjesta a ne po ekranu.

### A2. Radni prozor predmeta na telefonu — tekst preko teksta

`/matters/:id` na 375 ima **12 preklapanja**, najveće 21 840 px². Tri
sloja teksta se crtaju jedan preko drugog i ništa se ne može pročitati.

Na istom ekranu:

- naslov je odsječen na **„Treat…"** — tri slova, jer oznake stanja uzmu
  ostatak reda;
- red okana (`Guidance · What was said · Sources · Limits`) presječen je
  desnom ivicom, zadnje okno se ne vidi;
- traka koraka `i 01…06 V` radi, ali su dugmad 28×28 px.

Uzrok: `StepWindow` je građen za stol — okna stoje **pored** posla, a
traka činova je na dnu. Na telefonu te tri zone padnu jedna na drugu.

Popravka: na telefonu okna nisu pored posla nego ispod njega, jedno po
jedno, i traka činova je u toku stranice a ne apsolutna.

### A3. Detaljni ekrani bježe 328 px van kutije

Na `/rules/:id`, `/register/:id` i `/library/:id` popis činjenica
(`Family`, `Kind`, `Standing`, `In force from`, `Next review`, `The
conditions`) je dvostupačna mreža koja se na telefonu **ne slama**.
Vrijednosti su gurnute 328 px desno od ivice ekrana — dakle nevidljive.

Na tabletu isto: 4 do 6 elemenata po ekranu.

Popravka: ispod 640 px jedan stupac, oznaka iznad vrijednosti.

### A4. Mete premale za prst

Preporuka je 44 px, apsolutni minimum 40. Izmjereno na 375:

| kontrola | veličina |
|---|---|
| `Do not take it up` | 94 × **19** |
| `Withdraw this` | 79 × **19** |
| filteri `Asked` `Checked` | 35 × **19** |
| jezik `English` `العربية` `اردو` | 64 × **25** |
| alati na polici | 83 × **26** |
| koraci `01`…`06` | 28 × **28** |
| `Skip to the work` | 32 × **16** |

**11 do 23 takvih po ekranu**, na svakoj ruti. Na tabletu do **33**
(`/library`).

Popravka: minimalna visina 44 px za sve što se pritišće ispod 1024 px.

### A5. Četiri trake prije prvog reda posla

Na telefonu, odozgo: jarbol 60 px, jezik 41 px, red grupe, polica alata.
**Posao počinje na 184 px**, plus donja traka 61 px — **30 % ekrana je
okvir**, prije nego se išta pročita.

Na stolu okvir je 68 px gore i 30 px dolje, dakle 11 %.

Popravka: na telefonu ostaju dvije trake. Jezik ide u meni pod avatarom
(bira se jednom, ne svaki dan), polica alata ide u jedan gumb.

---

## B · Nelogično i neusklađeno

### B1. Jezik zauzima cijeli red na telefonu, a na stolu je sitnica

Tri dugmeta preko cijele širine, na svakom ekranu, za izbor koji član
napravi jednom u životu. Na stolu je isti izbor mala kontrola u jarbolu.

### B2. Polica alata stoji i tamo gdje računanje nema smisla

Sedam alata je na `/settings`, `/search`, `/briefings` i na svakom
detaljnom ekranu. Na telefonu je to cijela traka. Alat treba biti dostupan
odasvud — ali kao **jedan gumb**, ne kao sedam natpisa preko ekrana.

### B3. „Skip to the work" je meta 32×16 i leži pod jarbolom

Veza za preskakanje navigacije je korisna, ali je ovdje i premala i
prekrivena. Ili je treba pokazati kako spada (vidljiva na fokus, preko
svega) ili je nema.

### B4. Dvije oznake za isto stanje

Na `/rules/:id` stoje tri oznake u tri reda prije naslova: `VERSION 3`,
`THE TERMS MATCH WHAT WAS RECORDED`, `NO REVIEW SCHEDULED`. Tri reda
metapodatka prije nego se sazna o čemu je pravilo.

### B5. Banka vidi ekrane odbora kao „ovo je odborovo", ali ne sve

`/undertakings` i `/incidents` banci prikazuju pravi sadržaj, a
`/questions`, `/rules` i `/record` je odbiju sa *This one is the board's*.
Nije pogrešno — ali nigdje nije rečeno zašto su dva od tih ekrana njeni a
tri nisu.

---

## C · Šta predlažem, po redu

**Prvo, jer se vidi golim okom i jer je kvar:**

1. razmak ispod posla na visinu donje trake (A1)
2. radni prozor predmeta prepravljen za telefon (A2)
3. popis činjenica u jedan stupac ispod 640 px (A3)
4. 44 px za svaku metu ispod 1024 px (A4)

**Drugo, jer je to „pojednostaviti za 70 %":**

5. dvije trake umjesto četiri na telefonu (A5, B1, B2)
6. oznake stanja ispod naslova, ne prije njega (B4, A2)

**Treće, ako se složiš:**

7. odluka šta banka smije vidjeti, napisana na jednom mjestu (B5)

Ništa od ovoga ne mijenja šta Majlis radi niti ijedan pojam iz
priručnika. Mijenja gdje stvari stoje na uskom ekranu.
