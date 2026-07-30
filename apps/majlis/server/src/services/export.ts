import { createHash } from 'node:crypto';
import type { Board, Matter, Rule } from '../types.js';
import { verifyParameters } from './hash.js';

/**
 * The artefact an external auditor or regulator asks for: what was permitted
 * on a given date, who approved it, on what reasoning, with what dissent, and
 * the proof that the deployed parameters match the approved ones.
 *
 * Produced by a single action, in a neutral format, readable without any
 * knowledge of this application.
 */

export interface AuditExport {
  generatedAt: string;
  asOf: string;
  board: {
    id: string;
    name: string;
    quorumPermit: number;
    quorumRestrict: number;
    totalSignatories: number;
  };
  rulesInForce: ExportedRule[];
  decisions: ExportedDecision[];
  integrity: {
    algorithm: 'sha256';
    documentHash: string;
    note: string;
  };
}

export interface ExportedRule {
  id: string;
  title: string;
  statement: string;
  version: number;
  inForceFrom: string | null;
  parameters: { key: string; value: string; meaning: string }[];
  parameterHash: string;
  parameterHashVerified: boolean;
}

export interface ExportedDecision {
  matterId: string;
  title: string;
  direction: 'permit' | 'restrict';
  status: string;
  openedAt: string;
  inForceAt: string | null;
  votes: {
    scholar: string;
    position: string;
    reason: string;
    at: string;
  }[];
  dissentRecorded: boolean;
  objectionsDuringTimelock: number;
}

function inForceAt(rule: Rule, asOf: Date): boolean {
  if (!rule.inForceFrom) return false;
  if (new Date(rule.inForceFrom) > asOf) return false;
  return rule.supersededBy === null;
}

export function buildAuditExport(params: {
  board: Board;
  rules: Rule[];
  matters: Matter[];
  asOf?: Date;
}): AuditExport {
  const asOf = params.asOf ?? new Date();
  const nameOf = (id: string) =>
    params.board.members.find((m) => m.id === id)?.name ?? id;

  const rulesInForce: ExportedRule[] = params.rules
    .filter((r) => r.boardId === params.board.id && inForceAt(r, asOf))
    .map((r) => ({
      id: r.id,
      title: r.title,
      statement: r.statement,
      version: r.version,
      inForceFrom: r.inForceFrom,
      parameters: r.parameters.map((p) => ({
        key: p.key,
        value: p.value,
        meaning: p.meaning,
      })),
      parameterHash: r.parameterHash,
      parameterHashVerified: verifyParameters(r.parameters, r.parameterHash),
    }));

  const decisions: ExportedDecision[] = params.matters
    .filter((m) => m.boardId === params.board.id)
    .map((m) => ({
      matterId: m.id,
      title: m.title,
      direction: m.direction,
      status: m.status,
      openedAt: m.openedAt,
      inForceAt: m.inForceAt,
      votes: m.reasoning.map((r) => ({
        scholar: nameOf(r.scholarId),
        position: r.position,
        reason: r.reason,
        at: r.at,
      })),
      dissentRecorded: m.reasoning.some((r) => r.position === 'against'),
      objectionsDuringTimelock: m.objections.length,
    }));

  const payload = {
    generatedAt: new Date().toISOString(),
    asOf: asOf.toISOString(),
    board: {
      id: params.board.id,
      name: params.board.name,
      quorumPermit: params.board.quorumPermit,
      quorumRestrict: params.board.quorumRestrict,
      totalSignatories: params.board.totalSignatories,
    },
    rulesInForce,
    decisions,
  };

  const documentHash =
    '0x' +
    createHash('sha256')
      .update(JSON.stringify(payload), 'utf8')
      .digest('hex');

  return {
    ...payload,
    integrity: {
      algorithm: 'sha256',
      documentHash,
      note:
        'The document hash covers everything above it. Each rule additionally carries the hash of its own ' +
        'operative parameters; parameterHashVerified indicates whether the parameters printed here reproduce ' +
        'that hash. A value of false means the record has been altered and the export should not be relied on.',
    },
  };
}
