import { area as turfArea } from '@turf/area';
import { polygon } from '@turf/helpers';
import { kinks } from '@turf/kinks';
import type { LatLng } from '../geo/types';

export const MIN_AREA_KM2 = 0.05;
export const MAX_AREA_KM2 = 30;
export const MAX_VERTICES = 200;

export type PolygonValidation =
  | { ok: true; ring: LatLng[]; areaKm2: number }
  | { ok: false; error: string };

const same = (a: LatLng, b: LatLng) => a.lat === b.lat && a.lng === b.lng;

/** Drops consecutive duplicates and the closing vertex, so rings are always stored open. */
export function openRing(input: LatLng[]): LatLng[] {
  const ring = input.filter((p, i) => i === 0 || !same(p, input[i - 1]));
  while (ring.length > 1 && same(ring[0], ring[ring.length - 1])) ring.pop();
  return ring;
}

export function toPolygonFeature(ring: LatLng[]) {
  const coords = ring.map(({ lat, lng }) => [lng, lat]);
  return polygon([[...coords, coords[0]]]);
}

export function polygonAreaKm2(ring: LatLng[]): number {
  return turfArea(toPolygonFeature(ring)) / 1e6;
}

export function validatePolygon(input: LatLng[]): PolygonValidation {
  const ring = openRing(input);
  if (ring.length > MAX_VERTICES) return { ok: false, error: '頂点が多すぎます。もう一度囲み直してください。' };
  if (ring.length < 3) return { ok: false, error: '頂点が足りません。3点以上で範囲を囲んでください。' };

  const feature = toPolygonFeature(ring);
  if (kinks(feature).features.length > 0) {
    return { ok: false, error: '線が交差しています。線が交わらないように囲み直してください。' };
  }

  const areaKm2 = turfArea(feature) / 1e6;
  if (areaKm2 < MIN_AREA_KM2) return { ok: false, error: '範囲が狭すぎます。もう少し大きく囲んでください。' };
  if (areaKm2 > MAX_AREA_KM2) {
    return { ok: false, error: '範囲が広すぎます。もっと狭く囲むか、駅・エリアから探してください。' };
  }
  return { ok: true, ring, areaKm2 };
}
