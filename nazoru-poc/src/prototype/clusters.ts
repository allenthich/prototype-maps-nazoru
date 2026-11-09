import Supercluster, { type ClusterFeature, type ClusterProperties, type PointFeature } from 'supercluster';
import type { StorePin, Viewport } from './catalog';

export interface PinGroup {
  key: string;
  ids: string[];
  name: string;
  lat: number;
  lng: number;
  inResults: boolean;
  expansionZoom?: number;
  offset: number;
}
interface Building { ids: string[]; name: string; inResults: boolean }

export function createPinIndex(pins: StorePin[], proximity: boolean) {
  const buildings = new Map<string, PointFeature<Building>>();
  for (const pin of pins) {
    const key = `${pin.buildingId}:${pin.inResults}`;
    const existing = buildings.get(key);
    if (existing) existing.properties.ids.push(pin.id);
    else buildings.set(key, { type: 'Feature', geometry: { type: 'Point', coordinates: [pin.lng, pin.lat] }, properties: { ids: [pin.id], name: pin.name, inResults: pin.inResults } });
  }
  // Separate indexes guarantee that result and context stores cannot form a mixed cluster.
  const indexes = [true, false].map(inResults => new Supercluster<Building>({ radius: 100, maxZoom: 19 })
    .load([...buildings.values()].filter(p => p.properties.inResults === inResults)));

  return {
    groups(viewport: Viewport, zoom: number): PinGroup[] {
      const bbox: [number, number, number, number] = [viewport.sw.lng, viewport.sw.lat, viewport.ne.lng, viewport.ne.lat];
      const output: PinGroup[] = [];
      for (const index of indexes) {
        const features = proximity ? index.getClusters(bbox, zoom) : [...buildings.values()].filter(f => {
          const [lng, lat] = f.geometry.coordinates;
          return f.properties.inResults === (index === indexes[0]) && lng >= bbox[0] && lng <= bbox[2] && lat >= bbox[1] && lat <= bbox[3];
        });
        for (const feature of features) {
          const cluster = 'cluster' in feature.properties && feature.properties.cluster ? feature as ClusterFeature<ClusterProperties> : null;
          const leaves = cluster ? index.getLeaves(cluster.properties.cluster_id, Infinity) : [feature as PointFeature<Building>];
          const ids = leaves.flatMap(l => l.properties.ids).sort();
          const [lng, lat] = feature.geometry.coordinates;
          output.push({ key: ids.join('|'), ids, name: leaves[0].properties.name, lat, lng,
            inResults: leaves[0].properties.inResults,
            expansionZoom: cluster ? index.getClusterExpansionZoom(cluster.properties.cluster_id) : undefined, offset: 0 });
        }
      }
      const coincident = new Map<string, PinGroup[]>();
      for (const group of output) {
        const key = `${group.lat.toFixed(6)},${group.lng.toFixed(6)}`;
        coincident.set(key, [...(coincident.get(key) ?? []), group]);
      }
      for (const groups of coincident.values()) groups.forEach((group, i) => { group.offset = (i - (groups.length - 1) / 2) * 42; });
      return output;
    },
  };
}
