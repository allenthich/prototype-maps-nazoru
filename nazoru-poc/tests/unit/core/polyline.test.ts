import { describe, expect, it } from 'vitest';
import { decodePolyline, encodePolyline } from '../../../src/core/geo/polyline';

describe('encoded polyline', () => {
  it('encodes Google’s reference example', () => {
    const path = [
      { lat: 38.5, lng: -120.2 },
      { lat: 40.7, lng: -120.95 },
      { lat: 43.252, lng: -126.453 },
    ];
    expect(encodePolyline(path)).toBe('_p~iF~ps|U_ulLnnqC_mqNvxq`@');
  });

  it('round-trips coordinates rounded to 5 decimals', () => {
    const path = [
      { lat: 35.181234, lng: 136.906789 },
      { lat: 35.17, lng: 136.91 },
    ];
    expect(decodePolyline(encodePolyline(path))).toEqual([
      { lat: 35.18123, lng: 136.90679 },
      { lat: 35.17, lng: 136.91 },
    ]);
  });

  it('decodes an empty string to an empty path', () => {
    expect(decodePolyline('')).toEqual([]);
  });

  it('throws on malformed input', () => {
    expect(() => decodePolyline('_p~iF~ps|U_')).toThrow();
  });
});
