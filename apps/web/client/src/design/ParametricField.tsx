import { useId, useMemo } from 'react';
import { ringPoints, closedSpline, constructionLines } from './geometry';

/**
 * The parametric field: nested eight-fold shells rendered as continuous
 * surface, with the straight girih construction legible underneath.
 *
 * Read the header of `geometry.ts` for why the star and the surface are the
 * same equation. What matters here is composition, and three decisions were
 * made deliberately:
 *
 * 1. The ribs of every shell are aligned to one shared orientation. Rotating
 *    each shell by half a symmetry step produces a livelier form that reads
 *    as sixteen-fold and slightly psychedelic. Aligned, it reads as structure.
 *
 * 2. The form is cropped by the frame rather than centred in it. A centred
 *    rosette is a medallion, which is ornament. A cropped one is a fragment
 *    of something larger, which is architecture — and it leaves two thirds of
 *    the frame as quiet space for the words, which are the actual content.
 *
 * 3. Gold appears on one rib only. Used on all of them it becomes decoration;
 *    used on one it carries the eye and stays defensible as hierarchy.
 *
 * Motion is off by default and, when enabled, is a single very slow rotation
 * that a reader will not consciously notice. `prefers-reduced-motion` removes
 * it entirely. The audience is senior scholars and institutional finance;
 * nothing here should feel like a product launch.
 */

export interface ParametricFieldProps {
  /** Viewport-relative anchor of the form's centre, 0–1. */
  anchor?: { x: number; y: number };
  /** Radius as a fraction of the shorter viewBox side. */
  scale?: number;
  shells?: number;
  /** Which shell carries the highlight. */
  leadShell?: number;
  /** Off by default. Restraint is the brief. */
  motion?: boolean;
  className?: string;
  /** Decorative by definition — never announced to a screen reader. */
  title?: string;
}

const VB = { w: 1200, h: 760 };
const TURN = -Math.PI / 8;

export default function ParametricField({
  anchor = { x: 0.8, y: 0.46 },
  scale = 0.62,
  shells = 7,
  leadShell = 2,
  motion = false,
  className,
}: ParametricFieldProps) {
  const uid = useId().replace(/:/g, '');
  const cx = VB.w * anchor.x;
  const cy = VB.h * anchor.y;
  const R = Math.min(VB.w, VB.h) * scale;

  const { paths, octagram } = useMemo(() => {
    const paths: { d: string; t: number }[] = [];
    for (let i = 0; i < shells; i++) {
      const t = shells === 1 ? 0 : i / (shells - 1);
      const a = 0.17 - 0.11 * t;
      const p = 1.25 + 1.35 * t;
      const radius = R * (0.2 + 0.8 * Math.pow(t, 0.92));
      paths.push({ d: closedSpline(ringPoints(cx, cy, radius, { n: 8, a, p, rotation: TURN })), t });
    }
    return {
      paths,
      octagram: constructionLines(cx, cy, R * 0.72, { n: 8, step: 3, rotation: TURN + Math.PI / 2 }),
    };
  }, [cx, cy, R, shells]);

  return (
    <svg
      className={className}
      viewBox={`0 0 ${VB.w} ${VB.h}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      role="presentation"
    >
      <defs>
        <radialGradient id={`${uid}-bg`} cx={`${anchor.x * 100}%`} cy={`${anchor.y * 100}%`} r="82%">
          <stop offset="0%" stopColor="#12233F" />
          <stop offset="62%" stopColor="var(--g-surface, #0C1A33)" />
          <stop offset="100%" stopColor="var(--g-navy, #0A1428)" />
        </radialGradient>
        <radialGradient id={`${uid}-core`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--g-gold-soft, #E3C878)" stopOpacity="0.20" />
          <stop offset="100%" stopColor="var(--g-gold, #C9A845)" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${uid}-vault`} x1="0.15" y1="0.05" x2="0.85" y2="0.95">
          <stop offset="0%" stopColor="var(--g-gold-soft, #E3C878)" stopOpacity="0.13" />
          <stop offset="55%" stopColor="var(--g-gold, #C9A845)" stopOpacity="0.035" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0.10" />
        </linearGradient>
      </defs>

      <rect width={VB.w} height={VB.h} fill={`url(#${uid}-bg)`} />

      <g className={motion ? 'g-field-drift' : undefined} style={{ transformOrigin: `${cx}px ${cy}px` }}>
        {[...paths].reverse().map((p, i) => (
          <path
            key={`s${i}`}
            d={p.d}
            fill={`url(#${uid}-vault)`}
            fillOpacity={0.9 - 0.06 * i}
            stroke="none"
          />
        ))}

        {/* The compass-and-straightedge skeleton the surfaces are built from. */}
        <path d={octagram} fill="none" stroke="var(--g-line, #22314F)" strokeOpacity="0.9" strokeWidth="1.1" />

        {paths.map((p, i) => {
          const lead = i === leadShell;
          return (
            <path
              key={`e${i}`}
              d={p.d}
              fill="none"
              stroke={lead ? 'var(--g-gold-soft, #E3C878)' : 'var(--g-gold, #C9A845)'}
              strokeOpacity={lead ? 0.5 : Math.max(0.08, 0.26 - 0.025 * i)}
              strokeWidth={lead ? 1.6 : Math.max(0.6, 1.0 - 0.06 * i)}
            />
          );
        })}

        <circle cx={cx} cy={cy} r={R * 0.22} fill={`url(#${uid}-core)`} />
      </g>
    </svg>
  );
}
