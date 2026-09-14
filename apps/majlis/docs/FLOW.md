# Algoritam — svaki čin, u svakom stanju, sa svakom granom

**36 ruta (~29 radnih ekrana), 76 činova.** Prebrojano iz `App.tsx` i
`server/test/majlis.test.ts`. Granice uloga i prelaza pročitane iz
`lib/identity.ts` i `services/lifecycle.ts` — ne po sjećanju.

> **Ispravljeno po nalazu drugog čitaoca.** Šest grešaka, sve provjerene u kodu
> i sve tačne: broj je 76 a ne 74; `/check?shape=` odavno nosi oblik; plaćanje
> purifikacije i spajanje instrumenata **ne postoje**; tri čina su bila
> pogrešno označena kao nedovršena; a „Pročitao sam — kreni" sam bio **obrisao**
> pri prepisivanju ekrana.

**Ništa se ne gradi dok ovo nije potvrđeno.**

---

## Pet stvari od kojih zavisi svaki čin

Isti gumb vodi različito. Ovo su dimenzije po kojima se grana:

| | vrijednosti |
|---|---|
| **stanje predmeta** | nacrt · rasprava · glasanje · period čekanja · na snazi · odbijen · istekao · povučen |
| **uloga** | potpisnik · savjetodavni · vezni · banka · posmatrač *(+ predsjedavajući / sekretar)* |
| **već urađeno** | već glasao · već potpisao · već pitao banku · već zapisao nalaz |
| **instalacija** | ima lanac / nema · ima asistenta / nema · ima volumen / nema · ima relay / nema |
| **odakle si došao** | iz predmeta · samostalno · iz reda · iz registra |

### Granice iz koda, doslovno

**Prelazi** (`lifecycle.ts`): nacrt → rasprava, povučen · rasprava → glasanje,
povučen · glasanje → rasprava, čekanje, na snazi, odbijen, povučen · čekanje →
na snazi, odbijen, povučen · **na snazi → samo istekao** · odbijen, istekao,
povučen → **nikuda**.

**Ko šta smije** (`identity.ts`): raspravlja = potpisnik, savjetodavni, vezni ·
**glasa = samo potpisnik** · unosi šta je banka uradila = sekretar ili vezni ·
zapisnik = sekretar ili predsjedavajući · predaje pitanje = banka ili bilo ko
od odbora.

---

# A. Predmet — svaki gumb, sve grane

## A1 · „Ispunjen — dalje" / „Nije ispunjen" / „Ne primjenjuje se"

| stanje | uloga | šta se vidi | gdje vodi |
|---|---|---|---|
| rasprava | potpisnik / savjetodavni / vezni | sva tri gumba | **sljedeći korak bez odgovora**; ako ga nema → stanica `V` |
| rasprava | posmatrač / banka | **gumba nema** | — |
| rasprava | bilo ko, razlog prazan | gumbi **mrtvi**, traka piše zašto | — |
| glasanje otvoreno | bilo ko | **gumba nema** — nalazi se ne mijenjaju usred glasanja | **NEMA: nije provjereno u kodu** |
| na snazi / odbijen / istekao / povučen | bilo ko | **gumba nema** | — |
| „Nije ispunjen" uspio | potpisnik | prozor → *postavi banci zahtjev* | sljedeći korak |
| uslov već odgovoren od mene | | gumbi stoje, **mijenjaju** raniji nalaz | isti korak |
| drugi član našao suprotno | | korak se **nikad ne sklapa**, piše ko je šta našao | isti korak |

## A2 · „Pitaj banku o ovom uslovu"

| stanje | uloga | grana |
|---|---|---|
| rasprava, nije pitano | odbor | nacrt sa uslovom u sebi → poslano → **sat se odvaja** |
| rasprava, već pitano, nema odgovora | odbor | pokazuje ranije pitanje, **ne duplira** |
| rasprava, odgovoreno | odbor | odgovor banke uz uslov |
| glasanje / na snazi | bilo ko | **NEMA: nedefinisano** |
| banka gleda | banka | vidi pitanje na `/i-owe`, odgovara tamo |

## A3 · „Otvori glasanje"

| stanje | uloga | grana |
|---|---|---|
| rasprava, koraci neodgovoreni | potpisnik | **gumba nema**, piše koliko fali |
| rasprava, niko nije govorio | potpisnik | server odbija — **na ekranu nije rečeno unaprijed** |
| rasprava, sve spremno | potpisnik | prozor: *prag N, ko mora potpisati* → glasanje |
| rasprava | savjetodavni / vezni / posmatrač | **gumba nema** |
| nacrt | bilo ko | prvo rasprava |

## A4 · „Zapiši glas"

| stanje | uloga | grana |
|---|---|---|
| glasanje | potpisnik, nije glasao | za / protiv / suzdržan + **razlog obavezan** |
| glasanje | potpisnik, već glasao | **NEMA: mijenja li se glas?** nedefinisano |
| glasanje | savjetodavni | **gumba nema** — može reći u raspravi |
| glasanje | posmatrač / banka | ne vidi ni raspravu |

## A5 · „Zatvori glasanje"

| grana | ishod |
|---|---|
| prag met, **dozvola** | → period čekanja 48h |
| prag met, **zabrana** | → **odmah na snazi** |
| prag nije met | → **odbijen**, kraj |
| prag se pomjerio usred glasanja | sudi se po **pragu pod kojim je otvoreno** |

## A6 · Period čekanja

| grana | ishod |
|---|---|
| bilo koji potpisnik prigovori | **zaustavljeno** |
| 48h prošlo, bez prigovora | → na snazi |
| neko zatvori prije roka | server odbija |
| **zabrana na snazi, prozor ratifikacije istekao** | **NEMA ČINA — zabrana nikad ne istekne** |

## A7 · Ostali činovi na predmetu

| čin | dostupan kada | gdje vodi |
|---|---|---|
| Priloži dokument | rasprava, ima volumen | uz predmet; **bez volumena gumba nema** |
| Prigovori dokazu / Povuci dokaz | rasprava | ostaje u zapisu označen |
| Promijeni oblik | rasprava | **koraci se mijenjaju, nalazi ostaju** |
| Postavi termine | rasprava | → glasanje |
| Šta se mora desiti kad prođe | rasprava ili na snazi | koraci za banku |
| Reci nešto / označi riječi | do zatvaranja glasanja | rasprava |
| Pošalji komitetu | rasprava | komitet javlja, **ne presuđuje** |
| Povuci predmet | nacrt, rasprava, glasanje, čekanje | **ne** kad je na snazi |
| Vrati u raspravu | glasanje | glasovi padaju |
| Potpiši odluku | na snazi | uređajem ili prijavom |

---

# B. Prekršaj — devet faza, sa granama

| čin | dostupan kada | grana |
|---|---|---|
| Prijavi | — | **danas samo odbor; banka ne može** — odluka čeka |
| Stvaran / **nije stvaran** | prijavljen | stvaran → teče 30 dana · **„nije stvaran" nije na ekranu** |
| Zaustavljeno | stvaran | datum u zapis |
| Na upravni odbor | stvaran | van šerijatskog odbora |
| Plan | stvaran | prihvati / **vrati sa razlogom** |
| Purifikacija | stvaran | iznos i kome |
| Plaćeno | purifikacija određena | **banka ne može sa `/i-owe`** — samo odbor |
| Zatvori | plan izvršen | u godišnji izvještaj |

---

# C. Ostali ekrani — grane ukratko

| ekran | grana koja mijenja ishod |
|---|---|
| Red pitanja | **uzmi** → predmet · **ne uzimaj** → razlog banci · već uzeto → vodi na predmet |
| Biblioteka | oblik **neuzet** → *Uzmi* · **uzet** → *Preispitaj* · **odbijen** → razlog stoji |
| Poslije *Uzmi oblik* | **iz predmeta** → nazad na predmet · **samostalno** → provjeri nacrt / postavi pitanje |
| Registar | nikad suđen → *otvori predmet* · suđen → *vidi odluku* · povučen → čitanje |
| Provjeri nacrt | `?shape=` → oblik već izabran · `?from=` → i ugovor donesen · bez toga → **biraš sam** |
| Sjednica | otvorena → prisustvo i zapisnik · **zatvorena → ništa se ne mijenja** |
| Alati | **u koraku**: aplikacija bira · **iz trake**: član bira, ne veže se ni za šta |

---

# D. Stanja koja nisu činovi

| situacija | šta ekran radi | |
|---|---|---|
| server ćuti | *ne zna se* ≠ *ništa ne čeka* | IMA |
| prazna lista | rečenica šta to znači | IMA |
| bez asistenta | paneli **odsutni**, ne sivi | IMA |
| bez lanca | kolona tokeniziranog **ne postoji** | IMA |
| bez volumena | prilaganje **odsutno** | IMA |
| jezik en/ar/ur | mijenja i smjer | IMA |
| timelock istekne | **NEMA** — nije rečeno šta se desi |
| obaveza/pregled dospije | crveni red | IMA |
| stara adresa `/classic`, `/record` | **NEMA** preusmjerenja |

---

# E. Tri odluke — nema ih ni u kodu

1. **Izuzeće člana.** Nema rute.
2. **Ratifikacija zabrane.** Prozor u tipu, čina nema.
3. **Ko smije prijaviti prekršaj i platiti purifikaciju.** Danas: samo odbor.

---

# F. Šta ostaje

| | |
|---|---|
| Prozor + „šta slijedi" na svih 76 činova | danas ~8 |
| Automatizam odluka → PDF / registry | NEMA |
| Notifikacija kad pitanje stigne | NEMA |
| Grane označene **NEMA: nedefinisano** gore | nisu odlučene |

---

*Gradi se tek kad ovo bude potvrđeno. Ako se gradi nešto čega nema ovdje,
prvo se dodaje ovdje.*
