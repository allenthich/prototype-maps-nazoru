import { describe, expect, it } from 'vitest';
import { distanceM } from '../../../src/core/area/filter';
import { gazetteer, stations, wards } from '../../../src/data/places';
import { getListings, searchListings } from '../../../src/data/listings.server';

describe('places', () => {
  it('has central-Nagoya stations that all belong to a known ward', () => {
    expect(stations.length).toBeGreaterThanOrEqual(16);
    for (const s of stations) expect(wards.map((w) => w.id)).toContain(s.wardId);
  });

  it('exposes a gazetteer keyed by id', () => {
    expect(gazetteer.stations.sakae.name).toBe('栄');
    expect(gazetteer.wards.naka.name).toBe('中区');
  });
});

describe('synthetic listings', () => {
  const listings = getListings();

  it('is deterministic', () => {
    expect(listings).toHaveLength(1500);
    expect(listings[0].id).toBe('nz-0001');
    expect(getListings()).toBe(listings); // memoized
    expect(listings.slice(0, 3)).toMatchSnapshot();
  });

  it('assigns each listing its true nearest station, that station’s ward, and walking minutes', () => {
    for (const l of listings) {
      const nearest = stations.reduce((a, b) => (distanceM(l, a) <= distanceM(l, b) ? a : b));
      expect(l.stationId).toBe(nearest.id);
      expect(l.wardId).toBe(nearest.wardId);
      expect(l.walkMin).toBe(Math.max(1, Math.ceil(distanceM(l, nearest) / 80)));
    }
  });

  it('stays inside central Nagoya', () => {
    for (const l of listings) {
      expect(l.lat).toBeGreaterThan(35.15);
      expect(l.lat).toBeLessThan(35.22);
      expect(l.lng).toBeGreaterThan(136.86);
      expect(l.lng).toBeLessThan(136.96);
    }
  });
});

describe('searchListings', () => {
  it('returns total, a page of items, and every in-area point for clustering', () => {
    const result = searchListings({ kind: 'stations', stationIds: ['sakae'] }, { page: 1, perPage: 20 });
    expect(result.total).toBeGreaterThan(20);
    expect(result.items).toHaveLength(20);
    expect(result.points).toHaveLength(result.total);
    expect(result.items.every((l) => l.stationId === 'sakae')).toBe(true);
    expect(result.pageCount).toBe(Math.ceil(result.total / 20));
  });

  it('sorts by walking minutes, then rent', () => {
    const { items } = searchListings({ kind: 'wards', wardIds: ['naka'] }, { page: 1, perPage: 50 });
    for (let i = 1; i < items.length; i++) {
      const [a, b] = [items[i - 1], items[i]];
      expect(a.walkMin < b.walkMin || (a.walkMin === b.walkMin && a.rent <= b.rent)).toBe(true);
    }
  });

  it('clamps out-of-range pages to the last page', () => {
    const result = searchListings({ kind: 'stations', stationIds: ['sakae'] }, { page: 999, perPage: 20 });
    expect(result.page).toBe(result.pageCount);
  });
});
