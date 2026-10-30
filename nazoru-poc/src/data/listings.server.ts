// ~1,500 synthetic rental listings, generated from a fixed seed and held in memory.
// Production would query PostGIS (ST_Intersects) instead of filtering an array.
import { createAreaPredicate, distanceM } from '../core/area/filter';
import type { SearchArea } from '../core/area/model';
import { round5 } from '../core/geo/types';
import { stations, wardById, type Station } from './places';

export interface Listing {
  id: string;
  name: string;
  layout: string;
  areaM2: number;
  rent: number;
  fee: number;
  builtYear: number;
  floor: number;
  stationId: string;
  wardId: string;
  walkMin: number;
  lat: number;
  lng: number;
  address: string;
}

export interface ListingPoint {
  id: string;
  lat: number;
  lng: number;
}

const COUNT = 1500;
const SPREAD_M = 650;
const M_PER_DEG = 111_195;

const LAYOUTS = [
  { layout: '1R', weight: 2, base: 48_000, m2: [18, 24] },
  { layout: '1K', weight: 5, base: 56_000, m2: [20, 27] },
  { layout: '1DK', weight: 2, base: 66_000, m2: [25, 32] },
  { layout: '1LDK', weight: 4, base: 86_000, m2: [32, 45] },
  { layout: '2LDK', weight: 3, base: 112_000, m2: [50, 65] },
  { layout: '3LDK', weight: 1, base: 142_000, m2: [65, 82] },
] as const;
const PREFIXES = ['', 'グラン', 'ルミエール', 'アーバン', 'コート', 'ヴェール', 'リバティ', 'シャトー'];
const SUFFIXES = ['レジデンス', 'ハイツ', 'コーポ', 'テラス', 'ヒルズ', 'メゾン', 'ガーデン'];
const PREMIUM_WARDS = new Set(['naka', 'nakamura']);

// mulberry32: tiny deterministic PRNG
function rng(seed: number) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function nearestStation(p: { lat: number; lng: number }): { station: Station; meters: number } {
  let best = stations[0];
  let bestM = distanceM(p, best);
  for (const s of stations.slice(1)) {
    const m = distanceM(p, s);
    if (m < bestM) [best, bestM] = [s, m];
  }
  return { station: best, meters: bestM };
}

function generate(): Listing[] {
  const rand = rng(20261030);
  const pick = <T>(xs: readonly T[]) => xs[Math.floor(rand() * xs.length)];
  const totalWeight = LAYOUTS.reduce((n, l) => n + l.weight, 0);
  const pickLayout = () => {
    let r = rand() * totalWeight;
    for (const l of LAYOUTS) if ((r -= l.weight) < 0) return l;
    return LAYOUTS[0];
  };

  return Array.from({ length: COUNT }, (_, i) => {
    const origin = pick(stations);
    const r = SPREAD_M * Math.sqrt(rand());
    const theta = rand() * 2 * Math.PI;
    const lat = round5(origin.lat + (r * Math.cos(theta)) / M_PER_DEG);
    const lng = round5(origin.lng + (r * Math.sin(theta)) / (M_PER_DEG * Math.cos((origin.lat * Math.PI) / 180)));
    const { station, meters } = nearestStation({ lat, lng });
    const walkMin = Math.max(1, Math.ceil(meters / 80));
    const spec = pickLayout();
    const areaM2 = Math.round((spec.m2[0] + rand() * (spec.m2[1] - spec.m2[0])) * 10) / 10;
    const builtYear = 1985 + Math.floor(rand() * 41);
    const premium = PREMIUM_WARDS.has(station.wardId) ? 1.1 : 1;
    const age = 2026 - builtYear;
    const rent = Math.round((spec.base * premium * (1 - age * 0.006) - walkMin * 700 + rand() * 8_000) / 1000) * 1000;
    const name = `${pick(PREFIXES)}${station.name}${pick(SUFFIXES)}${rand() < 0.2 ? 'II' : ''}`;

    return {
      id: `nz-${String(i + 1).padStart(4, '0')}`,
      name,
      layout: spec.layout,
      areaM2,
      rent,
      fee: 3000 + Math.floor(rand() * 8) * 1000,
      builtYear,
      floor: 1 + Math.floor(rand() * 12),
      stationId: station.id,
      wardId: station.wardId,
      walkMin,
      lat,
      lng,
      address: `愛知県名古屋市${wardById(station.wardId)?.name ?? ''}`,
    };
  });
}

let cache: Listing[] | undefined;
export const getListings = () => (cache ??= generate());
export const getListing = (id: string) => getListings().find((l) => l.id === id);

const byWalkThenRent = (a: Listing, b: Listing) => a.walkMin - b.walkMin || a.rent - b.rent || a.id.localeCompare(b.id);

export interface SearchResult {
  total: number;
  page: number;
  pageCount: number;
  perPage: number;
  items: Listing[];
  points: ListingPoint[];
}

export function searchListings(area: SearchArea, opts: { page: number; perPage: number }): SearchResult {
  const inArea = createAreaPredicate(area);
  const matches = getListings().filter(inArea).sort(byWalkThenRent);
  const pageCount = Math.max(1, Math.ceil(matches.length / opts.perPage));
  const page = Math.min(Math.max(1, Math.floor(opts.page) || 1), pageCount);
  return {
    total: matches.length,
    page,
    pageCount,
    perPage: opts.perPage,
    items: matches.slice((page - 1) * opts.perPage, page * opts.perPage),
    points: matches.map(({ id, lat, lng }) => ({ id, lat, lng })),
  };
}

const countCache = new Map<string, Map<string, number>>();
/** Listing counts per station or ward id (for link and checkbox labels). */
export function countBy(key: 'stationId' | 'wardId', id: string): number {
  let counts = countCache.get(key);
  if (!counts) {
    counts = new Map();
    for (const l of getListings()) counts.set(l[key], (counts.get(l[key]) ?? 0) + 1);
    countCache.set(key, counts);
  }
  return counts.get(id) ?? 0;
}
