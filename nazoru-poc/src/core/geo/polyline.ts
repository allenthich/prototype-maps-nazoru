// Google's encoded polyline algorithm (precision 1e-5), used to keep polygon URLs short.
import { round5, type LatLng } from './types';

function encodeValue(value: number): string {
  let v = value < 0 ? ~(value << 1) : value << 1;
  let out = '';
  while (v >= 0x20) {
    out += String.fromCharCode((0x20 | (v & 0x1f)) + 63);
    v >>= 5;
  }
  return out + String.fromCharCode(v + 63);
}

export function encodePolyline(path: LatLng[]): string {
  let out = '';
  let prevLat = 0;
  let prevLng = 0;
  for (const { lat, lng } of path) {
    const e5Lat = Math.round(lat * 1e5);
    const e5Lng = Math.round(lng * 1e5);
    out += encodeValue(e5Lat - prevLat) + encodeValue(e5Lng - prevLng);
    prevLat = e5Lat;
    prevLng = e5Lng;
  }
  return out;
}

export function decodePolyline(encoded: string): LatLng[] {
  const path: LatLng[] = [];
  let i = 0;
  let lat = 0;
  let lng = 0;

  const next = () => {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      if (i >= encoded.length) throw new Error('Malformed polyline: unexpected end');
      b = encoded.charCodeAt(i++) - 63;
      if (b < 0 || b > 63) throw new Error('Malformed polyline: invalid character');
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    return result & 1 ? ~(result >> 1) : result >> 1;
  };

  while (i < encoded.length) {
    lat += next();
    lng += next();
    path.push({ lat: round5(lat / 1e5), lng: round5(lng / 1e5) });
  }
  return path;
}
