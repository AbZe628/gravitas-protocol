# Demonstracija: od pitanja banke do fetve

Ovo je scenarij za živu demonstraciju Gravitas Majlisa, napisan tako da se
može odraditi pred ljudima bez iznenađenja. **Svaki korak u njemu je
odrađen uživo, u pregledniku, prije nego je zapisan** — slike u
`docs/guide/D*.png` su iz tog prolaza i nijedna rečenica ovdje ne opisuje
ekran koji nije prošao.

Traje oko deset minuta. Priča je jedna: *banka pita, odbor sudi, banka
dobije papir.*

---

## 0 · Šta ovo pokazuje, i šta namjerno ne pokazuje

**Pokazuje:**

- pitanje ulazi iz banke, sa stvarnim PDF-om ugovora, i PDF se čita **na
  računaru banke** — fajl ne putuje, samo riječi;
- odbor ga uzima kao predmet i bira **oblik ugovora** po kojem se sudi;
- šest uvjeta murabahe, jedan po jedan, svaki sa razlogom i imenom;
- jedan uvjet **pada** — klauzula 3.4 uzima zateznu naknadu u prihod — i
  taj nalaz ulazi u nacrt ugovora koji banka dobije natrag;
- glasanje sa pragom od tri potpisnika, svaki sa svojim obrazloženjem;
- period čekanja, pa **fetva kao dokument**, koju banka otvara sa svog
  ekrana.

**Ne pokazuje, i to treba reći naglas ako neko pita:**

- **niko izvan aplikacije nije obaviješten.** Obavijest se sastavi i
  prikaže, ali je ne nosi nikakav relej dok se ne poveže pošta. Statusna
  traka to piše na svakom ekranu: *Nobody outside is told.*
- **ništa ovdje ne potpisuje u ime odbora.** Potpis učenjaka vlastitim
  ključem je Stage Three; ovo je zapis, ne ovjera.
- period čekanja je stvaran: pravilo stupa na snagu za dva dana ako niko
  ne uloži prigovor. U demonstraciji se **ne čeka** — pokaže se papir i
  pređe na već važeće pravilo (§5).

---

## 1 · Prije nego počneš

### Šta ti treba

| stvar | gdje |
|---|---|
| bacivi odbor i vjerodajnice | `cd apps/majlis/server && npx tsx scripts/members.ts` |
| PDF banke | `apps/majlis/samples/treasury-enquiry.pdf` (već u repou) |
| četiri prozora preglednika | banka + tri člana odbora |

Vjerodajnice se **ne** upisuju u repozitorij. Drži ih van njega
(`work/majlis-local/`) i koristi bacivi odbor, nikad pravi.

### Zašto četiri prozora

Server prepoznaje člana po HTTP basic vjerodajnici, a preglednik pamti
**jednu po adresi** — dvije uloge se ne mogu otvoriti jedna pored druge na
istom portu. Zato jedan dev-server po ulozi, svaki na svom portu:

```bash
cd apps/majlis/server
PORT=4105 MAJLIS_ORIGIN=http://localhost:5177 MAJLIS_MEMBERS="<blok iz members.ts>" npx tsx src/index.ts
```

Pa po jedan prozor za svaku ulogu (`MAJLIS_AS` nosi vjerodajnicu kroz
proxy, i postoji **samo** u dev-serveru — build ga ne čita):

```bash
cd apps/majlis/client && MAJLIS_API=http://localhost:4105 MAJLIS_AS=desk-treasury:<lozinka> npx vite --port 5181 --strictPort
```

```bash
cd apps/majlis/client && MAJLIS_API=http://localhost:4105 MAJLIS_AS=member-a:<lozinka> npx vite --port 5177 --strictPort
```

Isto za `member-b` na 5178 i `member-c` na 5179.

> **Port 4000 nikad.** To je tvoja instanca. Demonstracija ide na 4105.
> Varijabla je `PORT`, ne `MAJLIS_PORT`.

**Provjeri prije publike:** otvori 5181 — u zaglavlju desno mora pisati
`desk-treasury`, a rail imati tri vrata (*I asked*, *Binds me*, *I owe*).
Ako piše član odbora, `MAJLIS_AS` nije stigao i demonstracija bi počela
tako što banka vidi odborove ekrane.

---

## 2 · Prozor A — banka postavlja pitanje

Otvori **5181**. Ekran je `Put a question to the board`.

![Prazan obrazac banke](guide/D01-banka-prazan-obrazac.jpg)

Reci dok pokazuješ: *ovo je cijela aplikacija koju banka dobije. Tri
vrata, ne dvadeset. Ovdje se pita, ovdje se vidi šta me veže, ovdje šta
dugujem.*

**Popuni četiri polja** (tekst koji je prošao, možeš koristiti doslovno):

| polje | šta upisati |
|---|---|
| One line to find it by | `Interbank liquidity through a commodity murabaha` |
| What you are asking | `Whether the attached master agreement may be used for interbank placements, and on what conditions.` |
| What the board needs to know | `Treasury proposes to place surplus liquidity with three counterparties under the attached commodity murabaha master agreement. Clause 3.4 takes a late-payment increase of 1.5 per cent per month to the bank's own income.` |
| What you are waiting to do | `Sign the master agreement with the first counterparty` |

Ispod piše **Never edited. The board's reading appears beside it.** — to je
rečenica koju vrijedi pročitati naglas: pitanje banke se nikad ne
prepravlja.

**Priloži ugovor.** `Choose a file` → `apps/majlis/samples/treasury-enquiry.pdf`.
Pojavi se ime fajla i broj znakova (`3314 characters`).

![Popunjeno, sa PDF-om](guide/D02-banka-popunjeno-sa-pdf.jpg)

Ovdje je jedna od jačih rečenica u proizvodu, i piše na ekranu: *A PDF is
read here on this computer: the file stays, and only its words travel.*
Nacrt ne ide na server. Radi i na instalaciji koja nema nikakav disk za
dokumente — a to je većina njih.

**Pritisni `Put it to the board`.** Otvori se prozor sa tri rečenice: šta
čin radi, šta znači, šta slijedi.

![Prozor čina](guide/D03-banka-prozor-cina.jpg)

> **Ovo je pravilo cijele aplikacije i vrijedi ga imenovati:** ništa se ne
> upisuje dok se ne potvrdi u prozoru. Nema slučajnog klika koji nešto
> pošalje.

Potvrdi. Ekran kaže **DONE — The question is with the board**, i pitanje
se pojavi u listi ispod sa oznakom `WAITING`.

![Poslano](guide/D04-banka-poslano.jpg)

---

## 3 · Prozor B — odbor uzima pitanje

Pređi na **5177** (član A, potpisnik i predsjedavajući). Otvori
`What needs you` pa `I asked` — ili idi direktno na red pitanja.

![Red pitanja](guide/D05-odbor-red-pitanja.jpg)

Pitanje banke stoji tu, najstarije prvo. Dva čina: `Take it up as a matter`
i `Do not take it up`. **Odbijanje traži razlog** i razlog ide banci — to
je jedina stvar koju banka dobije nazad kad se pitanje ne uzme.

Pritisni **`Take it up as a matter`**. Prozor traži tri stvari:

![Prozor uzimanja](guide/D06-odbor-prozor-uzimanja.jpg)

| polje | šta upisati |
|---|---|
| The question as the board puts it | `Whether a commodity murabaha master agreement may be used for interbank placements` |
| What is proposed | `Permit placements under the attached agreement, subject to the conditions the board sets on the late-payment clause` |
| What would this change do | `It permits something that is not permitted` |

![Prozor popunjen](guide/D06b-odbor-prozor-popunjen.jpg)

Zašto dva teksta: **pitanje banke i pitanje odbora su dvije stvari i oba
ostaju u zapisu**, pa čitalac poslije može vidjeti je li odbor odgovorio
na ono što je pitano.

Potvrdi. Nastane predmet, u stanju `DRAFT`.

![Poslije uzimanja](guide/D07-odbor-poslije-uzimanja.jpg)

---

## 4 · Predmet: od nacrta do fetve

### 4.1 Otvori za raspravu

Na predmetu stoji jedan čin: **`Open for deliberation`**. Prozor kaže šta
to znači — *svaki član ga od sada vidi na svojoj listi, i sat po kojem se
mjeri institucija kreće odavde.*

![Otvaranje rasprave](guide/D09-otvori-raspravu.jpg)

### 4.2 Izaberi oblik ugovora

Predmet nastao iz pitanja banke **nema oblik** — niko još nije odlučio o
kakvom se ugovoru radi. Ekran to kaže i odmah nudi biblioteku:

![Predmet bez oblika](guide/D10-predmet-bez-oblika.jpg)

Devetnaest oblika u deset porodica. Izaberi **Murabaha, including
commodity murabaha and tawarruq**. Prozor kaže šta izbor povlači: *svaki
korak odavde je jedan njen uvjet, po njenom redu.*

![Prozor oblika](guide/D11-prozor-oblika.jpg)

Potvrdi sa `Judge it by this`. Traka na vrhu se popuni: `i · 01 02 03 04
05 06 · V` — uvod, šest uvjeta, glasanje.

![Predmet sa oblikom](guide/D12-predmet-sa-oblikom.jpg)

> Ovo je mjesto gdje demonstracija najjače radi: *ovdje se ne piše prazan
> dokument. Odbor dobije uvjete murabahe po standardu, onako kako ih ovaj
> odbor drži, i odgovara na njih jedan po jedan.*

### 4.3 Šest uvjeta

Svaki korak je jedan uvjet, sa objašnjenjem zašto postoji, i tri čina:
`Does not apply`, `Not met`, `Met — next`. **Razlog je obavezan** — dugme
je mrtvo dok se ne napiše.

![Prvi uvjet](guide/D13-korak-jedan.jpg)

Prođi prva četiri kao ispunjena (dovoljna je jedna rečenica po uvjetu).
Peti — **`No increase is taken to income on late payment`** — je onaj koji
pada.

![Uvjet koji pada](guide/D15-uvjet-koji-pada.jpg)

Upiši razlog i pritisni **`Not met`**. Pročitaj šta prozor kaže, jer je to
srž prodaje:

> *This goes on the ruling as not met, under your name. It is also drafted
> into the agreement clauses the bank receives, with a line saying the
> agreement must provide for it — so the institution sees what has to
> change rather than finding out at the audit.*

![Prozor „nije ispunjeno"](guide/D16-prozor-nije-ispunjeno.jpg)

**Ako te neko pita može li se nalaz ispraviti:** može, i vrijedi to
pokazati. Zapiši isti uvjet ponovo sa drugim ishodom — raniji nalaz
ostaje u historiji sa oznakom da je nadjačan. **Zapis je dodavni: ništa se
ne briše, ispravka se dodaje.**

![Poslije šest nalaza](guide/D14-poslije-koraka.jpg)

### 4.4 Rasprava

Otvori okno **`What was said`** i upiši stav. Jedna rečenica je dovoljna:

> `The shape holds on five of the six conditions. The late-payment clause does not: 3.4 takes the increase to income, and that has to be redrafted as a charitable undertaking before this desk signs anything under the agreement.`

![Rasprava](guide/D19-rasprava.jpg)

![Glasanje se odbija otvoriti](guide/D18-glasanje.jpg)

**Ovo nije formalnost.** Prije nego išta bude rečeno, glasanje se **odbija
otvoriti**, i kaže zašto: *Nothing has been said on this matter yet, so the
vote cannot open. Add to the deliberation first — voting opens after
deliberation, not instead of it.* Vrijedi to namjerno pokazati prije nego
upišeš stav.

U istom oknu je i **`Ask someone`** — imenovanje kolege, koje mu se pojavi
na listi.

### 4.5 Glasanje

Zadnja stanica u traci je `V`. Pritisni **`Open the vote`**.

![Glasanje otvoreno](guide/D21-glasanje-otvoreno.jpg)

Ekran pokazuje `0 of 3 · Threshold not met` i **poimenično ko još nije
glasao**. Izaberi `In favour`, upiši obrazloženje, pa **`Record my
position`**. Obrazloženje je obavezno i uz glas.

![Glas spreman](guide/D23-glas-spreman.jpg)

![Glas zabilježen](guide/D24-glas-zabiljezen.jpg)

Sada pređi na **5178** i **5179** i uradi isto kao član B i član C.
Poslije trećeg glasa piše `3 of 3 · Threshold met`.

> Ovdje se prodaje sam mehanizam: *pravilo ne donosi aplikacija i ne donosi
> ga predsjedavajući. Donose ga tri imenovana potpisnika, svaki sa svojim
> razlogom, i sva tri razloga ostaju u dokumentu.*

Vrati se na 5177 i pritisni **`Close the vote`**.

![Zatvaranje glasanja](guide/D25-zatvori-glasanje.jpg)

Predmet prelazi u **`WAITING PERIOD`** i pojavi se
**`THE WRITTEN DECISION`**. Šta slijedi ne odlučuje niko pritiskom —
odlučuje broj glasova i smjer.

---

## 5 · Natrag u banku: papir

Vrati se na **5181** i osvježi.

Pitanje sada stoji kao **`TAKEN UP`**, a ispod njega je
**`The ruling, written up — OPENS THE DOCUMENT`**.

![Banka vidi presudu](guide/D26-banka-sta-je-bilo.jpg)

Otvori dokument. On nosi:

- pitanje kako ga je odbor postavio;
- **svih šest uvjeta, sa ishodom, imenom člana i njegovim razlogom** —
  uključujući onaj koji nije ispunjen;
- šta odluka izričito **ne** rješava;
- i, pri vrhu: *The board has decided. This ruling is not yet in effect. It
  takes effect on <datum> unless a signatory objects before then.*

Taj zadnji red je period čekanja i **ne treba ga preskakati** — to je
prigovorni rok, i on je razlog zašto pravilo koje je prošlo glasanje nije
isto što i pravilo na snazi.

**Zato se demonstracija završava na već važećem pravilu.** Otvori
`Binds me` u istom prozoru: tu su pravila koja su **na snazi danas**, sa
brojkama koje se moraju držati i vezom na provjeru ugovora.

![Šta me veže](guide/D27-banka-sto-me-vezuje.jpg)

Rečenica za kraj: *desk ne traži fetvu po mailovima. On otvori svoj ekran
i vidi šta ga veže danas, i može svaki nacrt provjeriti prema tome prije
nego ga potpiše.*

---

## 6 · Ako zapne

| šta se vidi | šta je | šta uraditi |
|---|---|---|
| Banka vidi odborove ekrane | `MAJLIS_AS` nije stigao do proxyja | provjeri da si ga postavio u **istom** terminalu u kojem si pokrenuo vite |
| Ekrani prazni, sve se učitava | server nije na portu iz `MAJLIS_API` | provjeri `PORT=4105` |
| `Met — next` je mrtvo | razlog nije upisan | razlog je obavezan na svakom nalazu |
| `Open the vote` nema | nije bilo rasprave | upiši stav u okno `What was said` |
| Potpis uređajem ne radi | `MAJLIS_ORIGIN` ne odgovara portu klijenta | server tačno odbije potpis napravljen za drugu adresu |
| Nakon svega, nema fetve | predmet nije zatvoren | `Close the vote` je čin koji proizvodi dokument |

---

## 7 · Kratka verzija, ako imaš tri minute

1. **5181**, banka: popuni pitanje, priloži PDF, pošalji. *„Fajl ostaje
   ovdje, putuju samo riječi."*
2. **5177**, odbor: `Take it up as a matter` → `Open for deliberation` →
   izaberi **Murabaha**. *„Odbor ne piše prazan dokument, nego odgovara na
   uvjete."*
3. Otvori **peti uvjet** i zabilježi ga kao `Not met`. Pročitaj prozor.
   *„Ovo ulazi u ugovor koji banka dobije nazad."*
4. **5181**, banka: otvori `Binds me`. *„Desk vidi šta ga veže danas."*
