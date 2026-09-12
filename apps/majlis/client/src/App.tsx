import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.js';
import Guided from './pages/Guided.js';
import Queue from './pages/Queue.js';
import MatterPack from './pages/MatterPack.js';
import BoardBook from './pages/BoardBook.js';
import Undertakings from './pages/Undertakings.js';
import Questions from './pages/Questions.js';
import Examinations from './pages/Examinations.js';
import Ask from './pages/Ask.js';
import WhatStands from './pages/WhatStands.js';
import MatterDetail from './pages/MatterDetail.js';
import Rules from './pages/Rules.js';
import AssetDetail from './pages/AssetDetail.js';
import Calculations from './pages/Calculations.js';
import Figure from './pages/Figure.js';
import Library from './pages/Library.js';
import CheckAContract from './pages/CheckAContract.js';
import BindsMe from './pages/BindsMe.js';
import IOwe from './pages/IOwe.js';
import Calendar from './pages/Calendar.js';
import Meetings from './pages/Meetings.js';
import Register from './pages/Register.js';
import Settings from './pages/Settings.js';
import Incidents from './pages/Incidents.js';
import IncidentDetail from './pages/IncidentDetail.js';
import Briefings from './pages/Briefings.js';
import Assistant from './pages/Assistant.js';
import Record from './pages/Record.js';
import Search from './pages/Search.js';
import Shell from './components/Shell.js';
import Guide from './components/Guide.js';
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
 * board's arrival, which is the common case and is harmless to a desk for the
 * half second before it is replaced.
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
function Arrival() {
  const { identity } = useIdentity();
  return isInstitution(identity?.role) ? <Ask boardId="demo-board" /> : <Queue />;
}

export default function App() {
  return (
    <Shell>
        <Routes>
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
          <Route path="/examinations" element={<Examinations boardId="demo-board" />} />
          <Route path="/ask" element={<Ask boardId="demo-board" />} />

          {/*
            One matter, one act. `MatterDetail` puts twelve sections on a page
            and a scholar scrolls past all of them to reach the thing they came
            to do. Every section still exists, unchanged, at the classic path —
            what changed is that they no longer compete with the act.
          */}
          <Route path="/matters/:id" element={<MatterPack />} />
          <Route path="/classic/matters/:id" element={<MatterDetail />} />
          <Route path="/classic" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/:id" element={<AssetDetail />} />
          <Route path="/rules" element={<WhatStands />} />
          <Route path="/classic/rules" element={<Rules />} />
          <Route path="/library" element={<Library />} />
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
          <Route path="/incidents" element={<Incidents />} />
          <Route path="/incidents/:id" element={<IncidentDetail />} />
          <Route path="/briefings" element={<Briefings />} />
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
        </Routes>

      {/*
        On every screen, because the question "what does this mean" arrives
        wherever somebody happens to be standing — and an application that keeps
        its explanations on a page of their own has explanations nobody reads.
      */}
      <Guide />
    </Shell>
  );
}
