/**
 * Who is at the keyboard.
 *
 * Stage One had one shared credential, which was enough while nothing could be
 * written: everyone who could read the record could read all of it, and nobody
 * could change it. Stage Two writes, and a vote has to be attributable to the
 * member who cast it. A shared password cannot do that — it says someone from
 * the board is here, not which one.
 *
 * **A password identifies; it does not sign.** Stage Three is where the vote
 * becomes the signature, and what is signed there is a hash of the operative
 * parameters under a key the scholar controls. Nothing in this file is a
 * substitute for that, and a record produced in Stage Two should be read as
 * "the system believes this member cast this vote", not as proof that they did.
 * The distinction is the difference between an audit trail and an attestation,
 * and pretending otherwise would undo the reason Majlis exists.
 *
 * Credentials live in the environment, one line per member:
 *
 *   MAJLIS_MEMBERS="member-a:signatory:scrypt$salt$hash
 *                   member-b:advisory:scrypt$salt$hash"
 *
 * Generate a line with `npm run member -w server -- member-a signatory`. The
 * password is typed at a prompt, never passed as an argument, because an
 * argument lands in the shell history and in the process list.
 */

import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * What a person may do, which is not the same as what they are on the board.
 * `Scholar.signatory` says who holds signing authority; this says who is
 * making the request. A board member reading over someone's shoulder is an
 * observer, and the record should not pretend otherwise.
 */
export type Role = 'signatory' | 'advisory' | 'liaison' | 'observer';

export const ROLES: readonly Role[] = ['signatory', 'advisory', 'liaison', 'observer'];

/**
 * An office is held *by* a member. It is not a level above them.
 *
 * Conflating the two is the usual mistake: a chair becomes a super-user who can
 * approve things alone, which no governance framework gives them. Resolutions
 * carry by the board's threshold, and the chair's authority is procedural —
 * convening, the agenda, and being the person named when something is stuck.
 *
 * **The casting vote deliberately has no implementation here.** Frameworks that
 * give a chair one are describing a majority-of-attending-members model, where
 * a tie is possible. This board decides by reaching a fixed threshold of
 * signatures, and a threshold is either met or it is not — there is no tie for
 * a casting vote to break. Building the mechanism anyway would put a power in
 * the record that can never legitimately fire.
 *
 * The secretary matters more in practice. Four of the nine steps of a
 * non-compliance belong to the institution rather than to the board, and
 * somebody has to record them.
 */
export type Office = 'chair' | 'secretary';

export const OFFICES: readonly Office[] = ['chair', 'secretary'];

export interface Member {
  /**
   * What the member types. `institution/member` where the entry names one,
   * otherwise just the member id.
   */
  loginId: string;
  /**
   * How the record refers to them. Always the short form: attribution reads
   * "member-a" rather than "alpha-bank/member-a", because the institution is
   * already known from the record the attribution sits in.
   */
  scholarId: string;
  role: Role;
  /** Held, not ranked. Absent for most members, which is the normal case. */
  office?: Office;
  /** From an `institution/member` id. Absent in the shorter form. */
  institutionId?: string;
  /** scrypt$saltHex$hashHex */
  secret: string;
}

export interface Identity {
  scholarId: string;
  role: Role;
  /** Absent for most members. Never widens what they may decide. */
  office?: Office;
  /**
   * Which institution this member belongs to.
   *
   * A credential that cannot say whose it is cannot be checked against the
   * record it is reaching for. Absent on entries written in the older
   * `memberId:role:secret` form, which belong to whichever institution the
   * service serves.
   */
  institutionId?: string;
}

const SCRYPT_KEYLEN = 64;
const SALT_BYTES = 16;

export function hashPassword(password: string): string {
  const salt = randomBytes(SALT_BYTES);
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN);
  return `scrypt$${salt.toString('hex')}$${derived.toString('hex')}`;
}

/**
 * Constant time in the part that matters. A wrong member id and a wrong
 * password should be indistinguishable from outside, so the caller always
 * performs a derivation even when the record is missing.
 */
export function verifyPassword(password: string, secret: string): boolean {
  const parts = secret.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;

  const salt = Buffer.from(parts[1], 'hex');
  const expected = Buffer.from(parts[2], 'hex');
  if (salt.length === 0 || expected.length !== SCRYPT_KEYLEN) return false;

  const actual = scryptSync(password, salt, SCRYPT_KEYLEN);
  return timingSafeEqual(actual, expected);
}

/** A secret to compare against when no member matches, so timing does not tell. */
const DECOY = hashPassword(randomBytes(32).toString('hex'));

export class Members {
  private readonly byId: Map<string, Member>;

  constructor(members: Member[]) {
    this.byId = new Map(members.map((m) => [m.loginId, m]));
  }

  get size(): number {
    return this.byId.size;
  }

  ids(): string[] {
    return [...this.byId.keys()];
  }

  /**
   * Who holds a credential, by the name the record attributes to.
   *
   * Ids and roles only. No secret and no login id leaves this method: the
   * scholar ids are already in the record as attribution, so listing them
   * discloses nothing, while a login id names a person's way in.
   *
   * It exists so the two lists a board depends on can be compared. The board
   * record says who signs; the credential file says who may act. Nothing has
   * ever checked that they agree, and they disagree quietly — a member with no
   * credential simply never appears, and a credential with no member votes
   * under a name the board does not carry.
   */
  roster(): { scholarId: string; role: Role; office?: Office }[] {
    return [...this.byId.values()].map((m) => ({
      scholarId: m.scholarId,
      role: m.role,
      office: m.office,
    }));
  }

  /**
   * Returns the identity, or null. Always does the same work either way: an
   * unknown member id is checked against a decoy so that "no such member" and
   * "wrong password" take the same time and are the same answer.
   */
  authenticate(scholarId: string, password: string): Identity | null {
    const member = this.byId.get(scholarId);
    const ok = verifyPassword(password, member?.secret ?? DECOY);
    if (!member || !ok) return null;
    return {
      scholarId: member.scholarId,
      role: member.role,
      office: member.office,
      institutionId: member.institutionId,
    };
  }
}

export class MemberConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemberConfigError';
  }
}

/**
 * Parse MAJLIS_MEMBERS. Refuses anything it does not fully understand rather
 * than skipping the line: a member silently dropped because of a typo is a
 * member who cannot vote, discovered at the worst possible moment.
 */
export function parseMembers(raw: string): Members {
  const members: Member[] = [];
  const seen = new Set<string>();

  const lines = raw
    .split(/[\n;]/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  const offices = new Map<string, string>();

  for (const line of lines) {
    const first = line.indexOf(':');
    const second = line.indexOf(':', first + 1);
    if (first <= 0 || second <= first + 1) {
      throw new MemberConfigError(
        `Cannot read this member entry: "${line.slice(0, 40)}". ` +
          'Expected memberId:role:secret.'
      );
    }

    const rawId = line.slice(0, first);
    const rawRole = line.slice(first + 1, second);
    const secret = line.slice(second + 1);

    /*
     * `role+office` names both. The plus is not part of any role, so every
     * entry written before this parses to exactly the same member.
     */
    const plus = rawRole.indexOf('+');
    const role = (plus > 0 ? rawRole.slice(0, plus) : rawRole) as Role;
    const office = plus > 0 ? (rawRole.slice(plus + 1) as Office) : undefined;

    /*
     * `institution/member` names both; a bare `member` belongs to whichever
     * institution the service serves. The slash is not part of any existing id,
     * so every entry written before this still parses to the same member.
     */
    const slash = rawId.indexOf('/');
    const institutionId = slash > 0 ? rawId.slice(0, slash) : undefined;
    const scholarId = slash > 0 ? rawId.slice(slash + 1) : rawId;

    if (slash > 0 && !scholarId) {
      throw new MemberConfigError(
        `"${rawId}" names an institution and no member. Expected institution/member:role:secret.`,
      );
    }

    if (!ROLES.includes(role)) {
      throw new MemberConfigError(
        `"${role}" is not a role. Expected one of: ${ROLES.join(', ')}.`
      );
    }
    if (office !== undefined && !OFFICES.includes(office)) {
      throw new MemberConfigError(
        `"${office}" is not an office. Expected one of: ${OFFICES.join(', ')}.`
      );
    }
    /*
     * A chair who cannot vote could not carry the board on any question, and a
     * board would discover that at the worst possible moment.
     */
    if (office === 'chair' && role !== 'signatory') {
      throw new MemberConfigError(
        `${scholarId} is named chair but is ${role}. A chair must be a signatory.`
      );
    }
    if (!secret.startsWith('scrypt$')) {
      throw new MemberConfigError(
        `The secret for ${scholarId} is not a hash. Never put a password here — ` +
          'generate a hash with `npm run member -w server -- ' + scholarId + ' ' + role + '`.'
      );
    }
    if (seen.has(rawId)) {
      throw new MemberConfigError(`${rawId} appears twice. Which entry wins is not a guess worth making.`);
    }

    /*
     * Two chairs is not a configuration, it is a question nobody has settled.
     * Scoped per institution, because two institutions in one deployment each
     * have their own.
     */
    if (office) {
      const scope = institutionId ?? '';
      const key = scope + ' ' + office;
      const held = offices.get(key);
      if (held) {
        throw new MemberConfigError(
          `Both ${held} and ${scholarId} are named ${office}` +
            (institutionId ? ` for ${institutionId}` : '') +
            '. Only one member may hold an office.'
        );
      }
      offices.set(key, scholarId);
    }

    seen.add(rawId);
    members.push({ loginId: rawId, scholarId, role, office, secret, institutionId });
  }

  return new Members(members);
}

export function membersFromEnv(): Members | null {
  const raw = process.env.MAJLIS_MEMBERS?.trim();
  return raw ? parseMembers(raw) : null;
}

// ── what each role may do ─────────────────────────────────────────────────

/** Deliberating is open to everyone on the board. Observers watch. */
export function mayDeliberate(role: Role): boolean {
  return role === 'signatory' || role === 'advisory' || role === 'liaison';
}

/** Voting and objecting are the same authority and belong to signatories. */
export function mayVote(role: Role): boolean {
  return role === 'signatory';
}

/** Only a technical liaison may mark an answer as one of mechanism. */
export function mayAnswerAsLiaison(role: Role): boolean {
  return role === 'liaison';
}

/** Opening a matter is not a vote; anyone who deliberates may raise one. */
export function mayOpenMatter(role: Role): boolean {
  return mayDeliberate(role);
}

/**
 * Who may record a step that belongs to the institution rather than the board.
 *
 * Filing a rectification plan, recording that the Directors approved, that the
 * regulator was notified, that purification was paid — none of these are the
 * board's acts, and none of them may be recorded by the board deciding to. They
 * are the institution's, and the secretary is the institution's person here.
 *
 * A liaison may too. In a small board there is often no secretary, and the
 * liaison is already the member who carries facts in from outside.
 */
export function mayRecordInstitutionAct(role: Role, office?: Office): boolean {
  return office === 'secretary' || role === 'liaison';
}

/** Procedural, and deliberately narrow. See the note on `Office`. */
export function mayConvene(office?: Office): boolean {
  return office === 'chair';
}

/**
 * Who keeps the minute.
 *
 * The chair, who convened the meeting, or the secretary, whose office this
 * ordinarily is. Narrower than deliberating on purpose: a minute is the record
 * of what a board did, and a record several hands can rewrite is a record
 * nobody can rely on.
 *
 * A board with neither office configured cannot keep minutes here, and that is
 * the honest outcome rather than a hole — convening is already the chair's, so
 * such a board has no meeting to minute in the first place.
 */
export function mayKeepMinutes(_role: Role, office?: Office): boolean {
  return office === 'chair' || office === 'secretary';
}
