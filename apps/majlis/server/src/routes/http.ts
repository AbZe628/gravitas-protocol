/**
 * The handful of things every route in this application does the same way.
 *
 * Extracted so that a second route module cannot drift from the first. The
 * important one is `sendRefusal`: a refusal is not an error in the server, it
 * is the system doing its job, and the status has to say which kind of "no"
 * the caller received. A 500 for "you are not a signatory" would tell an
 * interface to apologise for a fault that did not happen.
 */

import type { Request, Response } from 'express';
import type { Identity } from '../auth/members.js';
import { Refused } from '../services/lifecycle.js';
import { BadFigure } from '../services/money.js';
import { NotFound } from '../store/index.js';

const STATUS: Record<string, number> = {
  no_reason_given: 400,
  not_a_signatory: 403,
  not_on_this_board: 403,
  bad_figure: 400,
  no_steps: 400,
  nothing_prescribed: 400,
  // A calculation that cannot be found later is not a record, and a figure
  // with no source is one somebody typed. Both are the caller's to fix.
  no_period: 400,
  no_source: 400,
  no_such_prior: 400,
  // A meeting convened around nothing, or minuted with nothing, is the
  // caller's to fix rather than a conflict with the record.
  no_agenda: 400,
  no_minute: 400,
  no_such_matter: 400,
  // Adopting names a decision. A missing or unfinished one is the caller's to fix.
  not_in_library: 400,
  no_matter: 400,
  no_conditions: 400,
  // Everything else is a conflict with the state the record is actually in.
};

export function sendRefusal(res: Response, error: Refused): void {
  res.status(STATUS[error.code] ?? 409).json({ error: error.code, message: error.message });
}

/** Wrap a handler so refusals, missing records and faults each read correctly. */
export function handle(fn: (req: Request, res: Response) => Promise<void>) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      await fn(req, res);
    } catch (error) {
      if (error instanceof Refused) return sendRefusal(res, error);
      // A figure that is not a figure is the caller's, not a fault here. It
      // reached this layer from any calculation route, so it is answered once
      // rather than caught separately at each of them.
      if (error instanceof BadFigure) {
        res.status(400).json({ error: error.code, field: error.field, message: error.message });
        return;
      }
      if (error instanceof NotFound) {
        res.status(404).json({ error: 'not_found', message: error.message });
        return;
      }
      console.error('route error:', error);
      res.status(500).json({ error: 'internal', message: 'The change was not made.' });
    }
  };
}

/**
 * Who is making this request.
 *
 * Taken from the credential and never from the body. A request does not get to
 * say whose act it is recording; if it could, one member's password would let
 * them act as the whole board and the record would be worth nothing.
 */
export function identityOf(req: Request): Identity {
  return req.identity ?? { scholarId: 'anonymous', role: 'observer' };
}

/**
 * What each role is, said to the person holding it.
 *
 * The message this replaces recited all four rules at once, which was true as
 * a summary and left the reader to find their own case in a list. It read
 * worst where the applicable rule was last: an advisory member refused from
 * recording a calculation was told first that voting belongs to signatories,
 * which is both correct and not the reason.
 *
 * So the refusal now says what this credential **is**. The act it was refused
 * is already in the first sentence; the second says why that credential could
 * not do it, and what would.
 */
const ROLE_MEANS: Record<string, string> = {
  observer:
    'This session is signed in with a shared or unrecognised credential, which reads and does ' +
    'not write. Taking part needs a member’s own credential, because an act nobody can be named ' +
    'for is not a record of anything.',
  advisory:
    'An advisory member deliberates, records findings and notes calculations. Voting, objecting ' +
    'and determining belong to signatories.',
  liaison:
    'A liaison deliberates, answers on mechanism, and records the steps that belong to the ' +
    'institution. Voting, objecting and determining belong to signatories.',
  signatory:
    'A signatory votes, objects and determines. The steps that belong to the institution — the ' +
    'plan, the Directors, the regulator, the payment — are recorded by its secretary or liaison, ' +
    'and the board must not be able to record them by deciding to.',
};

export function requireRole(
  res: Response,
  allowed: boolean,
  what: string,
  /** Optional so an older caller still gets a usable refusal rather than none. */
  role?: string,
): boolean {
  if (allowed) return true;
  res.status(403).json({
    error: 'role_not_permitted',
    message:
      `This credential may not ${what}. ` +
      (ROLE_MEANS[role ?? ''] ??
        'Voting, objecting and determining belong to signatories; deliberating is open to the ' +
          'board; the steps that belong to the institution are recorded by its secretary or ' +
          'liaison; a shared credential only reads.'),
  });
  return false;
}

export function badRequest(res: Response, issues: unknown): void {
  res.status(400).json({ error: 'invalid_request', detail: issues });
}
