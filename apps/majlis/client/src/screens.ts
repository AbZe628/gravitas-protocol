import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

/**
 * Every screen, fetched when it is first needed rather than all at once.
 *
 * ── what this replaced ────────────────────────────────────────────────────
 *
 * `App.tsx` imported all thirty-four screens at the top, so the first download
 * was every screen in the application — 1,236 kB, 327 kB compressed, in one
 * piece — before the first one could be drawn. A scholar opening a link to one
 * question on a phone waited for the calculator, the register, the library and
 * the board book too. The build said so on every run and nothing listened.
 *
 * Now the frame and the first screen are what arrives first, and each other
 * screen is its own piece. `scripts/budget.mjs` fails the build when the first
 * download grows past its budget again, which is how this stays true.
 *
 * ── and why moving between screens does not wait for them ────────────────
 *
 * `preload` fetches a screen without drawing it. `lib/preload.ts` calls it for
 * the screen behind a link the moment a pointer rests on it or it takes focus,
 * and for every screen once the first one is up and the browser is idle — so
 * the wait moved to where nobody is waiting.
 */
export type Screen<P> = LazyExoticComponent<ComponentType<P>> & { preload: () => Promise<unknown> };

function screen<P>(load: () => Promise<{ default: ComponentType<P> }>): Screen<P> {
  /*
   * One fetch, shared by the preload and the draw. A failed one is forgotten,
   * so the next attempt fetches again rather than failing for ever on a
   * network that has since come back.
   */
  let pending: Promise<{ default: ComponentType<P> }> | null = null;
  const once = () =>
    (pending ??= load().catch((e: unknown) => {
      pending = null;
      throw e;
    }));
  return Object.assign(lazy(once), { preload: once });
}

export const Ask = screen(() => import('./pages/Ask.js'));
export const AssetDetail = screen(() => import('./pages/AssetDetail.js'));
export const Assistant = screen(() => import('./pages/Assistant.js'));
export const BindsMe = screen(() => import('./pages/BindsMe.js'));
export const BoardBook = screen(() => import('./pages/BoardBook.js'));
export const BriefingDetail = screen(() => import('./pages/BriefingDetail.js'));
export const Briefings = screen(() => import('./pages/Briefings.js'));
export const Calculations = screen(() => import('./pages/Calculations.js'));
export const Calendar = screen(() => import('./pages/Calendar.js'));
export const CheckAContract = screen(() => import('./pages/CheckAContract.js'));
export const Dashboard = screen(() => import('./pages/Dashboard.js'));
export const Examinations = screen(() => import('./pages/Examinations.js'));
export const Figure = screen(() => import('./pages/Figure.js'));
export const Guided = screen(() => import('./pages/Guided.js'));
export const IOwe = screen(() => import('./pages/IOwe.js'));
export const IncidentDetail = screen(() => import('./pages/IncidentDetail.js'));
export const Incidents = screen(() => import('./pages/Incidents.js'));
export const Library = screen(() => import('./pages/Library.js'));
export const MatterFlow = screen(() => import('./pages/MatterFlow.js'));
export const MayDeal = screen(() => import('./pages/MayDeal.js'));
export const Meetings = screen(() => import('./pages/Meetings.js'));
export const Questions = screen(() => import('./pages/Questions.js'));
export const QuestionDetail = screen(() => import('./pages/QuestionDetail.js'));
export const Queue = screen(() => import('./pages/Queue.js'));
export const Record = screen(() => import('./pages/Record.js'));
export const Register = screen(() => import('./pages/Register.js'));
export const RuleDetail = screen(() => import('./pages/RuleDetail.js'));
export const Rules = screen(() => import('./pages/Rules.js'));
export const Search = screen(() => import('./pages/Search.js'));
export const Settings = screen(() => import('./pages/Settings.js'));
export const StructureDetail = screen(() => import('./pages/StructureDetail.js'));
export const Undertakings = screen(() => import('./pages/Undertakings.js'));
export const UndertakingDetail = screen(() => import('./pages/UndertakingDetail.js'));
export const WhatStands = screen(() => import('./pages/WhatStands.js'));

/**
 * Every screen, in the order the idle fetch takes them: the ones a member
 * most often goes to next from the queue first.
 */
export const EVERY_SCREEN: readonly { preload: () => Promise<unknown> }[] = [
  Queue, MatterFlow, IncidentDetail, QuestionDetail, UndertakingDetail, Questions, RuleDetail, Undertakings, Meetings, Incidents,
  WhatStands, Register, AssetDetail, Library, StructureDetail, Calculations, Figure, Calendar,
  BoardBook, Examinations, Ask, CheckAContract, Search, Settings, Briefings, BriefingDetail,
  Assistant, Dashboard, Guided, Rules, Record, MayDeal, BindsMe, IOwe,
];
