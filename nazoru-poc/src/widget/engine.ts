// Loaded on demand by <nazoru-map>: Maps JS, clustering and area rendering.
import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import Supercluster, { type ClusterFeature, type ClusterProperties, type PointFeature } from 'supercluster';
import { serializeArea } from '../core/area/model';
import { announce } from './announce';
import { createCrosshair } from './crosshair';
import type { Mode, ModeContext } from './modes';
import { drawArea, type Handle } from './overlay';

type PointTuple = [id: string, lat: number, lng: number, name: string];
interface PointsResponse {
  total: number;
  outline: [number, number][] | null;
  points: PointTuple[];
}
interface ListingProps {
  id: string;
  name: string;
}

type Feature = ClusterFeature<ClusterProperties> | PointFeature<ListingProps>;
const isCluster = (f: Feature): f is ClusterFeature<ClusterProperties> => 'cluster' in f.properties && f.properties.cluster;

export interface MapHost extends HTMLElement {
  setStatus(text: string): void;
}

export interface MapEngine {
  map: google.maps.Map;
  setArea(query: string, opts?: { fit?: boolean }): Promise<void>;
  action(name: string): void;
  /** Emit an area chosen by a drawing mode (search in place, or navigate on indexable pages). */
  requestArea(query: string): void;
  focusMap(): void;
}

const NAGOYA = { lat: 35.181, lng: 136.906 };
const EMPTY: PointsResponse = { total: 0, outline: null, points: [] };
let optionsSet = false;

const nextIdle = (map: google.maps.Map) => new Promise<void>((resolve) => google.maps.event.addListenerOnce(map, 'idle', () => resolve()));

export async function createEngine(host: MapHost): Promise<MapEngine> {
  host.dataset.state = 'loading';
  host.setStatus('地図を読み込んでいます…');
  const apiKey = host.dataset.apiKey ?? '';
  if (!optionsSet) {
    setOptions({ ...(apiKey ? { key: apiKey } : {}), v: 'weekly', language: 'ja', region: 'JP' });
    optionsSet = true;
  }
  const [{ Map: GoogleMap }, { AdvancedMarkerElement }] = await Promise.all([importLibrary('maps'), importLibrary('marker')]);

  const canvas = host.querySelector<HTMLElement>('[data-map-canvas]')!;
  const map = new GoogleMap(canvas, {
    center: NAGOYA,
    zoom: 14,
    mapId: host.dataset.mapId || 'DEMO_MAP_ID',
    clickableIcons: false,
    streetViewControl: false, // pegman is drag-only (WCAG 2.5.7)
    mapTypeControl: false,
  });
  const pointsUrl = host.dataset.pointsUrl ?? '/nagoya/search/points.json';
  const searchUrl = host.dataset.searchUrl ?? '/nagoya/search/';

  const newIndex = () => new Supercluster<ListingProps>({ radius: 120, maxZoom: 18 }) // radius is in 512px-tile units ≈ 60 screen px;
  let index = newIndex().load([]); // render() can run on 'idle' before points arrive
  let generation = 0; // bumps when the point set changes, so stale cluster ids never match
  let area: Handle | undefined;
  let inView = { places: 0, listings: 0 };
  let markersVisible = true;

  const region = () => canvas.querySelector<HTMLElement>('[role="region"][tabindex]');

  // Markers are keyed so an unchanged cluster keeps its DOM node (and keyboard focus) across re-renders.
  let markers = new Map<string, google.maps.marker.AdvancedMarkerElement>();

  function createMarker(f: Feature) {
    const [lng, lat] = f.geometry.coordinates;
    const position = { lat, lng };
    if (isCluster(f)) {
      const { point_count: count, cluster_id: id } = f.properties;
      const bubble = document.createElement('div');
      bubble.className = 'nz-cluster';
      bubble.setAttribute('aria-hidden', 'true');
      bubble.textContent = count.toLocaleString('ja-JP');
      const marker = new AdvancedMarkerElement({ map, position, content: bubble, title: `${count}件の物件。選択すると拡大します`, gmpClickable: true });
      marker.addEventListener('gmp-click', () => zoomInto(id, position));
      return marker;
    }
    const { id, name } = f.properties;
    const marker = new AdvancedMarkerElement({ map, position, title: `${name}（物件詳細へ）`, gmpClickable: true });
    marker.addEventListener('gmp-click', () => location.assign(`/listings/${id}/`));
    return marker;
  }

  function render() {
    const bounds = map.getBounds();
    if (!bounds) return;
    const zoom = Math.round(map.getZoom() ?? 14);
    host.dataset.zoom = String(zoom);
    if (!markersVisible) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const next = new Map<string, google.maps.marker.AdvancedMarkerElement>();
    inView = { places: 0, listings: 0 };
    for (const f of index.getClusters([sw.lng(), sw.lat(), ne.lng(), ne.lat()], zoom) as Feature[]) {
      const key = isCluster(f) ? `c${generation}:${zoom}:${f.properties.cluster_id}` : `p${generation}:${f.properties.id}`;
      next.set(key, markers.get(key) ?? createMarker(f));
      inView.places += 1;
      inView.listings += isCluster(f) ? f.properties.point_count : 1;
    }
    for (const [key, marker] of markers) if (!next.has(key)) marker.map = null;
    markers = next;
  }

  function focusMap() {
    region()?.focus();
  }

  function zoomInto(clusterId: number, center: google.maps.LatLngLiteral) {
    const zoom = Math.min(index.getClusterExpansionZoom(clusterId), 20);
    void nextIdle(map).then(() => {
      focusMap(); // the activated marker is gone; land on the map itself
      announce(host, `拡大しました。表示範囲に${inView.listings.toLocaleString('ja-JP')}件（${inView.places}か所）の物件があります。`);
    });
    map.moveCamera({ center, zoom }); // instant, no animation
  }

  async function setArea(query: string, { fit = true } = {}) {
    host.dataset.area = query;
    const data: PointsResponse = query ? await fetch(`${pointsUrl}?${query}`).then((r) => (r.ok ? r.json() : EMPTY)) : EMPTY;
    generation += 1;
    index = newIndex().load(data.points.map(([id, lat, lng, name]) => ({ type: 'Feature', properties: { id, name }, geometry: { type: 'Point', coordinates: [lng, lat] } })));
    area?.remove();
    const ring = data.outline?.map(([lat, lng]) => ({ lat, lng })) ?? null;
    area = ring ? drawArea(map, ring) : undefined;
    if (fit) {
      const b = new google.maps.LatLngBounds();
      for (const p of ring ?? data.points.map(([, lat, lng]) => ({ lat, lng }))) b.extend(p);
      if (!b.isEmpty()) {
        const settled = Promise.race([nextIdle(map), new Promise((r) => setTimeout(r, 1500))]); // no idle if the view is unchanged
        map.fitBounds(b, 24);
        render();
        await settled;
      }
    }
    render();
  }

  function requestArea(query: string) {
    if (host.dataset.mode === 'navigate') location.assign(`${searchUrl}?${query}`);
    else host.dispatchEvent(new CustomEvent('area-change', { bubbles: true, detail: { query } }));
  }

  function setMarkersVisible(visible: boolean) {
    markersVisible = visible;
    if (visible) return render();
    for (const marker of markers.values()) marker.map = null;
    markers = new Map();
  }

  function showError(text: string) {
    const el = host.querySelector('[data-map-error]');
    if (el) el.textContent = text;
  }

  const modes: Mode[] = [];
  const ctx: ModeContext = {
    host,
    map,
    announce: (text) => announce(host, text),
    showError,
    setMarkersVisible,
    requestArea: (query) => requestArea(query),
    focusMap: () => focusMap(),
    stopOtherModes: (except) => modes.filter((m) => m !== except && m.active).forEach((m) => m.cancel({ silent: true })),
  };
  modes.push(createCrosshair(ctx));
  host.addEventListener('keydown', (event) => modes.forEach((m) => m.onKeydown(event)));

  function action(name: string) {
    if (modes.some((m) => m.action(name))) return;
    if (name === 'search-bounds') {
      modes.forEach((m) => m.cancel({ silent: true }));
      const b = map.getBounds();
      if (!b) return;
      const sw = b.getSouthWest();
      const ne = b.getNorthEast();
      requestArea(serializeArea({ kind: 'bounds', sw: { lat: sw.lat(), lng: sw.lng() }, ne: { lat: ne.lat(), lng: ne.lng() } }));
    }
  }

  map.addListener('idle', render);
  await nextIdle(map);
  region()?.setAttribute('aria-describedby', 'map-help');
  await setArea(host.dataset.area ?? '');
  host.setStatus(apiKey ? '' : '開発用モード（APIキーなし）のため、地図に透かしが表示されます。');
  host.dataset.state = 'ready';
  return { map, setArea, action, requestArea, focusMap };
}
