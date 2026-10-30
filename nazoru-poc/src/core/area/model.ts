// The one area model every search mode produces, and its URL form.
// Framework-agnostic: no DOM, no Astro imports.
import { decodePolyline, encodePolyline } from '../geo/polyline';
import { round5, type LatLng } from '../geo/types';
import { validatePolygon } from './validate';

export type { LatLng };

export const RADIUS_OPTIONS = [500, 1000, 2000] as const;
export type RadiusM = (typeof RADIUS_OPTIONS)[number];

/** A station id, or 'here' (geolocation) / 'point' (chosen on the map). */
export type RadiusOrigin = string;

export type SearchArea =
  | { kind: 'stations'; stationIds: string[] }
  | { kind: 'wards'; wardIds: string[] }
  | { kind: 'radius'; center: LatLng; radiusM: RadiusM; origin: RadiusOrigin }
  | { kind: 'bounds'; sw: LatLng; ne: LatLng }
  | { kind: 'polygon'; ring: LatLng[]; source: 'trace' | 'crosshair' };

export interface Gazetteer {
  stations: Record<string, { name: string; lat: number; lng: number; wardId: string }>;
  wards: Record<string, { name: string }>;
}

export type ParseResult = { ok: true; area: SearchArea | null } | { ok: false; error: string };

const COORD_ORIGINS = new Set(['here', 'point']);
const fail = (error: string): ParseResult => ({ ok: false, error });
const fmt = (n: number) => String(round5(n));

export function serializeArea(area: SearchArea): string {
  const p = new URLSearchParams({ area: area.kind });
  switch (area.kind) {
    case 'stations':
      for (const id of area.stationIds) p.append('station', id);
      break;
    case 'wards':
      for (const id of area.wardIds) p.append('ward', id);
      break;
    case 'radius':
      p.set('origin', area.origin);
      if (COORD_ORIGINS.has(area.origin)) {
        p.set('lat', fmt(area.center.lat));
        p.set('lng', fmt(area.center.lng));
      }
      p.set('r', String(area.radiusM));
      break;
    case 'bounds':
      p.set('bbox', [area.sw.lat, area.sw.lng, area.ne.lat, area.ne.lng].map(fmt).join(','));
      break;
    case 'polygon':
      p.set('src', area.source);
      p.set('p', encodePolyline(area.ring));
      break;
  }
  return p.toString();
}

const unique = (values: string[]) => [...new Set(values.filter(Boolean))];

function parseLatLng(lat: string | null, lng: string | null): LatLng | null {
  const la = Number(lat);
  const ln = Number(lng);
  if (lat === null || lng === null || !Number.isFinite(la) || !Number.isFinite(ln)) return null;
  if (Math.abs(la) > 90 || Math.abs(ln) > 180) return null;
  return { lat: round5(la), lng: round5(ln) };
}

export function parseArea(params: URLSearchParams, gaz: Gazetteer): ParseResult {
  const kind = params.get('area');
  if (kind === null) return { ok: true, area: null };

  switch (kind) {
    case 'stations': {
      const stationIds = unique(params.getAll('station'));
      if (stationIds.length === 0) return fail('駅を1つ以上選んでください。');
      if (stationIds.some((id) => !gaz.stations[id])) return fail('選択された駅が見つかりません。');
      return { ok: true, area: { kind, stationIds } };
    }
    case 'wards': {
      const wardIds = unique(params.getAll('ward'));
      if (wardIds.length === 0) return fail('区を1つ以上選んでください。');
      if (wardIds.some((id) => !gaz.wards[id])) return fail('選択された区が見つかりません。');
      return { ok: true, area: { kind, wardIds } };
    }
    case 'radius': {
      const radiusM = Number(params.get('r')) as RadiusM;
      if (!RADIUS_OPTIONS.includes(radiusM)) return fail('半径は500m・1km・2kmから選んでください。');
      const origin = params.get('origin') ?? '';
      if (COORD_ORIGINS.has(origin)) {
        const center = parseLatLng(params.get('lat'), params.get('lng'));
        if (!center) return fail('中心の位置情報がありません。');
        return { ok: true, area: { kind, center, radiusM, origin } };
      }
      const station = gaz.stations[origin];
      if (!station) return fail('中心となる駅が見つかりません。');
      return { ok: true, area: { kind, center: { lat: station.lat, lng: station.lng }, radiusM, origin } };
    }
    case 'bounds': {
      const parts = (params.get('bbox') ?? '').split(',');
      const sw = parts.length === 4 ? parseLatLng(parts[0], parts[1]) : null;
      const ne = parts.length === 4 ? parseLatLng(parts[2], parts[3]) : null;
      if (!sw || !ne || sw.lat >= ne.lat || sw.lng >= ne.lng) return fail('表示範囲の指定が正しくありません。');
      return { ok: true, area: { kind, sw, ne } };
    }
    case 'polygon': {
      const source = params.get('src') ?? 'trace';
      let ring: LatLng[] = [];
      try {
        ring = decodePolyline(params.get('p') ?? '');
      } catch {
        return fail('範囲の指定が正しくありません。');
      }
      if (ring.length === 0 || (source !== 'trace' && source !== 'crosshair')) return fail('範囲の指定が正しくありません。');
      const valid = validatePolygon(ring);
      if (!valid.ok) return fail(valid.error);
      return { ok: true, area: { kind, ring: valid.ring, source } };
    }
    default:
      return fail('検索範囲の種類が正しくありません。');
  }
}
