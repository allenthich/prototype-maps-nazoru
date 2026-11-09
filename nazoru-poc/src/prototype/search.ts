import { createAreaPredicate } from '../core/area/filter';
import { parseArea, serializeArea } from '../core/area/model';
import { areaOutline } from '../core/area/outline';
import { DISTRICTS, CATEGORIES, PREFERENCES, districtName, type Filters, type DemoStore, type Scope, type StorePin, type Viewport } from './catalog';

export const PAGE_SIZE = 12;
export const DEFAULT_SCOPE: Scope = { kind: 'districts', ids: ['nishiki'] };

export function scopeQuery(scope: Scope): string {
  return scope.kind === 'districts' ? new URLSearchParams({ districts: scope.ids.join(',') }).toString() : serializeArea(scope);
}

export function parseScope(raw: string | null): Scope {
  if (!raw) return { kind: 'districts', ids: ['nishiki'] };
  if (raw.length > 12000) throw new Error('検索範囲が長すぎます。');
  const params = new URLSearchParams(raw);
  if (params.has('districts')) {
    const ids = [...new Set((params.get('districts') ?? '').split(','))];
    if (!ids.length || ids.some(id => !DISTRICTS.some(d => d.id === id))) throw new Error('エリアを選択してください。');
    return { kind: 'districts', ids };
  }
  const parsed = parseArea(params, { stations: {}, wards: {} });
  if (!parsed.ok) throw new Error(parsed.error);
  if (!parsed.area || !['bounds', 'radius', 'polygon'].includes(parsed.area.kind)) throw new Error('検索範囲が正しくありません。');
  return parsed.area as Exclude<Scope, { kind: 'districts' }>;
}

export function parseViewport(raw: string): Viewport {
  const scope = parseScope(new URLSearchParams({ area: 'bounds', bbox: raw }).toString());
  if (scope.kind !== 'bounds') throw new Error('地図の表示範囲が正しくありません。');
  return { sw: scope.sw, ne: scope.ne };
}

export function parseRequest(params: URLSearchParams) {
  const scope = parseScope(params.get('scope'));
  const category = params.get('category') ?? 'all';
  const preferences = [...new Set(params.getAll('pref'))];
  if (category !== 'all' && !CATEGORIES.some(g => g.id === category)) throw new Error('カテゴリの指定が正しくありません。');
  if (preferences.some(id => !PREFERENCES.some(p => p.id === id))) throw new Error('こだわり条件の指定が正しくありません。');
  const page = Number(params.get('page') ?? '1');
  if (!Number.isSafeInteger(page) || page < 1) throw new Error('ページの指定が正しくありません。');
  return { scope, filters: { category, preferences }, page };
}

export function inScope(scope: Scope): (store: DemoStore) => boolean {
  if (scope.kind === 'districts') return store => scope.ids.includes(store.districtId);
  const predicate = createAreaPredicate(scope);
  return store => predicate({ ...store, stationId: '', wardId: '' });
}

export function matchesFilters(store: DemoStore, filters: Filters): boolean {
  return (filters.category === 'all' || store.category === filters.category) && filters.preferences.every(p => store.preferences.includes(p));
}

export function searchStores(stores: DemoStore[], scope: Scope, filters: Filters): DemoStore[] {
  const contains = inScope(scope);
  return stores.filter(store => contains(store) && matchesFilters(store, filters));
}

export function viewportPins(stores: DemoStore[], viewport: Viewport, scope: Scope, filters: Filters): StorePin[] {
  const contains = inScope(scope);
  return stores.filter(store => matchesFilters(store, filters) && store.lat >= viewport.sw.lat && store.lat <= viewport.ne.lat && store.lng >= viewport.sw.lng && store.lng <= viewport.ne.lng)
    .map(({ id, name, lat, lng, buildingId, ...rest }) => ({ id, name, lat, lng, buildingId, inResults: contains({ id, name, lat, lng, buildingId, ...rest }) }));
}

export function paginate(items: DemoStore[], requestedPage: number) {
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const page = Math.min(requestedPage, pageCount);
  return { total: items.length, items: items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), page, pageCount };
}

export function scopeLabel(scope: Scope): string {
  switch (scope.kind) {
    case 'districts': return scope.ids.map(districtName).join('・');
    case 'bounds': return '地図の表示エリア';
    case 'radius': return `指定地点から半径${scope.radiusM >= 1000 ? `${scope.radiusM / 1000}km` : `${scope.radiusM}m`}`;
    case 'polygon': return '指定した範囲';
  }
}

/** Fit all matching stores, falling back to the selected area's geometry for zero matches. */
export function fitViewport(scope: Scope, stores: Pick<DemoStore, 'lat' | 'lng'>[]): Viewport {
  let points = stores;
  if (!points.length) points = scope.kind === 'districts'
    ? DISTRICTS.filter(d => scope.ids.includes(d.id)).flatMap(d => [d.sw, d.ne])
    : areaOutline(scope) ?? [];
  const lats = points.map(p => p.lat);
  const lngs = points.map(p => p.lng);
  return {
    sw: { lat: Math.min(...lats) - .00025, lng: Math.min(...lngs) - .00025 },
    ne: { lat: Math.max(...lats) + .00025, lng: Math.max(...lngs) + .00025 },
  };
}
