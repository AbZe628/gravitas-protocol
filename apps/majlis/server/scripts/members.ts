/**
 * Generate a complete MAJLIS_MEMBERS value for a board, in one go.
 *
 *   npm run members -w server
 *
 * Generating one line at a time with `npm run member` is right when a single
 * person joins and wrong when a board is being set up: seven prompts, seven
 * chances to mistype, and a value assembled by hand from seven outputs.
 *
 * Each member gets a strong random password. They are printed once, here, on
 * this machine — nothing is sent anywhere and nothing is written to disk. Copy
 * them out before closing the terminal, hand each member theirs, and put the
 * MAJLIS_MEMBERS block into the server's environment.
 *
 * The hash is what the server stores. The password cannot be recovered from it,
 * which is the point: losing one means issuing a new one, not looking it up.
 */

import { randomBytes } from 'node:crypto';
import { hashPassword, ROLES, type Role } from '../src/auth/members.js';

interface Seat {
  id: string;
  role: Role;
  what: string;
}

/** The demonstration board in src/data/seed.ts. */
const BOARD: Seat[] = [
  { id: 'member-a', role: 'signatory', what: 'Votes and objects' },
  { id: 'member-b', role: 'signatory', what: 'Votes and objects' },
  { id: 'member-c', role: 'signatory', what: 'Votes and objects' },
  { id: 'member-d', role: 'signatory', what: 'Votes and objects' },
  { id: 'member-e', role: 'signatory', what: 'Votes and objects' },
  { id: 'advisor-1', role: 'advisory', what: 'Deliberates, does not vote' },
  { id: 'liaison-1', role: 'liaison', what: 'Answers questions of mechanism' },
];

/**
 * Readable rather than maximal. A credential a person has to type from a piece
 * of paper is a credential that gets written down badly if it is unreadable, so
 * this avoids the characters that are mistaken for one another.
 */
const ALPHABET = 'abcdefghijkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789';

function password(length = 20): string {
  const bytes = randomBytes(length * 2);
  let out = '';
  for (let i = 0; out.length < length && i < bytes.length; i++) {
    const index = bytes[i] % 256;
    if (index < 256 - (256 % ALPHABET.length)) out += ALPHABET[index % ALPHABET.length];
  }
  return out;
}

const seats = process.argv.slice(2).length
  ? process.argv.slice(2).map((arg) => {
      const [id, role] = arg.split(':');
      if (!id || !ROLES.includes(role as Role)) {
        console.error(`"${arg}" should be memberId:role, role one of ${ROLES.join(', ')}.`);
        process.exit(1);
      }
      return { id, role: role as Role, what: '' } satisfies Seat;
    })
  : BOARD;

const issued = seats.map((seat) => ({ ...seat, secret: password() }));

console.log('\nHand these out. They are shown once and stored nowhere.\n');
const width = Math.max(...issued.map((i) => i.id.length));
for (const i of issued) {
  console.log(`  ${i.id.padEnd(width)}  ${i.secret}   ${i.role}${i.what ? ' — ' + i.what : ''}`);
}

console.log('\n\nSet this as MAJLIS_MEMBERS on the server:\n');
console.log(issued.map((i) => `${i.id}:${i.role}:${hashPassword(i.secret)}`).join('\n'));
console.log('\nThe server reads it as one value; newlines inside it are fine.');
console.log('Until it is set, the shared credential authenticates as an observer, which reads');
console.log('and does nothing else.\n');
console.log('');
console.log('An entry may also name its institution: institution/member:role:secret.');
console.log('A service serving one institution refuses a credential naming another.');
