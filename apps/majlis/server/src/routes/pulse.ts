import { Router, type Request, type Response } from 'express';
import type { Pulse } from '../services/pulse.js';

/**
 * The open line that tells a screen the record has moved.
 *
 * ── one long answer, not a question every few seconds ─────────────────────
 *
 * Server-sent events rather than polling. Polling would mean every member's
 * screen asking *has anything happened* four times a minute for a working day,
 * almost always to be told no — and still arriving at the news up to fifteen
 * seconds late. One connection held open costs nothing while nothing happens
 * and delivers the moment something does, which is what
 * *„dođe pitanje → odmah iskoči obavijest"* actually asks for.
 *
 * Plain `EventSource`, not a socket: the traffic runs one way, the browser
 * reconnects on its own when a line drops, and there is no protocol to keep in
 * step at both ends.
 *
 * ── what crosses the line ─────────────────────────────────────────────────
 *
 * A number. Nothing else. Not what changed, not who did it, not which matter —
 * for the reason `pulse.ts` gives: anything more would be a second copy of the
 * record travelling beside the record. The screen hears that the count moved,
 * asks for its own attention list again, and works out what is new by
 * comparing it with the one it already had. The truth stays in one place.
 *
 * It also means this line carries nothing confidential. A member on another
 * board learns only that *something* happened somewhere, which they can see
 * from the fact that the application is in use.
 *
 * ── the heartbeat is not decoration ───────────────────────────────────────
 *
 * A proxy that sees no bytes for a minute closes the connection, and the
 * browser reconnects — quietly, repeatedly, all day. A comment line every
 * twenty seconds keeps the line alive and costs two bytes.
 */
export function pulseRoutes(pulse: Pulse): Router {
  const router = Router();

  router.get('/pulse', (req: Request, res: Response) => {
    res.set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      /* Nginx buffers event streams into uselessness unless told not to. */
      'X-Accel-Buffering': 'no',
    });
    res.flushHeaders?.();

    const send = (revision: number) => {
      res.write(`data: ${JSON.stringify({ revision })}\n\n`);
    };

    /*
     * The current count first, so a screen that has just connected knows
     * whether it missed anything while it was away — it compares this with
     * what it was holding and re-reads if they differ.
     */
    send(pulse.revision());

    const stop = pulse.listen(send);
    const beat = setInterval(() => res.write(': beat\n\n'), 20_000);

    req.on('close', () => {
      clearInterval(beat);
      stop();
      res.end();
    });
  });

  return router;
}
