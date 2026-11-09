import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, readConfig, writeConfig } from '../../../src/prototype/config';
import { getStores } from '../../../src/prototype/stores.server';
import { fitViewport, parseRequest, searchStores, viewportPins } from '../../../src/prototype/search';

describe('prototype configuration', () => {
  it('defaults to an open map with live pins and button-controlled results', () => {
    expect(readConfig(new URLSearchParams())).toMatchObject({ pinRefresh: 'auto', listRefresh: 'manual', mapOpen: true });
  });
  it('round trips a combination of independently selected behaviors', () => {
    const combination = { ...DEFAULT_CONFIG, mapOpen: false, pinRefresh: 'search' as const, listRefresh: 'auto' as const, pinAction: 'none' as const, clusterAction: 'zoom' as const, trace: true };
    expect(readConfig(writeConfig(new URLSearchParams(), combination))).toEqual(combination);
  });
  it('ignores unknown configuration values without losing valid overrides', () => {
    expect(readConfig(new URLSearchParams('preset=live&ui_pinAction=script&ui_trace=1'))).toMatchObject({ listRefresh: 'auto', pinAction: 'sheet', trace: true });
  });
  it('treats inherited property names as unknown presets', () => {
    expect(readConfig(new URLSearchParams('preset=constructor'))).toEqual(DEFAULT_CONFIG);
  });
});

describe('independent map and results queries', () => {
  const stores = getStores();
  const scope = { kind: 'districts' as const, ids: ['nishiki'] };
  const filters = { category: 'all', preferences: [] };
  const viewport = { sw: { lat: 35.14, lng: 136.86 }, ne: { lat: 35.19, lng: 136.95 } };
  it('discovers stores outside the committed area without changing the results', () => {
    const before = searchStores(stores, scope, filters);
    const pins = viewportPins(stores, viewport, scope, filters);
    expect(pins.some(p => !p.inResults)).toBe(true);
    expect(pins.filter(p => p.inResults).map(p => p.id).sort()).toEqual(before.map(s => s.id).sort());
    expect(searchStores(stores, scope, filters)).toEqual(before);
  });
  it('keeps category and every preference applied to surrounding pins', () => {
    const filtered = { category: 'cafe', preferences: ['wifi', 'terrace'] };
    const pins = viewportPins(stores, viewport, scope, filtered);
    expect(pins.length).toBeGreaterThan(0);
    for (const pin of pins) {
      const store = stores.find(s => s.id === pin.id)!;
      expect(store.category).toBe('cafe');
      expect(store.preferences).toEqual(expect.arrayContaining(['wifi', 'terrace']));
    }
  });
  it('marks membership across the entire committed search, beyond one page', () => {
    const results = searchStores(stores, scope, filters);
    expect(results.length).toBeGreaterThan(12);
    expect(viewportPins(stores, viewport, scope, filters).filter(p => p.inResults)).toHaveLength(results.length);
  });
  it('can replace the district scope with the current viewport', () => {
    const all = searchStores(stores, { kind: 'bounds', ...viewport }, filters);
    expect(all.length).toBeGreaterThan(searchStores(stores, scope, filters).length);
  });
  it('rejects malformed scope and filter input at the request boundary', () => {
    expect(() => parseRequest(new URLSearchParams('scope=area%3Dbounds%26bbox%3DNaN,0,1,2'))).toThrow();
    expect(() => parseRequest(new URLSearchParams('category=unknown'))).toThrow();
    expect(() => parseRequest(new URLSearchParams('pref=unknown'))).toThrow();
    expect(() => parseRequest(new URLSearchParams('scope=districts%3Dunknown'))).toThrow();
  });
  it('contains deliberate same-building fixtures to test dense-store behavior', () => {
    const groups = new Map<string, number>();
    for (const s of stores) groups.set(s.buildingId, (groups.get(s.buildingId) ?? 0) + 1);
    expect(Math.max(...groups.values())).toBeGreaterThan(24);
    expect([...groups.values()]).toContain(1);
  });
  it('falls back to all selected district bounds when filters yield zero stores', () => {
    const bounds = fitViewport({ kind: 'districts', ids: ['nishiki', 'meieki'] }, []);
    expect(bounds.sw.lng).toBeLessThan(136.879);
    expect(bounds.ne.lng).toBeGreaterThan(136.909);
  });
});
