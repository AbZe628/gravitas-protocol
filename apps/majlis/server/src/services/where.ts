/**
 * Where this installation is, as far as it has been told.
 *
 * ── why this is not read off the request ──────────────────────────────────
 *
 * A message leaves the application and is read somewhere else, so anything it
 * says about where to go back to has to be true from outside. The Host header
 * is whatever the caller chose to send, which is fine for routing a request
 * and worthless for writing a link into an email: a caller can set it to
 * anything, and a notice that quoted it would carry whatever address the last
 * person to make a request happened to claim.
 *
 * `MAJLIS_ORIGIN` is what the operator set, and it is the same setting the
 * device registration already refuses to guess at.
 *
 * ── and absent is a real answer ───────────────────────────────────────────
 *
 * Most installations will not have set it, and a link to `http://localhost` in
 * somebody's inbox is worse than no link at all, because it looks like one
 * that ought to work. Null, and the notice says so in words.
 */
export function whereWeAre(env: NodeJS.ProcessEnv = process.env): string | null {
  const set = env.MAJLIS_ORIGIN?.trim();
  if (!set) return null;
  return set.replace(/\/+$/, '');
}
