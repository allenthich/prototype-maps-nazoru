import { importLibrary, setOptions } from '@googlemaps/js-api-loader';
import { areaOutline } from '../core/area/outline';
import { createCrosshair } from '../widget/crosshair';
import { createTrace } from '../widget/trace';
import type { Mode, ModeContext } from '../widget/modes';
import { DISTRICTS, type Scope, type StorePin, type Viewport } from './catalog';
import type { LabConfig } from './config';
import { createPinIndex, type PinGroup } from './clusters';

export interface Camera { lat: number; lng: number; zoom: number }
interface Callbacks {
  onMove(): void;
  onIdle(viewport: Viewport, camera: Camera, programmatic: boolean): void;
  onSelect(group: PinGroup): void;
  onArea(query: string): void;
  announce(message: string): void;
}

export function parseCamera(raw: string | null): Camera | null {
  if (!raw) return null;
  const values = raw.split(',').map(Number);
  if (values.length !== 3 || values.some(n => !Number.isFinite(n))) return null;
  const [lat, lng, zoom] = values;
  return Math.abs(lat) <= 85 && Math.abs(lng) <= 180 && zoom >= 2 && zoom <= 22 ? { lat, lng, zoom } : null;
}

export async function createLabMap(host: HTMLElement, initialConfig: LabConfig, callbacks: Callbacks) {
  setOptions({ ...(host.dataset.apiKey ? { key: host.dataset.apiKey } : {}), v: 'weekly', language: 'ja', region: 'JP' });
  const [{ Map: GoogleMap }, { AdvancedMarkerElement }] = await Promise.all([importLibrary('maps'), importLibrary('marker')]);
  const canvas = host.querySelector<HTMLElement>('[data-map-canvas]')!;
  const map = new GoogleMap(canvas, { center: DISTRICTS[0].center, zoom: 16, mapId: host.dataset.mapId || 'DEMO_MAP_ID',
    clickableIcons: false, streetViewControl: false, mapTypeControl: false, fullscreenControl: false, gestureHandling: 'greedy' });
  let config = initialConfig;
  let pins: StorePin[] = [];
  let index = createPinIndex([], true);
  let selected = new Set<string>();
  let visible = true;
  let programmatic = true;
  let groups = new Map<string, PinGroup>();
  const markers = new Map<string, google.maps.marker.AdvancedMarkerElement>();
  let outlines: google.maps.Polygon[] = [];

  const viewport = (): Viewport | null => {
    const bounds = map.getBounds();
    return bounds ? { sw: bounds.getSouthWest().toJSON(), ne: bounds.getNorthEast().toJSON() } : null;
  };
  const camera = (): Camera => ({ ...map.getCenter()!.toJSON(), zoom: map.getZoom() ?? 16 });
  const focusMap = () => canvas.querySelector<HTMLElement>('[role="region"][tabindex]')?.focus();

  function activate(key: string) {
    const group = groups.get(key);
    if (!group) return;
    if (group.ids.length > 1 && config.clusterAction === 'zoom') {
      const nextZoom = Math.min(22, Math.max((map.getZoom() ?? 16) + 2, group.expansionZoom ?? 0));
      if ((map.getZoom() ?? 16) >= 22) callbacks.announce('同じ場所に複数のお店があります。「クラスタタップ」を店舗表示に切り替えると確認できます。');
      else map.moveCamera({ center: { lat: group.lat, lng: group.lng }, zoom: nextZoom });
      focusMap();
    } else if (group.ids.length > 1 || config.pinAction !== 'none') callbacks.onSelect(group);
  }

  function render() {
    const bounds = viewport();
    if (!bounds) return;
    groups = new Map((visible ? index.groups(bounds, Math.floor(map.getZoom() ?? 16)) : []).map(g => [g.key, g]));
    for (const [key, marker] of markers) if (!groups.has(key)) { marker.map = null; markers.delete(key); }
    for (const [key, group] of groups) {
      let marker = markers.get(key);
      if (!marker) {
        const content = document.createElement('div');
        content.className = 'lab-pin'; content.dataset.labPin = ''; content.setAttribute('aria-hidden', 'true');
        const offset = document.createElement('div'); offset.append(content);
        marker = new AdvancedMarkerElement({ map, position: { lat: group.lat, lng: group.lng }, content: offset, gmpClickable: true });
        marker.addEventListener('gmp-click', () => activate(key));
        markers.set(key, marker);
      }
      const content = marker.querySelector<HTMLElement>('[data-lab-pin]')!;
      const isSelected = group.ids.some(id => selected.has(id));
      content.dataset.state = isSelected ? 'selected' : group.inResults ? 'result' : 'context';
      content.dataset.count = String(group.ids.length);
      content.textContent = group.ids.length > 1 ? String(group.ids.length) : '';
      content.parentElement!.style.transform = `translateX(${group.offset}px)`;
      marker.position = { lat: group.lat, lng: group.lng };
      marker.title = `${group.inResults ? '一覧の店舗' : '周辺の店舗'}：${group.ids.length > 1 ? `${group.ids.length}店舗` : group.name}。${group.ids.length > 1 && config.clusterAction === 'zoom' ? 'タップして拡大' : config.pinAction === 'none' && group.ids.length === 1 ? '位置を表示' : 'タップして店舗情報を表示'}`;
      marker.gmpClickable = group.ids.length > 1 || config.pinAction !== 'none';
      content.style.cursor = marker.gmpClickable ? 'pointer' : 'default';
      marker.zIndex = isSelected ? 1000 : group.inResults ? 100 : 1;
    }
    host.dataset.pinCount = String([...groups.values()].reduce((n, g) => n + g.ids.length, 0));
  }

  const reindex = () => { index = createPinIndex(pins.filter(p => config.showContext || p.inResults), config.clustering === 'proximity'); render(); };
  class Projector extends google.maps.OverlayView { onAdd() {} draw() {} onRemove() {} }
  const projector = new Projector(); projector.setMap(map);
  const modes: Mode[] = [];
  const ctx: ModeContext = {
    host, map, announce: callbacks.announce,
    showError: text => { host.querySelector('[data-map-error]')!.textContent = text; },
    setMarkersVisible: value => { visible = value; render(); },
    requestArea: callbacks.onArea, focusMap,
    toLatLng: (x, y) => projector.getProjection().fromContainerPixelToLatLng(new google.maps.Point(x, y))!.toJSON(),
    setGestures: value => map.setOptions({ gestureHandling: value ?? 'greedy' }),
    stopOtherModes: except => modes.filter(m => m !== except && m.active).forEach(m => m.cancel({ silent: true })),
  };
  modes.push(createCrosshair(ctx), createTrace(ctx));
  host.addEventListener('keydown', event => modes.forEach(m => m.onKeydown(event)));
  map.addListener('bounds_changed', callbacks.onMove);
  map.addListener('idle', () => {
    render();
    const bounds = viewport();
    if (bounds && !modes.some(m => m.active)) callbacks.onIdle(bounds, camera(), programmatic);
    programmatic = false;
  });

  async function move(operation: () => void) {
    programmatic = true;
    await new Promise<void>(resolve => {
      const listener = map.addListener('idle', () => { clearTimeout(timeout); listener.remove(); resolve(); });
      const timeout = setTimeout(() => { listener.remove(); resolve(); }, 1200);
      operation();
    });
  }

  return {
    map, viewport, camera, render, focusMap,
    cancelDrawing: () => modes.forEach(m => m.cancel({ silent: true })),
    action: (name: string) => { if (config.trace) modes.some(m => m.action(name)); },
    setPins: (next: StorePin[]) => { pins = next; reindex(); },
    select: (ids: string[]) => { selected = new Set(ids); render(); },
    setConfig: (next: LabConfig) => { config = next; if (!config.trace) modes.forEach(m => m.cancel({ silent: true })); reindex(); },
    restore: (value: Camera) => move(() => map.moveCamera({ center: { lat: value.lat, lng: value.lng }, zoom: value.zoom })),
    fit: (bounds: Viewport) => move(() => map.fitBounds({ south: bounds.sw.lat, west: bounds.sw.lng, north: bounds.ne.lat, east: bounds.ne.lng }, { top: 80, bottom: 35, left: 35, right: 35 })),
    setScope: (scope: Scope) => {
      outlines.forEach(o => o.setMap(null));
      const rings = scope.kind === 'districts' ? DISTRICTS.filter(d => scope.ids.includes(d.id)).map(d => [d.sw, { lat: d.ne.lat, lng: d.sw.lng }, d.ne, { lat: d.sw.lat, lng: d.ne.lng }]) : [areaOutline(scope) ?? []];
      outlines = rings.map(path => new google.maps.Polygon({ map, paths: path, strokeColor: '#8f153c', strokeWeight: 2, strokeOpacity: .85, fillColor: '#bc2857', fillOpacity: .025, clickable: false }));
    },
    restoreSelectionFocus: (ids: string[]) => {
      const key = [...groups.values()].find(g => g.ids.some(id => ids.includes(id)))?.key;
      const marker = key ? markers.get(key) : null;
      if (marker) (marker as unknown as HTMLElement).focus(); else focusMap();
    },
  };
}

export type LabMap = Awaited<ReturnType<typeof createLabMap>>;
