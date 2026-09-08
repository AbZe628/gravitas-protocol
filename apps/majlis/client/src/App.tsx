import { Navigate, Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard.js';
import Guided from './pages/Guided.js';
import MatterPack from './pages/MatterPack.js';
import BoardBook from './pages/BoardBook.js';
import Questions from './pages/Questions.js';
import Examinations from './pages/Examinations.js';
import Ask from './pages/Ask.js';
import WhatStands from './pages/WhatStands.js';
import MatterDetail from './pages/MatterDetail.js';
import Rules from './pages/Rules.js';
import AssetDetail from './pages/AssetDetail.js';
import Calculations from './pages/Calculations.js';
import Library from './pages/Library.js';
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
 */
function Arrival() {
  const { identity } = useIdentity();
  return isInstitution(identity?.role) ? <Ask boardId="demo-board" /> : <Guided />;
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
          <Route path="/calculations" element={<Calculations />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/meetings" element={<Meetings />} />
          {/*
            The papers for one sitting. What a director on any corporate board
            is handed before a meeting, and the last thing every board portal
            has that this application did not.
          */}
          <Route path="/meetings/:id/book" element={<BoardBook />} />
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
