import { Suspense } from 'react';
import { Navigate, Route, createRoutesFromChildren, useParams, useRoutes, type RouteObject } from 'react-router-dom';
import {
  Ask,
  AssetDetail,
  Assistant,
  BindsMe,
  BoardBook,
  BriefingDetail,
  Briefings,
  Calculations,
  Calendar,
  CheckAContract,
  Dashboard,
  Examinations,
  Figure,
  Guided,
  IOwe,
  IncidentDetail,
  Incidents,
  Library,
  MatterFlow,
  MayDeal,
  Meetings,
  QuestionDetail,
  Questions,
  Queue,
  Record,
  Register,
  RuleDetail,
  Rules,
  Search,
  Settings,
  StructureDetail,
  UndertakingDetail,
  Undertakings,
  WhatStands,
} from './screens.js';
import Shell from './components/Shell.js';
import NoSuchAddress from './components/NoSuchAddress.js';
import { Loading } from './components/ui.js';
import { usePreloading } from './lib/preload.js';
import { useIdentity, isInstitution } from './lib/identity.js';

/**
 * What the arrival screen is depends on whose credential it is.
 *
 * A board member arrives at the question every scholar arrives with — is there
 * anything here for me. The institution arrives at a different one entirely:
 * where do I put my question, and what happened to the last one. Showing the
 * bank the board's screen with most of it inert would have it hunting for what
 * it is not allowed to touch, and reasonably concluding the product was not
 * built for it.
 *
 * Nothing waits on a blank screen. Until the identity answers this renders the
 * board's arrival, which is the common case, for the half second before a
 * desk's is put in its place.
 *
 * That half second sends the board's queue request from the desk's browser.
 * It was called harmless and was not: the queue answered a desk with the
 * board's whole backlog and other desks' questions. It is harmless now for a
 * reason that does not depend on this screen — the server answers a desk with
 * its own questions only (see `/queue` in routes/governance.ts).
 *
 * ── the board's arrival is now the queue ──────────────────────────────────
 *
 * It was `Guided`, which had no heading at all, opened with the same phase
 * bar as every other screen, and showed the four stages again as cards — the
 * third time they appeared on that one page. Whether anything was actually
 * waiting lived on five other screens and a member had to know which five.
 *
 * `Guided` is not deleted. It answers at `/guided`, because a screen somebody
 * has bookmarked should not stop existing, and because if the queue turns out
 * to be the wrong idea the old arrival is one line away.
 */
/** An old address for a matter, answered by the one screen a matter has. */
function ToTheMatter() {
  const { id = '' } = useParams();
  return <Navigate to={`/matters/${id}`} replace />;
}

function Arrival() {
  const { identity } = useIdentity();
  return isInstitution(identity?.role) ? <Ask boardId="demo-board" /> : <Queue />;
}

/**
 * Every address, as a table rather than as markup.
 *
 * The same `<Route>`s as ever, read once into objects so the preloader can ask
 * which screen is behind a link without anybody writing the table twice — a
 * second copy is a copy that drifts.
 */
const ROUTES: RouteObject[] = createRoutesFromChildren(
  <>
    {/*
      Guided answers the only question a scholar arrives with — is there
      anything here for me — and stops. Classic is the same Dashboard,
      unchanged, one link away: nothing was removed, and what changed is
      what a person sees first.
    */}
    <Route path="/" element={<Arrival />} />
    {/*
      The drawer is gone. It held twelve links under four headings
      nobody had chosen, it was four screens tall, and every one of its
      destinations now sits under the phase it belongs to. The address
      still answers, because a bookmark should not break — it lands on
      arrival, where the four doors are.
    */}
    <Route path="/more" element={<Navigate to="/" replace />} />
    {/* The arrival the queue replaced, kept at its own address. */}
    <Route path="/guided" element={<Guided />} />

    {/*
      The way in. Two screens for one path, and which one a person gets
      is decided by whose credential it is: the board works a queue,
      the institution puts a question and reads what became of its own.
      Neither is a cut-down version of the other.
    */}
    <Route path="/questions" element={<Questions boardId="demo-board" />} />
    <Route path="/questions/:id" element={<QuestionDetail />} />
    <Route path="/examinations" element={<Examinations boardId="demo-board" />} />
    <Route path="/ask" element={<Ask boardId="demo-board" />} />

    {/*
      One matter, one screen.

      There were three: this window, a dossier at /dossier/matters/:id and
      the classic page at /classic/matters/:id — and a control written into
      one of them was on one of them. What only the other two had is in the
      window now, in its file (see TheFile.tsx), and the two addresses lead
      here, so a bookmark or a link in an old paper still arrives.
    */}
    <Route path="/matters/:id" element={<MatterFlow />} />
    <Route path="/dossier/matters/:id" element={<ToTheMatter />} />
    <Route path="/classic/matters/:id" element={<ToTheMatter />} />
    <Route path="/classic" element={<Dashboard />} />
    <Route path="/register" element={<Register />} />
    <Route path="/register/:id" element={<AssetDetail />} />
    <Route path="/rules" element={<WhatStands />} />
    <Route path="/classic/rules" element={<Rules />} />
    <Route path="/rules/:id" element={<RuleDetail />} />
    <Route path="/library" element={<Library />} />
    <Route path="/library/:id" element={<StructureDetail />} />
    {/*
      Reading a draft against the conditions, with no matter opened.
      It lived inside a matter only, so a scholar had to decide to
      deliberate before they could look at the contract that would
      tell them whether there was anything to deliberate.
    */}
    <Route path="/check" element={<CheckAContract />} />
    {/*
      The bank's own two screens. The same record read the other way
      round: what binds me, and what I still owe. A bank signed in and
      was given the board's twenty-one destinations and none of its
      own — and `/disclosure`, which holds everything a bank most needs
      to know about itself, had been answering since the incident work
      was written with nothing in the application calling it.
    */}
    <Route path="/may-deal" element={<MayDeal />} />
    <Route path="/binds-me" element={<BindsMe />} />
    <Route path="/i-owe" element={<IOwe boardId="demo-board" />} />
    <Route path="/calculations" element={<Calculations />} />
    {/*
      One recorded calculation, at an address of its own. The route
      answering it has existed since the computations work was written
      and nothing called it, so a figure the board recorded had nowhere
      to point at — and the notice telling the bank about one carried
      the amount with no working and no link.
    */}
    <Route path="/figures/:id" element={<Figure />} />
    <Route path="/calendar" element={<Calendar />} />
    <Route path="/meetings" element={<Meetings />} />
    {/*
      The papers for one sitting. What a director on any corporate board
      is handed before a meeting, and the last thing every board portal
      has that this application did not.
    */}
    <Route path="/meetings/:id/book" element={<BoardBook />} />
    {/*
      What was undertaken. Built with its routes and reachable from no
      screen at all until now.
    */}
    <Route path="/undertakings" element={<Undertakings />} />
    <Route path="/undertakings/:id" element={<UndertakingDetail />} />
    <Route path="/incidents" element={<Incidents />} />
    <Route path="/incidents/:id" element={<IncidentDetail />} />
    <Route path="/briefings" element={<Briefings />} />
    <Route path="/briefings/:id" element={<BriefingDetail />} />
    <Route path="/assistant" element={<Assistant />} />
    <Route path="/search" element={<Search />} />
    {/*
      What we decided and what stands, in one place. Two pages that were
      always two answers to one question, neither of them changed — the
      classic paths still reach each on its own.
    */}
    <Route path="/record" element={<WhatStands />} />
    <Route path="/classic/record" element={<Record />} />
    <Route path="/settings" element={<Settings />} />

    {/*
      Anything else, and it must stay last.

      The table had no final line, so a mistyped address, a stale
      bookmark or a link from a mail sent last quarter drew the whole
      frame around an empty middle — rail, masthead, tab bar, status
      bar, and between them nothing. Measured: zero characters inside
      `main`, at every width.

      See NoSuchAddress.tsx for why this is a different answer from
      NotYourScreen: an address that is nobody's is not a screen that
      is somebody else's.
    */}
    <Route path="*" element={<NoSuchAddress />} />
  </>,
);

export default function App() {
  const screen = useRoutes(ROUTES);
  usePreloading(ROUTES);
  return (
    <Shell>
      {/*
        A screen that is still on its way draws its shape, in the frame, where
        it will be — never an empty page. See `Loading` and `screens.ts`.
      */}
      <Suspense fallback={<Loading />}>{screen}</Suspense>

      {/*
        On every screen, because the question "what does this mean" arrives
        wherever somebody happens to be standing — and an application that keeps
        its explanations on a page of their own has explanations nobody reads.
      */}
      {/* The guide lives in the masthead now — see Guide.tsx on why it stopped floating. */}
    </Shell>
  );
}
