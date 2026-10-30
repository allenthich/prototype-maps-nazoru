import { polygon } from '@turf/helpers';
import { kinks } from '@turf/kinks';
import { describe, expect, it } from 'vitest';
import { closeLoop, simplifyPath, type Pt } from '../../../src/core/geo/stroke';

const hasKinks = (ring: Pt[]) => {
  const coords = ring.map((p) => [p.x, p.y]);
  return kinks(polygon([[...coords, coords[0]]])).features.length > 0;
};

const circle = (r: number, steps = 48) =>
  Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI;
    return { x: r * Math.cos(t), y: r * Math.sin(t) };
  });

/** Full circle, then a tail that sweeps from outside to inside across the start (real overshoot). */
const overshootLoop = (r = 100) => {
  const tail = Array.from({ length: 6 }, (_, k) => {
    const t = 0.05 + k * 0.08;
    const rr = r * (1.12 - k * 0.06);
    return { x: rr * Math.cos(t), y: rr * Math.sin(t) };
  });
  return [...circle(r), ...tail];
};

const figureEight = (r = 100, steps = 64) =>
  Array.from({ length: steps + 1 }, (_, i) => {
    const t = (i / steps) * 2 * Math.PI;
    return { x: r * Math.sin(t), y: (r / 2) * Math.sin(2 * t) };
  });

describe('closeLoop', () => {
  it('trims the overshoot at the closing so the loop no longer crosses itself', () => {
    const stroke = overshootLoop();
    expect(hasKinks(stroke)).toBe(true);
    const ring = closeLoop(stroke);
    expect(hasKinks(ring)).toBe(false);
    expect(ring.length).toBeLessThan(stroke.length);
  });

  it('leaves a loop that stops short of its start unchanged', () => {
    const stroke = circle(100).slice(0, 44);
    expect(closeLoop(stroke)).toEqual(stroke);
  });

  it('does not repair a figure-8 (the crossing is mid-stroke)', () => {
    expect(hasKinks(closeLoop(figureEight()))).toBe(true);
  });
});

describe('simplifyPath', () => {
  it('drops points within tolerance of a straight line', () => {
    const line = Array.from({ length: 11 }, (_, i) => ({ x: i * 10, y: i % 2 ? 0.5 : 0 }));
    expect(simplifyPath(line, 2)).toEqual([line[0], line[10]]);
  });

  it('keeps corners', () => {
    const l = [{ x: 0, y: 0 }, { x: 50, y: 0.4 }, { x: 100, y: 0 }, { x: 100, y: 50 }, { x: 100, y: 100 }];
    expect(simplifyPath(l, 2)).toEqual([l[0], l[2], l[4]]);
  });
});
