import { describe, it, expect } from 'vitest';
import {
  changePassword,
  checkPassword,
  issueReset,
  redeemReset,
  stillOnTheSeed,
  PASSWORD_MIN,
  RESET_VALID_MINUTES,
  Refused,
  type Credential,
} from '../src/services/account.js';
import { hashPassword, verifyPassword } from '../src/auth/members.js';

/**
 * A member's own account.
 *
 * The lines these hold:
 *
 *   - a code is never readable back out of the record, only comparable;
 *   - a second code replaces the first, so asking twice does not leave two
 *     ways in;
 *   - a code expires, and the refusal says so rather than saying it is wrong;
 *   - changing a password you can prove you know clears any outstanding code.
 */

const NOW = '2026-09-20T12:00:00.000Z';
const OLD = 'the old passphrase here';
const NEW = 'a different passphrase';

/*
 * Derived once. scrypt is deliberately slow, and a helper that hashed on
 * every call turned a forty-iteration loop into five seconds — the cost is the
 * point of the algorithm, so the test stops paying it forty times rather than
 * asking for a longer timeout.
 */
const OLD_SECRET = hashPassword(OLD);

function credential(over: Partial<Credential> = {}): Credential {
  return { scholarId: 'member-a', secret: OLD_SECRET, setAt: null, ...over };
}

const later = (minutes: number) =>
  new Date(Date.parse(NOW) + minutes * 60_000).toISOString();

describe('what a password has to be', () => {
  it('has a floor and no composition rules', () => {
    expect(() => checkPassword('x'.repeat(PASSWORD_MIN))).not.toThrow();
    // No capital, no digit, no symbol, and that is deliberate: composition
    // rules push people toward Password1! and toward writing it down.
    expect(() => checkPassword('correct horse battery')).not.toThrow();
  });

  it('refuses one too short, and says how short in words', () => {
    try {
      checkPassword('short');
      throw new Error('expected a refusal');
    } catch (e) {
      expect(e).toBeInstanceOf(Refused);
      expect((e as Refused).reason).toBe('too_short');
      expect((e as Refused).message).toContain(String(PASSWORD_MIN));
    }
  });
});

describe('changing your own', () => {
  it('needs the current one', () => {
    expect(() => changePassword(credential(), 'not the password', NEW, NOW)).toThrow(
      /not the current password/i,
    );
  });

  it('sets it, and records that the member set it themselves', () => {
    const next = changePassword(credential(), OLD, NEW, NOW);
    expect(verifyPassword(NEW, next.secret)).toBe(true);
    expect(verifyPassword(OLD, next.secret)).toBe(false);
    expect(next.setAt).toBe(NOW);
    expect(stillOnTheSeed(next)).toBe(false);
  });

  it('refuses the one already held', () => {
    try {
      changePassword(credential(), OLD, OLD, NOW);
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('same_as_before');
    }
  });

  it('drops an outstanding code, because proving you know it is enough', () => {
    const { credential: withCode } = issueReset(credential(), 'secretary', NOW);
    const next = changePassword(withCode, OLD, NEW, NOW);
    expect(next.reset).toBeNull();
  });
});

describe('a reset code', () => {
  it('is never stored as itself', () => {
    const { credential: c, code } = issueReset(credential(), 'secretary', NOW);
    expect(JSON.stringify(c)).not.toContain(code);
    expect(c.reset?.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('avoids the characters people mishear reading it aloud', () => {
    for (let i = 0; i < 40; i++) {
      const { code } = issueReset(credential(), 'secretary', NOW);
      // A secretary reads this down a telephone. No O/0, I/1 or S/5.
      expect(code).not.toMatch(/[O0I1S5]/);
      expect(code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    }
  });

  it('names who issued it, so the record says who let somebody back in', () => {
    const { credential: c } = issueReset(credential(), 'the-chair', NOW);
    expect(c.reset?.issuedBy).toBe('the-chair');
  });

  it('replaces the one before it, so asking twice leaves one way in', () => {
    const first = issueReset(credential(), 'secretary', NOW);
    const second = issueReset(first.credential, 'secretary', NOW);

    expect(() => redeemReset(second.credential, first.code, NEW, NOW)).toThrow(
      /not the one that was issued/i,
    );
    expect(verifyPassword(NEW, redeemReset(second.credential, second.code, NEW, NOW).secret)).toBe(
      true,
    );
  });

  it('sets a new password without the old one being known', () => {
    const { credential: c, code } = issueReset(credential(), 'secretary', NOW);
    const next = redeemReset(c, code, NEW, NOW);
    expect(verifyPassword(NEW, next.secret)).toBe(true);
    expect(next.setAt).toBe(NOW);
    expect(next.reset).toBeNull();
  });

  it('is read case-insensitively and with the spaces trimmed off', () => {
    const { credential: c, code } = issueReset(credential(), 'secretary', NOW);
    // Somebody typing what was read to them adds a space and drops the shift.
    const next = redeemReset(c, '  ' + code.toLowerCase() + ' ', NEW, NOW);
    expect(verifyPassword(NEW, next.secret)).toBe(true);
  });

  it('expires, and says that rather than saying it is wrong', () => {
    const { credential: c, code } = issueReset(credential(), 'secretary', NOW);
    try {
      redeemReset(c, code, NEW, later(RESET_VALID_MINUTES + 1));
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('reset_expired');
      expect((e as Refused).message).toContain(String(RESET_VALID_MINUTES));
    }
  });

  it('still works one minute inside the window', () => {
    const { credential: c, code } = issueReset(credential(), 'secretary', NOW);
    expect(() => redeemReset(c, code, NEW, later(RESET_VALID_MINUTES - 1))).not.toThrow();
  });

  it('cannot be redeemed when none was issued', () => {
    try {
      redeemReset(credential(), 'AAAAA-BBBBB', NEW, NOW);
      throw new Error('expected a refusal');
    } catch (e) {
      expect((e as Refused).reason).toBe('no_reset_outstanding');
      expect((e as Refused).message).toMatch(/secretary or the chair/i);
    }
  });

  it('will not set a password that is too short, code or no code', () => {
    const { credential: c, code } = issueReset(credential(), 'secretary', NOW);
    expect(() => redeemReset(c, code, 'short', NOW)).toThrow(/at least/i);
  });
});

describe('a board still on the passwords somebody typed into a config', () => {
  it('is a fact the record can state', () => {
    expect(stillOnTheSeed(credential())).toBe(true);
    expect(stillOnTheSeed(credential({ setAt: NOW }))).toBe(false);
  });
});
