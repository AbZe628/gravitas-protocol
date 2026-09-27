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

---

## D · Drugi prolaz, 26.09.2026 — „izgleda kao stranica, ne kao aplikacija"

Četiri mjere, svaka pokrenuta prije i poslije. Skripte su u
`work/majlis-local/`.

### D1. Veze na dnu svakog ekrana

`onward.mjs` — 31 veza kroz 17 ruta, i **svaka** vodi na odredište koje
jarbol već nosi. To nije bila ponuda nego prepis okvira, u jedinom
obliku koji pripada web stranici: srodne veze na dnu. Poslije: 0.

Komponenta `WhatNext` je izvađena, sa njom 37 popisa u `lib/journey.ts`
i 48 ključeva iz tri jezika.

### D2. Glavni čin nije bio na istom mjestu

`cinovi.mjs` — pet ekrana je držalo svoj čin u glavi na 41 px, a tri
negdje između 701 i 1 054. Izvoz revizije je bio na **974 px**, u
kartici ispod tri druge kutije.

Poslije: osam na 41 px. Ostala su dva — `/check` i `/ask` — i oba su
dugme na kraju obrasca, što je mjesto na kojem dugme obrasca i stoji.

### D3. Dva zapisa na jednom ekranu

Dnevnik asistenta je stajao na dnu ekrana zapisa, ispod odluka odbora.
Sada je na ekranu asistenta. Ekran zapisa: 1 188 → **923 px**, a odluke
su 44 % njegove visine umjesto 34 %.

Čuvar: `WhatWasAskedBefore.test.tsx`.

### D4. Red pitanja je nosio arhivu ispod posla

`sloj.mjs questions` — 2 873 px, od toga 1 072 px „already dealt with",
ispod onoga što čeka. Sada su to dva čipa sa brojem, ekran je **1 659
px** i otvara se na onome što čeka. Provjereno pritiskom u pregledniku
(`chip-radi.mjs`), ne samo testom.

### D5. Mete za prst na telefonu

`revizija.mjs` + `sitno-gdje.mjs` — mjera je razdvojila vezu koja stoji
sama od veze usred rečenice, jer 44 px u redu proze lomi red. Samostalnih
ispod 34 px: **4 prije, 0 poslije**. U rečenici ih ostaje 17, namjerno.

Obje veličine `Button`-a su sada 44 px ispod širokog praga, i 28/36 iznad.

### D6. Treća lažna prijava — „tekst bježi iz kutije"

`revizija.mjs` je prijavila 15 bježanja na tri ekrana. **Nijedno nije
stvarno.** Roditelj je `div` sa `display: contents`, čiji je pravougaonik
nula na (0,0), pa svako dijete „bježi" tačno onoliko koliko je udaljeno
od lijeve ivice — otuda „3" koje bježi za 343 px.

Dokaz je `bjezi-provjera.mjs`, koji ispisuje oba pravougaonika i označi
prijavu lažnom kad roditelj ima nultu širinu. Ovo je treći put da mjera
laže prije nego aplikacija.

---

## E · Treći prolaz, 27.09.2026 — put kojim se stvarno ide

### E1. Ekran predmeta je bio kontrolna tabla

`sloj.mjs classic` — jarbol na vratima *Deciding* vodi tu, a predmeti su
počinjali na **843 px**, ispod četiri panela. Sada na **145 px**, a paneli
stoje ispod posla. Redovi su isti red koji koristi svaki drugi popis.

Čin *Raise a matter* je bio tiha kontura od 29 px pored naslova, dok je
na susjednim ekranima čin puno lapis dugme od 39. Sada je čin od 44 px, a
obrazac se otvara u panelu umjesto da se razmota na mjestu. Mjereno
pritiskom (`podigni.mjs`): panel od 720 px sa četiri polja, prvi red se
ne pomjeri — 213 px prije i poslije.

### E2. „Šta te treba" je pokazivalo i ono što treba nekog drugog

`ceka.mjs` — deset redova na `/`, od toga tri čekaju na instituciju ili na
drugog člana. Svaki red **jeste** pisao čije je, ali je ekran koji se zove
*What needs you* tražio da to čitaš red po red.

Sada par u udubljenju — *Yours 7 · Everyone 10* — odvojen od okruglih
čipova za stupanj, jer su to dva različita pitanja. Otvara se na tvojima.
Mjereno pritiskom (`cip-tvoje.mjs`): 7 → 10 → 7, i brojevi po stupnju
prate.

### E3. Obaveza je vodila na popis, ne na sebe

Red je govorio *say what happened, and close it* i imenovao obavezu, a
vodio na cijeli popis. Obaveza nema svoju adresu, pa je red sada
`/undertakings#<id>`: popis se otvori na toj obavezi, osvijetljenoj.
Provjereno (`obaveza-sidro.mjs`) — nađena, u vidnom polju, lapis podloga.

### E4. Četvrta lažna prijava — „ekran bez ijednog čina"

Mjera činova traži pun lapis sa bijelim slovima. Ekran prekršaja je tako
ispao bez ijednog čina, a ima oba: *Record: this is a breach* i *Record:
this is not a breach*, na 478 px, unutar koraka kojem pripadaju. Nisu
lapis nego `grave` i `quiet`, jer to i jesu.

Četvrti put da mjera laže prije nego aplikacija. Provjera je
`prov-cin.mjs`, koji ispiše svako dugme bez obzira na boju.

### E5. Vadjenje veza sa dna je odsjeklo jednu — i čuvar je to prespavao

Kad je `WhatNext` izvađen, svaka od 31 veze je provjerena kao „odredište
jarbola". To je **čitano iz `spine.ts`**, a ne sa ekrana. Iscrtani jarbol
nosi devet odredišta; kičma ih nabraja više.

Mjereno tek sada, `dohvatljivo.mjs` — širina-prvo od dolaska, paleta se
namjerno ne broji:

| | |
|---|---|
| nedohvatljivo na stolu | 7 od 23 |
| od toga namjerno | `/guided`, tri bančina ekrana, `/calculations` *(polica)*, `/assistant` *(ugašen)* |
| **stvarno izgubljeno** | **`/briefings`** |

Vraćeno kao tiha veza na ekranu zapisa, odakle papiri i dolaze. Poslije:
6 nedohvatljivih, svih šest namjerno. Na telefonu isto, sve u tri pritiska.

**Čuvar je postojao i bio zelen.** `Reachable.test.tsx` traži adresu kao
niz bilo gdje u izvoru — pa je `<Route path="/briefings">` u `App.tsx`
zadovoljio uslov. Ruta koja sama sebi dokazuje dohvatljivost.

Sada se broji samo `to=`/`href=` i par u tablici, a `App.tsx` je izuzet
kao i `spine.ts`. Dokazano tako što je veza izvađena i čuvar je pao sa
*„/briefings left the rail and nothing links to it"* — pa vraćena.

Dodana je i gornja ograda, koja je cijelo vrijeme falila: `/guided` je
ruta koju ništa namjerno ne vezuje, pa čuvar koji je prijavi kao vezanu
opet čita tablicu ruta. Tvrdnja „našao sam dosta veza" je zamijenjena
time — jer skener koji ne nađe ništa ionako pada deset puta.
