import { circle } from '@turf/circle';
import { round5, type LatLng } from '../geo/types';
import type { SearchArea } from './model';

const CIRCLE_STEPS = 64;

/** Open ring describing the area's shape on a map, or null for list-based areas (stations, wards). */
export function areaOutline(area: SearchArea): LatLng[] | null {
  switch (area.kind) {
    case 'polygon':
      return area.ring;
    case 'radius': {
      const ring = circle([area.center.lng, area.center.lat], area.radiusM / 1000, { steps: CIRCLE_STEPS, units: 'kilometers' })
        .geometry.coordinates[0].slice(0, -1);
      return ring.map(([lng, lat]) => ({ lat: round5(lat), lng: round5(lng) }));
    }
    case 'bounds':
      return [area.sw, { lat: area.sw.lat, lng: area.ne.lng }, area.ne, { lat: area.ne.lat, lng: area.sw.lng }];
    case 'stations':
    case 'wards':
      return null;
  }
}
