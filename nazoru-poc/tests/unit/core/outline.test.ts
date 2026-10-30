import { describe, expect, it } from 'vitest';
import { distanceM } from '../../../src/core/area/filter';
import { areaOutline } from '../../../src/core/area/outline';
import { gaz, square } from './fixtures';

describe('areaOutline', () => {
  it('returns the polygon ring as-is', () => {
    expect(areaOutline({ kind: 'polygon', ring: square, source: 'trace' })).toEqual(square);
  });

  it('approximates a radius with a 64-point ring on the circle', () => {
    const center = gaz.stations.sakae;
    const ring = areaOutline({ kind: 'radius', center, radiusM: 1000, origin: 'sakae' })!;
    expect(ring).toHaveLength(64);
    for (const p of ring) expect(distanceM(center, p)).toBeCloseTo(1000, -1); // within ~5 m
  });

  it('returns the four corners of bounds (counterclockwise from south-west)', () => {
    expect(areaOutline({ kind: 'bounds', sw: { lat: 35.16, lng: 136.89 }, ne: { lat: 35.2, lng: 136.94 } })).toEqual([
      { lat: 35.16, lng: 136.89 },
      { lat: 35.16, lng: 136.94 },
      { lat: 35.2, lng: 136.94 },
      { lat: 35.2, lng: 136.89 },
    ]);
  });

  it('has no outline for list-based areas', () => {
    expect(areaOutline({ kind: 'stations', stationIds: ['sakae'] })).toBeNull();
    expect(areaOutline({ kind: 'wards', wardIds: ['naka'] })).toBeNull();
  });
});
