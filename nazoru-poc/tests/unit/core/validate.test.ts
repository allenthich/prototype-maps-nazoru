import { describe, expect, it } from 'vitest';
import { validatePolygon } from '../../../src/core/area/validate';
import { square } from './fixtures';

describe('validatePolygon', () => {
  it('accepts a simple ~1.2 km² square and reports its area', () => {
    const result = validatePolygon(square);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.areaKm2).toBeCloseTo(1.22, 1);
  });

  it('accepts an explicitly closed ring and normalizes it to open', () => {
    const result = validatePolygon([...square, square[0]]);
    expect(result).toMatchObject({ ok: true, ring: square });
  });

  it('rejects fewer than 3 distinct vertices', () => {
    expect(validatePolygon([square[0], square[1], square[0]])).toEqual({
      ok: false,
      error: '頂点が足りません。3点以上で範囲を囲んでください。',
    });
  });

  it('rejects a self-crossing (figure-8) ring', () => {
    const bowtie = [square[0], square[2], square[1], square[3]];
    expect(validatePolygon(bowtie)).toEqual({
      ok: false,
      error: '線が交差しています。線が交わらないように囲み直してください。',
    });
  });

  it('rejects a tiny ring', () => {
    const tiny = square.map(({ lat, lng }) => ({ lat: 35.18 + (lat - 35.18) / 20, lng: 136.9 + (lng - 136.9) / 20 }));
    expect(validatePolygon(tiny)).toEqual({
      ok: false,
      error: '範囲が狭すぎます。もう少し大きく囲んでください。',
    });
  });

  it('rejects a huge ring', () => {
    const huge = square.map(({ lat, lng }) => ({ lat: 35.18 + (lat - 35.18) * 8, lng: 136.9 + (lng - 136.9) * 8 }));
    expect(validatePolygon(huge)).toEqual({
      ok: false,
      error: '範囲が広すぎます。もっと狭く囲むか、駅・エリアから探してください。',
    });
  });

  it('rejects more than 200 vertices', () => {
    const many = Array.from({ length: 201 }, (_, i) => {
      const t = (i / 201) * 2 * Math.PI;
      return { lat: 35.18 + 0.01 * Math.sin(t), lng: 136.9 + 0.01 * Math.cos(t) };
    });
    expect(validatePolygon(many)).toEqual({
      ok: false,
      error: '頂点が多すぎます。もう一度囲み直してください。',
    });
  });
});
