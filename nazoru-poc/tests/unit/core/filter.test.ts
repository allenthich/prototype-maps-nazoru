import { describe, expect, it } from 'vitest';
import { createAreaPredicate } from '../../../src/core/area/filter';
import { gaz, square } from './fixtures';

const inside = { lat: 35.185, lng: 136.906, stationId: 'sakae', wardId: 'naka' };
const outside = { lat: 35.17, lng: 136.93, stationId: 'ozone', wardId: 'kita' };

describe('createAreaPredicate', () => {
  it('stations: matches listings whose nearest station is selected', () => {
    const p = createAreaPredicate({ kind: 'stations', stationIds: ['sakae'] });
    expect([p(inside), p(outside)]).toEqual([true, false]);
  });

  it('wards: matches by ward id', () => {
    const p = createAreaPredicate({ kind: 'wards', wardIds: ['kita'] });
    expect([p(inside), p(outside)]).toEqual([false, true]);
  });

  it('radius: uses great-circle distance', () => {
    const center = gaz.stations.sakae;
    const p = createAreaPredicate({ kind: 'radius', center, radiusM: 500, origin: 'sakae' });
    expect(p({ ...inside, lat: center.lat + 0.004, lng: center.lng })).toBe(true); // ~445 m north
    expect(p({ ...inside, lat: center.lat + 0.005, lng: center.lng })).toBe(false); // ~556 m north
  });

  it('bounds: inclusive box test', () => {
    const p = createAreaPredicate({ kind: 'bounds', sw: { lat: 35.18, lng: 136.9 }, ne: { lat: 35.19, lng: 136.912 } });
    expect([p(inside), p(outside), p({ ...inside, lat: 35.18, lng: 136.9 })]).toEqual([true, false, true]);
  });

  it('polygon: point-in-polygon on the ring', () => {
    const p = createAreaPredicate({ kind: 'polygon', ring: square, source: 'trace' });
    expect([p(inside), p(outside)]).toEqual([true, false]);
  });
});
