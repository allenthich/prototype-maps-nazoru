// Contrast-safe area styling: dim outside the area, then a white casing under a dark stroke,
// so the outline keeps ≥3:1 against any tile colour (WCAG 1.4.11) without relying on hue.
const MASK_MARGIN_DEG = 2;
const INK = '#1a1a1a';
const CASING = '#ffffff';

export interface Handle {
  remove(): void;
}

type LatLng = google.maps.LatLngLiteral;

/** Shoelace with x = lng, y = lat: positive means counterclockwise. */
const isCounterClockwise = (ring: LatLng[]) =>
  ring.reduce((sum, a, i) => {
    const b = ring[(i + 1) % ring.length];
    return sum + (a.lng * b.lat - b.lng * a.lat);
  }, 0) > 0;

const dashIcons = [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, strokeColor: INK, scale: 3 }, offset: '0', repeat: '14px' }];

function strokes(map: google.maps.Map, path: LatLng[], dashed: boolean, zIndex: number) {
  const casing = new google.maps.Polyline({ map, path, strokeColor: CASING, strokeOpacity: 1, strokeWeight: 7, clickable: false, zIndex });
  const line = new google.maps.Polyline({
    map,
    path,
    strokeColor: INK,
    strokeOpacity: dashed ? 0 : 1,
    strokeWeight: 3,
    clickable: false,
    zIndex: zIndex + 1,
    icons: dashed ? dashIcons : [],
  });
  return [casing, line];
}

/** A confirmed area: dimmed surroundings plus a solid two-tone outline. */
export function drawArea(map: google.maps.Map, ring: LatLng[]): Handle {
  const lats = ring.map((p) => p.lat);
  const lngs = ring.map((p) => p.lng);
  const [s, n, w, e] = [Math.min(...lats) - MASK_MARGIN_DEG, Math.max(...lats) + MASK_MARGIN_DEG, Math.min(...lngs) - MASK_MARGIN_DEG, Math.max(...lngs) + MASK_MARGIN_DEG];
  const outer = [{ lat: s, lng: w }, { lat: s, lng: e }, { lat: n, lng: e }, { lat: n, lng: w }]; // counterclockwise
  const hole = isCounterClockwise(ring) ? [...ring].reverse() : ring; // holes wind the other way
  const mask = new google.maps.Polygon({ map, paths: [outer, hole], strokeWeight: 0, fillColor: '#000000', fillOpacity: 0.22, clickable: false, zIndex: 1 });
  const lines = strokes(map, [...ring, ring[0]], false, 2);
  return { remove: () => [mask, ...lines].forEach((o) => o.setMap(null)) };
}

/** A shape still being drawn: dashed two-tone line, no mask. Returns a setter for live updates. */
export function drawDraft(map: google.maps.Map) {
  const lines = strokes(map, [], true, 4);
  return {
    setPath: (path: LatLng[]) => lines.forEach((l) => l.setPath(path)),
    remove: () => lines.forEach((l) => l.setMap(null)),
  };
}
