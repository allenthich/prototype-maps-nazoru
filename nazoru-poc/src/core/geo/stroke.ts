// Screen-space helpers for a freehand stroke (pixels, before conversion to lat/lng).
export interface Pt {
  x: number;
  y: number;
}

/** Proper or touching intersection of segments ab and cd, if any. */
function intersect(a: Pt, b: Pt, c: Pt, d: Pt): Pt | null {
  const den = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
  if (den === 0) return null; // parallel or collinear: ignore
  const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / den;
  const u = ((c.x - a.x) * (b.y - a.y) - (c.y - a.y) * (b.x - a.x)) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

/**
 * Fingers overshoot: the end of a lasso usually crosses its own start. If a segment near the end
 * crosses a segment near the start, keep only the loop between the two crossings. Crossings in the
 * middle of the stroke (a figure-8) are left alone so validation can reject them.
 */
export function closeLoop(points: Pt[], edgeFraction = 0.2): Pt[] {
  const n = points.length;
  if (n < 4) return points;
  const head = Math.max(1, Math.floor((n - 1) * edgeFraction));
  const tailStart = Math.min(n - 2, Math.ceil((n - 1) * (1 - edgeFraction)));
  for (let j = n - 2; j >= tailStart; j--) {
    for (let i = 0; i < head && i < j - 1; i++) {
      const x = intersect(points[i], points[i + 1], points[j], points[j + 1]);
      if (x) return [x, ...points.slice(i + 1, j + 1)];
    }
  }
  return points;
}

function perpendicularDistance(p: Pt, a: Pt, b: Pt): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  return Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / len;
}

/** Douglas–Peucker, iterative. */
export function simplifyPath(points: Pt[], tolerance: number): Pt[] {
  if (points.length < 3) return points;
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = keep[points.length - 1] = true;
  const stack: [number, number][] = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i++) {
      const d = perpendicularDistance(points[i], points[start], points[end]);
      if (d > maxDist) [maxDist, index] = [d, i];
    }
    if (index !== -1 && maxDist > tolerance) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}
