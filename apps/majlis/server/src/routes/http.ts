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

export function requireRole(res: Response, allowed: boolean, what: string): boolean {
  if (allowed) return true;
  res.status(403).json({
    error: 'role_not_permitted',
    message:
      `This credential may not ${what}. Voting, objecting and determining belong to ` +
      'signatories; deliberating is open to the board; the steps that belong to the ' +
      'institution are recorded by its secretary or liaison; a shared credential only reads.',
  });
  return false;
}

export function badRequest(res: Response, issues: unknown): void {
  res.status(400).json({ error: 'invalid_request', detail: issues });
}
