/**
 * The devices a member signs with, over HTTP.
 *
 * Four routes: ask for a request to enrol, hand back what the device answered,
 * list what is enrolled, and forget one. The signing challenge lives with the
 * signing route in `governance.ts`, because it is issued against a document.
 *
 * ── the origin is the installation's, never the request's ─────────────────
 *
 * Every check in `auth/passkeys.ts` is made against one origin and one host
 * name, and both come from `MAJLIS_ORIGIN` — not from the Host header a caller
 * sends. A verifier that trusts the request to say where it is running will
 * accept a signature made for any site at all.
 *
 * Unset, it falls back to `http://localhost:<port>`, which is what the
 * demonstration runs on. A real installation that forgets to set it does not
 * quietly accept anything: every signature fails with the two origins printed
 * side by side, which is the loudest a mistake like this can usefully be.
 *
 * ── a browser that cannot do this ─────────────────────────────────────────
 *
 * WebAuthn needs a secure context: HTTPS, or localhost. Served over plain HTTP
 * from an address on a bank's network, the API is simply not there. The screen
 * asks the browser before it offers anything, and where the answer is no it
 * says so in place rather than showing a button that throws — the same rule as
 * everywhere else here.
 */

import { Router } from 'express';
import { z } from 'zod';
import {
  Challenges,
  PasskeyRefused,
  enrol,
  type EnrolledDevice,
  type Expected,
} from '../auth/passkeys.js';
import type { Store } from '../store/index.js';
import { handle, badRequest, identityOf } from './http.js';

const MAX_DEVICES = 8;

const startSchema = z.object({ label: z.string().max(120).optional() });

const finishSchema = z.object({
  label: z.string().min(1).max(120),
  clientDataJSON: z.string().min(1).max(20_000),
  attestationObject: z.string().min(1).max(20_000),
});

/** Where this installation is served from, as the verifier must be told it. */
export function expectedFrom(port: number): Expected {
  const origin = (process.env.MAJLIS_ORIGIN ?? `http://localhost:${port}`).replace(/\/+$/, '');
  return { origin, rpId: new URL(origin).hostname };
}

/** What a device may be told about another member's device: nothing. */
function asShown(device: EnrolledDevice) {
  return {
    id: device.id,
    label: device.label,
    enrolledAt: device.enrolledAt,
    ...(device.lastUsedAt ? { lastUsedAt: device.lastUsedAt } : {}),
  };
}

export function deviceRoutes(
  store: Store,
  challenges: Challenges,
  expected: Expected,
  now: () => string = () => new Date().toISOString(),
): Router {
  const router = Router();

  function refused(res: Parameters<typeof badRequest>[0], e: unknown): boolean {
    if (!(e instanceof PasskeyRefused)) return false;
    res.status(409).json({ error: e.code, message: e.message });
    return true;
  }

  /** The devices you have enrolled. Yours only — never another member's. */
  router.get(
    '/devices',
    handle(async (req, res) => {
      const who = identityOf(req);
      const mine = await store.devices(who.scholarId);
      res.json({
        devices: mine.map(asShown),
        /*
         * The exact strings the browser has to be given, so the page does not
         * build them from `window.location` and disagree with the verifier.
         */
        rpId: expected.rpId,
        origin: expected.origin,
      });
    }),
  );

  /**
   * Ask for a request to enrol.
   *
   * The challenge is issued to whoever is signed in, for themselves. A member
   * cannot enrol a device onto somebody else's name — there is no parameter
   * for it, which is stronger than a check.
   */
  router.post(
    '/devices/request',
    handle(async (req, res) => {
      const who = identityOf(req);
      const parsed = startSchema.safeParse(req.body ?? {});
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const boards = await store.boards();
      const board = boards.find((b) => b.members.some((m) => m.id === who.scholarId));
      if (!board) {
        res.status(403).json({
          error: 'not_a_member',
          message:
            'A device is enrolled against a seat on a board, and this credential does not hold one.',
        });
        return;
      }

      const mine = await store.devices(who.scholarId);
      if (mine.length >= MAX_DEVICES) {
        res.status(409).json({
          error: 'enough_devices',
          message:
            `There are already ${MAX_DEVICES} devices on this name. Forget one you no longer have ` +
            'before enrolling another.',
        });
        return;
      }

      const issued = challenges.issue('enrol', who.scholarId, now());
      const member = board.members.find((m) => m.id === who.scholarId);

      res.json({
        challenge: issued.challenge,
        rpId: expected.rpId,
        boardName: board.name,
        user: {
          id: who.scholarId,
          name: member?.name ?? who.scholarId,
          displayName: member?.name ?? who.scholarId,
        },
        /** The devices already enrolled, so the browser does not offer a second copy of one. */
        already: mine.map((d) => d.id),
      });
    }),
  );

  /** What the device answered. */
  router.post(
    '/devices',
    handle(async (req, res) => {
      const who = identityOf(req);
      const parsed = finishSchema.safeParse(req.body);
      if (!parsed.success) return badRequest(res, parsed.error.issues);

      const boards = await store.boards();
      const board = boards.find((b) => b.members.some((m) => m.id === who.scholarId));
      if (!board) {
        res.status(403).json({ error: 'not_a_member', message: 'This credential holds no seat.' });
        return;
      }

      const at = now();
      try {
        const client = JSON.parse(
          Buffer.from(parsed.data.clientDataJSON, 'base64url').toString('utf8'),
        ) as { challenge?: string };

        const issued = challenges.spend(
          typeof client.challenge === 'string' ? client.challenge : '',
          'enrol',
          who.scholarId,
          at,
        );

        const device = enrol(parsed.data, issued, expected, {
          scholarId: who.scholarId,
          boardId: board.id,
          label: parsed.data.label.trim(),
        }, at);

        /*
         * A device already enrolled — to anybody — is not enrolled twice. To
         * this member it would be a duplicate row for one key; to another it
         * would be one key answering for two names, which is worse.
         */
        const held = await store.device(device.id);
        if (held && held.scholarId !== who.scholarId) {
          res.status(409).json({
            error: 'device_belongs_to_another',
            message: 'That device is already enrolled to another member of this board.',
          });
          return;
        }

        res.status(201).json(asShown(await store.putDevice(device)));
      } catch (e) {
        if (e instanceof SyntaxError) {
          res.status(400).json({ error: 'bad_client_data', message: 'The browser sent no readable answer.' });
          return;
        }
        if (!refused(res, e)) throw e;
      }
    }),
  );

  /**
   * Forget one.
   *
   * Yours only. Signatures already made with it stand: they name the device
   * they were made with, and a ruling signed last year does not change because
   * a laptop was replaced this morning.
   */
  router.delete(
    '/devices/:id',
    handle(async (req, res) => {
      const who = identityOf(req);
      const held = await store.device(req.params.id);

      if (!held || held.scholarId !== who.scholarId) {
        res.status(404).json({
          error: 'not_found',
          message: 'No device of yours by that name.',
        });
        return;
      }

      await store.forgetDevice(req.params.id);
      // A body rather than 204: everything else here answers with JSON, and
      // one route that does not is one the client has to special-case.
      res.json({ id: req.params.id, forgotten: true });
    }),
  );

  return router;
}
