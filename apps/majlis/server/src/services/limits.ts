/**
 * Rate limiting and a hard spend cap for the assistant endpoint.
 *
 * The assistant costs money per request and was, until this file existed,
 * unauthenticated and unlimited. That is fine on localhost and unacceptable on
 * the open internet: anyone could drain the budget in an afternoon, and the
 * first you would know of it is the invoice.
 *
 * Deliberately dependency-free and in-process. That is the right size for a
 * single instance, which is what Majlis runs as. It is also the wrong size for
 * more than one instance — two processes each enforce their own counters, so
 * the effective limit doubles. If Majlis is ever scaled horizontally, move the
 * counters to Redis before doing so, not after. Written here so the next
 * person does not have to infer it.
 */

export interface LimitConfig {
  /** Requests per IP per window. */
  perIpPerWindow: number;
  windowMs: number;
  /** Requests across all callers per day. The blast-radius limit. */
  globalPerDay: number;
  /**
   * Hard ceiling on estimated spend per day, in USD. When reached, the
   * endpoint refuses until the day rolls over. A cap that can be exceeded is
   * not a cap.
   */
  dailyUsdCap: number;
  /** Estimated cost of one question: classifier call + assistant call. */
  estimatedUsdPerQuestion: number;
}

export const DEFAULT_LIMITS: LimitConfig = {
  perIpPerWindow: num(process.env.RATE_LIMIT_PER_IP, 10),
  windowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 60_000),
  globalPerDay: num(process.env.RATE_LIMIT_GLOBAL_PER_DAY, 2_000),
  dailyUsdCap: num(process.env.ASSISTANT_DAILY_USD_CAP, 20),
  estimatedUsdPerQuestion: num(process.env.ASSISTANT_USD_PER_QUESTION, 0.02),
};

function num(v: string | undefined, fallback: number): number {
  const n = v === undefined ? NaN : Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

export type LimitDecision =
  | { allowed: true }
  | { allowed: false; reason: 'ip' | 'global' | 'budget'; retryAfterSeconds: number };

export class Limiter {
  private readonly cfg: LimitConfig;
  private ipHits = new Map<string, number[]>();
  private dayKey = '';
  private dayCount = 0;
  private daySpend = 0;

  constructor(cfg: LimitConfig = DEFAULT_LIMITS) {
    this.cfg = cfg;
  }

  private rollDay(now: number) {
    const key = new Date(now).toISOString().slice(0, 10);
    if (key !== this.dayKey) {
      this.dayKey = key;
      this.dayCount = 0;
      this.daySpend = 0;
    }
  }

  private secondsToMidnightUtc(now: number): number {
    const d = new Date(now);
    const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
    return Math.max(1, Math.ceil((next - now) / 1000));
  }

  /** Call before doing any paid work. Records the attempt when it allows one. */
  check(ip: string, now = Date.now()): LimitDecision {
    this.rollDay(now);

    if (this.daySpend + this.cfg.estimatedUsdPerQuestion > this.cfg.dailyUsdCap) {
      return { allowed: false, reason: 'budget', retryAfterSeconds: this.secondsToMidnightUtc(now) };
    }
    if (this.dayCount >= this.cfg.globalPerDay) {
      return { allowed: false, reason: 'global', retryAfterSeconds: this.secondsToMidnightUtc(now) };
    }

    const cutoff = now - this.cfg.windowMs;
    const hits = (this.ipHits.get(ip) ?? []).filter((t) => t > cutoff);
    if (hits.length >= this.cfg.perIpPerWindow) {
      const retry = Math.ceil((hits[0] + this.cfg.windowMs - now) / 1000);
      this.ipHits.set(ip, hits);
      return { allowed: false, reason: 'ip', retryAfterSeconds: Math.max(1, retry) };
    }

    hits.push(now);
    this.ipHits.set(ip, hits);
    this.dayCount += 1;
    this.daySpend += this.cfg.estimatedUsdPerQuestion;

    // Opportunistic sweep so the map does not grow without bound.
    if (this.ipHits.size > 5_000) {
      for (const [k, v] of this.ipHits) {
        if (v.every((t) => t <= cutoff)) this.ipHits.delete(k);
      }
    }
    return { allowed: true };
  }

  /** For the health endpoint. Never exposes per-IP data. */
  status(now = Date.now()) {
    this.rollDay(now);
    return {
      day: this.dayKey,
      requestsToday: this.dayCount,
      globalPerDay: this.cfg.globalPerDay,
      estimatedSpendToday: Number(this.daySpend.toFixed(4)),
      dailyUsdCap: this.cfg.dailyUsdCap,
    };
  }
}

export const REFUSAL_MESSAGES: Record<'ip' | 'global' | 'budget', string> = {
  ip: 'Too many questions from this address in a short period. Please wait a moment and try again.',
  global:
    'The assistant has reached its daily limit of questions. It will be available again tomorrow. ' +
    'Urgent questions of mechanism should go to the technical liaison in writing.',
  budget:
    'The assistant has reached its daily cost ceiling and has stopped rather than continuing to spend. ' +
    'It will be available again tomorrow. This is a deliberate limit, not a fault.',
};
