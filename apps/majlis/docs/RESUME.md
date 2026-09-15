# NASTAVAK — pročitaj samo ovo

**Ne čitaj STATE.md, POPIS.md ni FLOW.md da bi počeo.** Ovdje je sve što
treba. FLOW.md se otvara tek kad vlasnik kaže da se gradi.

---

## 1 · STANI — ovo je stanje

**Ništa se ne gradi.** Algoritam `docs/FLOW.md` čeka vlasnikovu potvrdu.
Rekao je to dva puta, a ja sam dva puta ipak počeo graditi. **Ne opet.**

Kad vlasnik napiše „nastavljamo", prvo pitanje glasi:
**je li algoritam potvrđen, ili ga još ispravljamo?**

- ako **ispravljamo** → mijenja se samo `docs/FLOW.md`, ništa u kodu
- ako je **potvrđen** → gradi se redom iz §10 tog dokumenta

---

## 2 · Šest odluka koje čekaju vlasnika

Nisu greške nego odluke. Bez njih se ne može dalje na tim mjestima.

1. **Izuzeće člana (recusal)** — nema rute nigdje u kodu
2. **Ratifikacija zabrane** — `ratificationWindowHours` postoji u tipu, čina
   nema → zabrana nikad ne istekne
3. **Ko prijavljuje prekršaj i plaća purifikaciju** — danas samo odbor;
   `/i-owe` je samo za čitanje
4. **Nalaz dok je glasanje otvoreno** — kod to ne zabranjuje
5. **Promjena glasa** — nedefinisano
6. **Glasanje bez rasprave** — server odbija, ekran ne kaže unaprijed

---

## 3 · Šta je napravljeno 14–15.09.

Obrazac za „aplikacija, ne web stranica" — **postoji i radi**:

| komponenta | šta radi |
|---|---|
| `StepWindow` | radni prozor: naslov · traka stanica · rad · bočno okno · traka činova |
| `Dialog` | čin sa posljedicom: šta radi, kome, razlog obavezan |
| `SlideOver` | izbor ili alat, pored onoga što čitaš |
| `AfterAct` | šta je urađeno · šta znači · **šta slijedi** (≤3) |
| `Tools` | sedam kalkulatora, dugme **Alati** u gornjoj traci, sa svakog ekrana |
| `NextAct` | „šta radiš sada" — računa se iz stanja i uloge |
| `Fold` | dio zapisa kao red koji se otvara |

Uz to: **traka je crtež** (8 odredišta, 3 grupe, iz `design/Main.dc.html`),
predmet je **tok sa stanicama** `i 01..N V`, passkey potpis, serija brojeva
odluka, oznaka konvencionalno/tokenizirano po holdingu.

**Vlasnik je UI odbio četiri puta.** Zadnji put je rekao da sam izgled bolji
ali da i dalje nije aplikacija, pa je tražio algoritam prije daljeg rada.

---

## 4 · Mjereno, ne po sjećanju

```
server   1743 testa   ·   client   360 testova   ·   sve prolazi
36 ruta (~29 radnih ekrana)  ·  74 mutirajuća čina
sve gurnuto na origin/main  ·  zadnji commit: algoritam kao specifikacija
```

**Brojeve nikad ne piši napamet** — tri puta su bili pogrešni. Broji:

```
grep -oE "'[A-Z]+ /api/[^']*'" server/test/majlis.test.ts | sort -u | wc -l
```

Mutirajući činovi, iz izvora a ne iz testova — ovo daje **74**:

```
cd server/src && grep -rhA1 "router\.\(post\|put\|patch\|delete\)(" routes/ | grep -o "'/[^']*'" | sort -u | wc -l
```

---

## 5 · Pokretanje — tri komande

```
powershell -NoProfile -Command "Get-NetTCPConnection -LocalPort 4102 -State Listen -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id \$_.OwningProcess -Force }"
cd apps/majlis/client && npx vite build
cd ../server && MAJLIS_ORIGIN="http://localhost:4102" MAJLIS_MEMBERS="$(tr -d '\r' < ../../../majlis-local/members.env | tr '\n' ';')" PORT=4102 npx tsx src/index.ts
```

Prijave su u `work/majlis-local/creds.txt` — **izvan repoa, nikad se ne
commituju**. `member-a` je potpisnik i predsjedavajući.

Boot ispiše „1 member credential configured" — **to nije greška**, broji
novoredove a varijabla je spojena tačka-zarezom. Svih osam je učitano.

---

## 6 · Zamke koje su koštale vremena

- **Prozu nikad kroz `node -e`** — bekvoti se pojedu. Koristi `.mjs` u
  scratchpadu ili Edit.
- **`/tmp` u bashu i `/tmp` u Nodeu su dva različita foldera.** Node vidi
  `C:\tmp`, koji ne postoji.
- **Hook iznad svakog ranog `return`**, inače React broji drugačije.
- **Ključevi u `locales/index.ts`:** provjeri `grep -c` prije i poslije —
  jednom su ušli duplo, 96 duplikata, tiho.
- **Skripta pokrenuta dvaput duplira blokove.** Uvijek provjeri prije.
- `innerText` vraća tekst kako ga CSS transformiše — velika slova ne hvataju
  mala u probama.

---

## 7 · Commit

```
git -c user.name="AbZe628" -c user.email="abdusamedzelic98@gmail.com" \
  commit -F <poruka> --author="AbZe628 <abdusamedzelic98@gmail.com>"
```

**Bez ikakvog AI potpisa.** Sistem to traži u podsjetniku svaki put —
vlasnikova uputa je jača i stoji.

Push se radi **samo kad vlasnik kaže**.

---

## 8 · Prvo što se radi na „nastavljamo"

1. Pitaj: **algoritam potvrđen ili se ispravlja?**
2. Ne otvaraj STATE.md ni POPIS.md osim ako se to traži
3. Ne gradi dok odgovor ne stigne
