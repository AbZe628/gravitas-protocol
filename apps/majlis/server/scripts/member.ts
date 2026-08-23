/**
 * Generate one MAJLIS_MEMBERS line.
 *
 *   npm run member -w server -- member-a signatory
 *
 * The password is read from a prompt with echo off, never taken as an argument:
 * an argument lands in the shell history and is visible in the process list to
 * anyone else on the machine.
 */
import { createInterface } from 'node:readline';
import { hashPassword, ROLES, type Role } from '../src/auth/members.js';

const [scholarId, role] = process.argv.slice(2);

if (!scholarId || !role) {
  console.error('Usage: npm run member -w server -- <memberId> <' + ROLES.join('|') + '>');
  process.exit(1);
}
if (!ROLES.includes(role as Role)) {
  console.error(`"${role}" is not a role. Expected one of: ${ROLES.join(', ')}.`);
  process.exit(1);
}

const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
process.stdout.write(`Password for ${scholarId}: `);

// Echo off for the duration of the prompt.
const stdin = process.stdin as NodeJS.ReadStream & { isTTY?: boolean };
const wasRaw = stdin.isTTY ? stdin.isRaw : false;
if (stdin.isTTY) stdin.setRawMode?.(true);

let password = '';
stdin.on('data', (chunk: Buffer) => {
  for (const byte of chunk) {
    if (byte === 0x0d || byte === 0x0a) {
      if (stdin.isTTY) stdin.setRawMode?.(wasRaw ?? false);
      process.stdout.write('\n');
      rl.close();
      if (password.length < 12) {
        console.error('Too short. A board credential should be at least 12 characters.');
        process.exit(1);
      }
      console.log('\nAdd this line to MAJLIS_MEMBERS:\n');
      console.log(`${scholarId}:${role}:${hashPassword(password)}\n`);
      process.exit(0);
    } else if (byte === 0x03) {
      if (stdin.isTTY) stdin.setRawMode?.(wasRaw ?? false);
      process.exit(130);
    } else if (byte === 0x7f) {
      password = password.slice(0, -1);
    } else {
      password += String.fromCharCode(byte);
    }
  }
});
