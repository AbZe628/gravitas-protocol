# Nalaz: prolazak kroz Majlis na telefonu, tabletu i stolu

22.09.2026. Prošao sam aplikaciju na tri širine (375×812, 768×1024,
1440×900), kao član odbora i kao banka, i izmjerio pet stvari na svakoj od
25 ruta: šta leži ispod fiksnih traka, šta bježi iz svoje kutije, šta se
preklapa, koliko je meta premala za prst, i prelijeva li se stranica.

Mjera je `work/majlis-local/revizija.mjs`.

> **Tri stvari koje je prva mjera prijavila kao kvar nisu bile kvar.**
> Svaka je provjerena prije nego je išta dirano, i to je zapisano ovdje
> jer bi inače neko za pola godine popravljao ono što nije pokvareno.

---

## A · Šta je bilo stvarno pokvareno, i šta je urađeno

### A1. Radni prozor predmeta crtao je tekst preko teksta

`/matters/:id` na 375: **12 preklapanja**, najveće 21 840 px². Tri sloja
teksta na istom mjestu, ništa se ne čita. Naslov odsječen na „Treat…",
red okana presječen desnom ivicom.

**Uzrok:** `StepWindow` je bio jedna kutija fiksne visine na svakoj širini
— `100vh − 7.5rem`, nikad manje od 560 px, sa `overflow: hidden` i četiri
regije unutar nje. Na telefonu je okvir iznad 184 px, a ne 120 koliko ta
visina pretpostavlja, pa su regije bile više od kutije koja ih je trebala
isjeći.

**Urađeno:** ispod stola je to običan tok — naslov, traka, posao, okna,
činovi. Ništa nema visinu u koju se mora uklopiti. Izmjereno ponovo:
**nula preklapanja**, na telefonu, tabletu i kod banke, na svim rutama.

### A2. Četiri trake prije prvog reda posla

Jarbol 60 px, jezik 41 px, red grupe, polica alata. **Posao je počinjao na
184 px od 812**, plus donja traka 61 px.

**Urađeno:** jezik je jedna lista pored reda grupe; alati su jedan gumb u
jarbolu koji otvara isti panel koji otvara i polica. Polica ostaje na
stolu. **Posao počinje na 114 px.** Dvije trake umjesto četiri.

### A3. Mete premale za prst

397 kontrola ispod 34 px na 25 ruta — 11 do 23 po ekranu. `Do not take it
up` 94×**19**, `Withdraw this` 79×**19**, filteri 35×**19**, koraci
predmeta 28×28, jezici 64×25, alati 83×26.

**Urađeno:** 44 px ispod stola na tihim činovima, filterima reda, traci
koraka, jezičcima okana, biračima u alatima i oblicima, redu grupe,
karticama na *what stands* i vezi u mrvicama. Gdje je red teksta sama
kontrola, poraste pogodak a ne crta.

**397 → 24.** Ostatak su pojedinačne veze usred rečenice, gdje bi 44 px
razbilo red u kojem stoje.

### A4. Tri reda oznaka prije naslova

`/rules/:id` je otvarao sa `VERSION 3`, `THE TERMS MATCH WHAT WAS
RECORDED`, `NO REVIEW SCHEDULED` — tri reda metapodatka prije nego se
sazna o čemu je pravilo. **Urađeno:** oznake idu ispod naslova.

### A5. Jarbol je stavljao ime proizvoda prvo

Sa četiri kontrole veličine prsta nasuprot, „Gravitas Majlis" se lomilo u
dva reda a ime odbora je bilo odsječeno. **Urađeno:** ime odbora dobija
širinu; ime proizvoda je sitan red ispod.

---

## B · Prijavljeno kao kvar, a nije

### B1. „Tekst ispod donje trake"

Prva mjera je prijavila do 15 008 px² teksta pod donjom trakom na svakoj
ruti. To je bio tekst koji **prolazi** ispod poluprozirne trake dok se
skrola, što radi svaki telefon na svijetu.

Provjereno posebnom mjerom (`dokraja.mjs`): skrolano do kraja, posljednji
red završava **43 px iznad** trake, na svih 16 provjerenih ruta. `main`
već nosi razmak od 104 px.

### B2. „Tekst bježi 328 px van kutije"

Prijavljeno na `/rules/:id`, `/register/:id`, `/library/:id`. Izmjereno
prema prozoru (`vanekrana.mjs`): **nijedan element ni na jednom ekranu
nije van ekrana**, i nijedna stranica se ne prelijeva. Mjera je poredila
dijete sa roditeljem koji ga smije prerasti.

### B3. „Banka vidi neke ekrane odbora a neke ne"

Pravilo **jeste** napisano na jednom mjestu: `client/src/lib/spine.ts`,
`DESK_ROUTES`, sa razlogom uz svaki izuzetak — `/incidents` je tu jer
*what I owe* vodi na zapis o pojedinom prekršaju, pa bi veza koja završi
na *this one is the board's* bila kontradikcija jedan ekran kasnije.

---

## C · Šta ostaje, i nije kvar nego dotjerivanje

1. **24 sitne mete** — pojedinačne veze u rečenici.
2. **Kartice na telefonu troše širinu** na stupac sa brojem dana
   (~90 px od 375).
3. **Ime odbora se skraćuje** na 375 („Demonstrati…").
4. **Dvije tihe veze pod filterima** na početnom ekranu izgledaju kao
   ostatak, ne kao izbor.

Ništa od ovoga ne mijenja šta Majlis radi niti ijedan pojam iz
priručnika.
