/**
 * Who is on this board, and how it decides.
 *
 * A read-only account of the configuration, and one check nothing has ever
 * made: **the board record and the credential file are two lists that have to
 * agree, and nothing compares them.**
 *
 * The board record says who signs — `Scholar.signatory` — and the credential
 * file says who may act. They are maintained separately, by different people,
 * at different times. When they disagree they disagree quietly:
 *
 *   A member on the board with no credential never appears. They are counted in
 *   the quorum, so the threshold is computed against somebody who cannot reach
 *   the application, and the board waits for a vote that cannot arrive.
 *
 *   A credential naming somebody not on the board acts under a name the record
 *   does not carry. Their reasoning is attributed to an id that resolves to
 *   nothing, and an auditor reading the fatwa later finds a signature belonging
 *   to no member.
 *
 *   A credential that may vote for somebody the board records as advisory is
 *   the sharper version of the same fault, and the arithmetic hides it: `tally`
 *   counts only members the board marks as signatories, so the vote is silently
 *   discarded. The member believes they voted. The record says they did. The
 *   threshold does not move.
 *
 * None of these is repaired here. Repairing configuration from inside the
 * application would mean the application deciding who sits on a board, which is
 * the one thing it must never do. It reports, precisely, and names the file.
 */

import type { Members, Office, Role } from '../auth/members.js';
import type { Board } from '../types.js';

export interface SeatedMember {
  scholarId: string;
  name: string;
  title: string;
  /** What the board record says: whether they hold signing authority. */
  signatory: boolean;
  /** What the credential file says. Absent where they hold no credential. */
  role: Role | null;
  office: Office | null;
}

export type MismatchKind =
  /** On the board, no credential. Counted in the quorum, cannot reach the application. */
  | 'no_credential'
  /** Holds a credential, not on the board. Acts under a name the record does not carry. */
  | 'not_on_board'
  /** May vote by credential, advisory on the board. The tally discards it silently. */
  | 'vote_discarded'
  /** Signs on the board, cannot vote by credential. The threshold waits on them anyway. */
  | 'cannot_vote';

export interface Mismatch {
  kind: MismatchKind;
  scholarId: string;
  /** What goes wrong, in terms of what it costs. */
  consequence: string;
}

export interface HowItDecides {
  quorumPermit: number;
  quorumRestrict: number;
  totalSignatories: number;
  /** Signatories the board record actually lists, which may differ from the field above. */
  signatoriesSeated: number;
  ratificationWindowHours: number;
  timelockHours: number;
}

export interface Settings {
  boardId: string;
  boardName: string;
  institutionId: string;

  members: SeatedMember[];
  decides: HowItDecides;

  /**
   * Whether any credential is configured at all.
   *
   * Not the same question as whether the lists disagree, and conflating them
   * put a warning on every member's row while the page above said nothing was
   * wrong. An installation with no credentials is not a misconfigured board —
   * it is a development installation where everyone reads and nobody acts, and
   * that is one calm sentence rather than seven alarms.
   */
  credentialsConfigured: boolean;

  /**
   * Where the two lists disagree.
   *
   * Empty is the goal. Anything here is a configuration fault that the record
   * cannot show and nobody would otherwise find until a vote failed to count.
   */
  mismatches: Mismatch[];
  /** Where to fix them. The application does not. */
  fixIn: string;
}

const FIX_IN = 'MAJLIS_MEMBERS on the server, one line per member. See apps/majlis/.env.example.';

export function buildSettings(params: {
  board: Board;
  members: Members | null;
  timelockHours: number;
}): Settings {
  const { board, members } = params;

  const byScholar = new Map((members?.roster() ?? []).map((r) => [r.scholarId, r]));

  const seated: SeatedMember[] = board.members.map((m) => {
    const credential = byScholar.get(m.id);
    return {
      scholarId: m.id,
      name: m.name,
      title: m.title,
      signatory: m.signatory,
      role: credential?.role ?? null,
      office: credential?.office ?? null,
    };
  });

  const mismatches: Mismatch[] = [];

  // Only meaningful once credentials exist at all. With none configured every
  // member would be reported as missing one, which is not a fault — it is a
  // development installation, and saying so would be noise.
  if (members && members.size > 0) {
    const onBoard = new Set(board.members.map((m) => m.id));

    for (const m of board.members) {
      const credential = byScholar.get(m.id);

      if (!credential) {
        mismatches.push({
          kind: 'no_credential',
          scholarId: m.id,
          consequence: m.signatory
            ? `${m.name} is counted toward the quorum and holds no credential, so the threshold ` +
              'is computed against somebody who cannot reach the application. The board will wait ' +
              'for a vote that cannot arrive.'
            : `${m.name} is on the board and holds no credential, so they cannot deliberate here.`,
        });
        continue;
      }

      if (m.signatory && credential.role !== 'signatory') {
        mismatches.push({
          kind: 'cannot_vote',
          scholarId: m.id,
          consequence:
            `The board records ${m.name} as holding signing authority, but their credential is ` +
            `${credential.role}. They cannot vote, and the threshold still counts them.`,
        });
      }

      if (!m.signatory && credential.role === 'signatory') {
        mismatches.push({
          kind: 'vote_discarded',
          scholarId: m.id,
          consequence:
            `${m.name} may vote by credential but the board records them as advisory. The tally ` +
            'counts only members the board marks as signatories, so their vote is recorded and ' +
            'then silently discarded. They will believe they voted.',
        });
      }
    }

    for (const r of byScholar.values()) {
      if (onBoard.has(r.scholarId)) continue;
      if (r.role === 'observer') continue; // An observer need not sit on the board.
      mismatches.push({
        kind: 'not_on_board',
        scholarId: r.scholarId,
        consequence:
          `A credential exists for "${r.scholarId}", who does not sit on this board. Anything ` +
          'they write is attributed to a name the record does not carry, and an auditor reading ' +
          'it later finds a signature belonging to no member.',
      });
    }
  }

  return {
    boardId: board.id,
    boardName: board.name,
    institutionId: board.institutionId,
    credentialsConfigured: Boolean(members && members.size > 0),
    members: seated,
    decides: {
      quorumPermit: board.quorumPermit,
      quorumRestrict: board.quorumRestrict,
      totalSignatories: board.totalSignatories,
      signatoriesSeated: board.members.filter((m) => m.signatory).length,
      ratificationWindowHours: board.ratificationWindowHours,
      timelockHours: params.timelockHours,
    },
    mismatches,
    fixIn: FIX_IN,
  };
}
