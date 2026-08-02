/**
 * Parametric girih geometry.
 *
 * The brief was Zaha Hadid's structural language applied to Islamic geometric
 * grammar rather than to Western minimalism. The tension is that Islamic
 * geometry is rigid and tessellated while Hadid's language is fluid, and the
 * synthesis is not one imposed on the other.
 *
 * The resolution used here is that the star and the surface are the same
 * equation at different parameter values. A single radial function
 *
 *     r(θ) = R · (1 − a · |cos(n·θ/2)|^p)
 *
 * with n = 8 produces exact eight-fold symmetry for every value of a and p.
 * At a ≈ 0.55 and p ≈ 0.35 it is the sharp eight-point star of a khatim. At
 * a ≈ 0.06 and p ≈ 2.4 it is a nearly circular continuous surface that still
 * carries the eight-fold rhythm. Sweeping a and p across a family of layers
 * therefore *is* the recursive subdivision, rendered as flowing surface
 * rather than as flat pattern. Nothing is drawn by hand and nothing is
 * sourced; every point below is computed.
 *
 * The straight construction lines are drawn too, at low opacity, because the
 * brief asks for forms whose underlying construction is visibly geometric.
 * The curves and the lines come from the same vertices, so what you see under
 * the surface is genuinely the construction of the surface, not an ornament
 * laid on top of it.
 *
 * Deterministic: same inputs, same path data. No randomness at render time,
 * so the server and the client agree and nothing shifts between reloads.
 */

export interface Pt {
  x: number;
  y: number;
}

/** Exact n-fold symmetry for any a, p. n is the number of star points. */
export function radialAt(theta: number, R: number, n: number, a: number, p: number): number {
  const lobe = Math.abs(Math.cos((n * theta) / 2));
  return R * (1 - a * Math.pow(lobe, p));
}

export function ringPoints(
  cx: number,
  cy: number,
  R: number,
  opts: { n?: number; a: number; p: number; rotation?: number; samples?: number },
): Pt[] {
  const { n = 8, a, p, rotation = 0, samples = 8 * 24 } = opts;
  const pts: Pt[] = [];
  for (let i = 0; i < samples; i++) {
    const t = (i / samples) * Math.PI * 2 + rotation;
    const r = radialAt(t - rotation, R, n, a, p);
    pts.push({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) });
  }
  return pts;
}

/**
 * Closed Catmull-Rom through the sampled points, emitted as cubic Béziers.
 * The sampling is dense enough that this is visually exact; it exists so the
 * output is a small number of smooth segments rather than a polyline, which
 * is what makes the edge read as a surface rather than as a facetted shape.
 */
export function closedSpline(pts: Pt[], tension = 1): string {
  const n = pts.length;
  if (n < 3) return '';
  const at = (i: number) => pts[((i % n) + n) % n];
  let d = `M ${fmt(pts[0].x)} ${fmt(pts[0].y)}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1 = { x: p1.x + ((p2.x - p0.x) / 6) * tension, y: p1.y + ((p2.y - p0.y) / 6) * tension };
    const c2 = { x: p2.x - ((p3.x - p1.x) / 6) * tension, y: p2.y - ((p3.y - p1.y) / 6) * tension };
    d += ` C ${fmt(c1.x)} ${fmt(c1.y)}, ${fmt(c2.x)} ${fmt(c2.y)}, ${fmt(p2.x)} ${fmt(p2.y)}`;
  }
  return d + ' Z';
}

function fmt(v: number): string {
  return Number.isFinite(v) ? String(Math.round(v * 100) / 100) : '0';
}

export interface Layer {
  d: string;
  /** 0 = sharpest star, 1 = smoothest surface. Drives opacity and stroke. */
  t: number;
  R: number;
  rotation: number;
}

/**
 * A family of layers sweeping from star to surface.
 *
 * `turn` rotates each successive layer by a fraction of the eight-fold step.
 * A full step would map each layer onto the previous one and the depth would
 * collapse; a fraction produces the interleaved, twisting depth that reads as
 * layering rather than as concentric rings.
 */
export function buildField(opts: {
  cx: number;
  cy: number;
  R: number;
  layers?: number;
  n?: number;
  /** Fraction of one symmetry step to rotate per layer. */
  turn?: number;
  /** Innermost radius as a fraction of R. */
  inner?: number;
}): Layer[] {
  const { cx, cy, R, layers = 9, n = 8, turn = 0.34, inner = 0.3 } = opts;
  const step = (Math.PI * 2) / n;
  const out: Layer[] = [];
  for (let i = 0; i < layers; i++) {
    const t = layers === 1 ? 0 : i / (layers - 1); // 0 -> star, 1 -> surface
    const a = 0.55 - 0.49 * easeInOut(t);
    const p = 0.35 + 2.05 * easeInOut(t);
    const radius = R * (inner + (1 - inner) * (1 - t * 0.55));
    const rotation = i * step * turn;
    out.push({
      d: closedSpline(ringPoints(cx, cy, radius, { n, a, p, rotation })),
      t,
      R: radius,
      rotation,
    });
  }
  return out;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/**
 * The straight girih skeleton: the chords of the star polygon {n/step}.
 * These are the compass-and-straightedge lines the curved surfaces are built
 * from. Drawn faintly so the construction is legible without competing.
 */
export function constructionLines(
  cx: number,
  cy: number,
  R: number,
  opts: { n?: number; step?: number; rotation?: number } = {},
): string {
  const { n = 8, step = 3, rotation = 0 } = opts;
  const vert = (i: number): Pt => {
    const t = (i / n) * Math.PI * 2 + rotation - Math.PI / 2;
    return { x: cx + R * Math.cos(t), y: cy + R * Math.sin(t) };
  };
  let d = '';
  for (let i = 0; i < n; i++) {
    const A = vert(i);
    const B = vert(i + step);
    d += ` M ${fmt(A.x)} ${fmt(A.y)} L ${fmt(B.x)} ${fmt(B.y)}`;
  }
  return d.trim();
}

/**
 * Recursive subdivision: the same star repeated at the vertices of its parent,
 * scaled down. Two levels is enough to read as recursive without becoming
 * noise at phone size, which is where most of this audience will see it.
 */
export function subdivide(
  cx: number,
  cy: number,
  R: number,
  depth: number,
  opts: { n?: number; scale?: number } = {},
): { cx: number; cy: number; R: number; depth: number }[] {
  const { n = 8, scale = 0.34 } = opts;
  const out = [{ cx, cy, R, depth: 0 }];
  if (depth <= 0) return out;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2;
    const childR = R * scale;
    const cxi = cx + R * 0.82 * Math.cos(t);
    const cyi = cy + R * 0.82 * Math.sin(t);
    out.push(...subdivide(cxi, cyi, childR, depth - 1, opts).map((c) => ({ ...c, depth: c.depth + 1 })));
  }
  return out;
}
