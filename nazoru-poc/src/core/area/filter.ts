import { booleanPointInPolygon } from '@turf/boolean-point-in-polygon';
import type { LatLng } from '../geo/types';
import type { SearchArea } from './model';
import { toPolygonFeature } from './validate';

export interface AreaPoint extends LatLng {
  stationId: string;
  wardId: string;
}

const EARTH_RADIUS_M = 6_371_008.8;
const rad = (deg: number) => (deg * Math.PI) / 180;

export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

export function createAreaPredicate(area: SearchArea): (point: AreaPoint) => boolean {
  switch (area.kind) {
    case 'stations': {
      const ids = new Set(area.stationIds);
      return (p) => ids.has(p.stationId);
    }
    case 'wards': {
      const ids = new Set(area.wardIds);
      return (p) => ids.has(p.wardId);
    }
    case 'radius':
      return (p) => distanceM(area.center, p) <= area.radiusM;
    case 'bounds':
      return (p) => p.lat >= area.sw.lat && p.lat <= area.ne.lat && p.lng >= area.sw.lng && p.lng <= area.ne.lng;
    case 'polygon': {
      const feature = toPolygonFeature(area.ring);
      return (p) => booleanPointInPolygon([p.lng, p.lat], feature);
    }
  }
}
