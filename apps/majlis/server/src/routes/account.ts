/**
 * A member's own account, over HTTP.
 *
 * Four routes and one idea: the person signing in is a person, not a row in a
 * configuration file. Everything here is about *them* — what they know, and
 * what somebody with authority may do when they have forgotten it.
 *
 * ── who may do what ───────────────────────────────────────────────────────
 *
 * Changing a password needs the current one, and nothing else. Not a role, not
 * an office: it is your own password and knowing it is the whole of the proof.
 *
 * Issuing a reset needs the **secretary or the chair**. That is who does it on
 * a real board — a committee of nine has no IT desk — and it puts a name in
 * the record against every occasion somebody was let back in.
 *
 * Redeeming a code needs no credential at all, because a member who has
 * forgotten their password cannot present one. That is the one unauthenticated
 * route in this application, and it is why the code is short-lived, stored
 * only as a hash, compared in constant time, and replaced rather than added to
 * when a second is issued.
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  changePassword,
  issueReset,
  redeemReset,
  stillOnTheSeed,
  PASSWORD_MIN,
  Refused,
  type Credential,
} from '../services/account.js';
import type { Members } from '../auth/members.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf } from './http.js';
import { changeYourOwnDetails } from '../services/yourself.js';
import { issue, revoke } from '../services/feed-token.js';

/*
 * No minimums here. The service refuses an empty name and a malformed address
 * with a sentence a member can act on; zod would answer "invalid_request"
 * first and the useful message would never be seen.
 */
const detailsSchema = z.object({
  name: z.string().max(400).optional(),
  title: z.string().max(400).optional(),
  email: z.string().max(400).nullish(),
  telephone: z.string().max(120).nullish(),
});

const changeSchema = z.object({
  current: z.string().min(1).max(400),
  next: z.string().min(PASSWORD_MIN).max(400),
});

const issueSchema = z.object({ scholarId: z.string().min(1).max(64) });

const redeemSchema = z.object({
  scholarId: z.string().min(1).max(64),
  code: z.string().min(4).max(40),
  next: z.string().min(PASSWORD_MIN).max(400),
});

/** A refusal from the service becomes a 409 with its own reason named. */
function refusal(res: import('express').Response, e: unknown): boolean {
  if (e instanceof Refused) {
    res.status(409).json({ error: e.reason, message: e.message });
    return true;
  }
  return false;
}

export function accountRoutes(
  store: Store,
  /**
   * The members this process authenticates against.
   *
   * Handed in so a password written to the store takes effect on the very next
   * request rather than at the next restart. Null where no member credentials
   * are configured at all, which is a development installation: there is then
   * nothing to change and the routes say so.
   */
  members: Members | null,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  /*
   * Which institution a credential written here belongs to.
   *
   * The identity's own, where the entry named one; otherwise the institution
   * this store serves, which app.ts reads the same way to scope the door. It
   * is never taken from the request body: what the caller asks for is a
   * scholarId, and the institution is decided here from what was already
   * verified at the door.
   */
  const serving =
    'institutionId' in store ? (store as { institutionId?: string }).institutionId : undefined;
  const institutionOf = (identityInstitution?: string) => identityInstitution ?? serving;

  /**
   * The credential this member holds, creating it from the seed on first use.
   *
   * A board that has never changed a password has nothing in the store, and
   * that is the normal state rather than an error — so the first change writes
   * the row rather than failing to find it.
   */
  async function credentialFor(
    scholarId: string,
    institutionId?: string,
  ): Promise<Credential | null> {
    const held = await store.credential(scholarId);
    if (held) return held;

    /*
     * Nothing stored yet, so the row is made from the seed on first use — with
     * the institution the door already checked written onto it. Without that
     * field a credential can only be scoped through board membership, and the
     * institution role sits on no board, so the desk this whole way in was
     * built for could never change its own password.
     */
    const seeded = members?.seedSecret(scholarId);
    return seeded ? { scholarId, secret: seeded, setAt: null, ...(institutionId ? { institutionId } : {}) } : null;
  }

  /** Who you are, and whether you are still on the password somebody typed in. */
  router.get(
    '/me',
    handle(async (req, res) => {
      const who = identityOf(req);
      const credential = await credentialFor(who.scholarId, institutionOf(who.institutionId));

      res.json({
        scholarId: who.scholarId,
        role: who.role,
        office: who.office ?? null,
        /*
         * Said plainly, to the member. A board still running on the passwords
         * somebody typed into a deployment configuration is a fact worth
         * seeing, and the member is the only person who can fix it.
         */
        stillOnTheSeed: credential ? stillOnTheSeed(credential) : null,
        passwordMinimum: PASSWORD_MIN,
        /*
         * Whether anybody can be let back in at all. Where no member
         * credentials are configured there is nothing to reset, and a control
         * that cannot be honoured is absent rather than disabled.
         */
        resetsPossible: members !== null,
        /*
         * Whether this member has an address for the calendar, and since
         * when. Never the token: it was shown once when it was made and
         * nothing here can produce it again. What a screen needs is only
         * whether one stands, so it can offer to withdraw it.
         */
        calendarFeed: await (async () => {
          if (!who.scholarId) return null;
          const boards = await store.boards();
          const member = boards
            .flatMap((b) => b.members)
            .find((m) => m.id === who.scholarId);
          return member?.calendarFeed ? { issuedAt: member.calendarFeed.issuedAt } : null;
        })(),
      });
    }),
  );

  /**
   * An address that puts this board's dates in your own calendar.
   *
   * ── what this hands over ──────────────────────────────────────────────
   *
   * No calendar client can answer a password prompt: it fetches an address
   * every few hours and takes what comes back. So a live subscription is
   * reached by an address carrying its own secret, and that secret is a
   * bearer credential — whoever holds the address reads this board's dates,
   * the titles and the times, without signing in.
   *
   * It is bounded three ways. It opens **one route** and no other. It is
   * kept as a fingerprint, so a copy of the record does not hand anybody a
   * working address. And it is replaced, not added to, so revoking works
   * and one member never has two live addresses they have forgotten about.
   *
   * The token is returned **once**, here, and nothing can produce it again.
   * A member who loses it issues another, which is also how a member who
   * thinks theirs has been seen fixes it.
   */
  router.post(
    '/me/calendar-feed',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!who.scholarId) {
        res.status(403).json({
          error: 'no_identity',
          message: 'This credential is not a member of a board, so there is no calendar to follow.',
        });
        return;
      }

      const boards = await store.boards();
      const board = boards.find((b) => b.members.some((m) => m.id === who.scholarId));
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No board here holds an entry for you.' });
        return;
      }

      let token = '';
      await store.updateBoard(board.id, (current) => {
        const made = issue(current, who.scholarId as string, now());
        token = made.token;
        return made.board;
      });

      const member = (await store.board(board.id))?.members.find((m) => m.id === who.scholarId);
      res.status(201).json({ token, issuedAt: member?.calendarFeed?.issuedAt ?? now() });
    }),
  );

  /** Withdraw it. The address stops answering the moment this returns. */
  router.delete(
    '/me/calendar-feed',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!who.scholarId) {
        res.status(403).json({ error: 'no_identity', message: 'No entry to change.' });
        return;
      }

      const boards = await store.boards();
      const board = boards.find((b) => b.members.some((m) => m.id === who.scholarId));
      if (!board) {
        res.status(404).json({ error: 'not_found', message: 'No board here holds an entry for you.' });
        return;
      }

      await store.updateBoard(board.id, (current) => revoke(current, who.scholarId as string));
      res.status(204).end();
    }),
  );

  /**
   * Your own name, title and where you can be reached.
   *
   * Only your own entry, and only these four fields: whether a member may bind
   * the institution is the board's constitution rather than a preference. The
   * identity is the credential's, never the body's.
   *
   * A ruling already issued does not move. A position keeps the name and title
   * it was recorded under, which is what makes offering this safe at all.
   */
  router.post(
    '/me/details',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (!who.scholarId) {
        res.status(403).json({
          error: 'no_identity',
          message: 'This credential is not a member of a board, so there is no entry to change.',
        });
        return;
      }

      const parsed = detailsSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const boards = await store.boards();
      const board = boards.find((b) => b.members.some((m) => m.id === who.scholarId));
      if (!board) {
        res.status(404).json({
          error: 'not_found',
          message: 'No board here holds an entry for you.',
        });
        return;
      }

      const updated = await store.updateBoard(board.id, (current) =>
        changeYourOwnDetails(current, who.scholarId as string, parsed.data),
      );
      res.json(updated.members.find((m) => m.id === who.scholarId));
    }),
  );

  /** Change your own. The current password is the whole of the proof. */
  router.post(
    '/me/password',
    handle(async (req, res) => {
      const who = identityOf(req);
      const parsed = changeSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const held = await credentialFor(who.scholarId, institutionOf(who.institutionId));
      if (!held) {
        res.status(409).json({
          error: 'no_such_credential',
          message: 'This installation holds no credential for you to change.',
        });
        return;
      }

      try {
        const next = changePassword(held, parsed.data.current, parsed.data.next, now());
        await store.putCredential(next);
        // Effective on the next request, not the next restart.
        members?.setSecret(next.scholarId, next.secret);
        res.status(200).json({ scholarId: next.scholarId, setAt: next.setAt });
      } catch (e) {
        if (!refusal(res, e)) throw e;
      }
    }),
  );

  /**
   * Issue a code for somebody who has forgotten theirs.
   *
   * The code comes back **once**, to the person who issued it, to be read to
   * the member. Nothing anywhere reads it back out afterwards.
   */
  router.post(
    '/members/reset',
    handle(async (req, res) => {
      const who = identityOf(req);
      if (who.office !== 'secretary' && who.office !== 'chair') {
        res.status(403).json({
          error: 'not_permitted',
          message:
            'Only the secretary or the chair may let somebody back in. That is who does it on a board, and it puts a name in the record against every occasion.',
        });
        return;
      }

      const parsed = issueSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      // The issuer's institution, never one the request named.
      const held = await credentialFor(parsed.data.scholarId, institutionOf(who.institutionId));

      /*
       * A member nobody holds a credential for is answered exactly as one who
       * does — same work, same shape, no code. Anything else is a way to read
       * a board's membership off the door.
       */
      if (!held) {
        issueReset({ scholarId: parsed.data.scholarId, secret: '', setAt: null }, who.scholarId, now());
        res.status(200).json({ issued: false, message: 'If that member holds a credential here, a code has been issued.' });
        return;
      }

      const { credential, code } = issueReset(held, who.scholarId, now());
      await store.putCredential(credential);

      res.status(200).json({
        issued: true,
        code,
        expiresAt: credential.reset?.expiresAt,
        message:
          'Read this to them. It is shown once and cannot be read back out of the record.',
      });
    }),
  );

  /**
   * Set a new password with a code.
   *
   * The one route in this application that takes no credential, because a
   * member who has forgotten their password has none to give.
   */
  router.post(
    '/members/password/reset',
    handle(async (req, res) => {
      const parsed = redeemSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const held = await store.credential(parsed.data.scholarId);
      if (!held) {
        // Same answer as a wrong code, so this cannot enumerate members.
        res.status(409).json({
          error: 'reset_does_not_match',
          message: 'That code is not the one that was issued.',
        });
        return;
      }

      try {
        const next = redeemReset(held, parsed.data.code, parsed.data.next, now());
        await store.putCredential(next);
        members?.setSecret(next.scholarId, next.secret);
        res.status(200).json({ scholarId: next.scholarId, setAt: next.setAt });
      } catch (e) {
        if (!refusal(res, e)) throw e;
      }
    }),
  );

  return router;
}
