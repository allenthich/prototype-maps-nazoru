import { describe, expect, it } from 'vitest';
import { parseArea, serializeArea, type SearchArea } from '../../../src/core/area/model';
import { gaz, square } from './fixtures';

const roundTrip = (area: SearchArea) => parseArea(new URLSearchParams(serializeArea(area)), gaz);

describe('SearchArea URL round-trip', () => {
  const cases: SearchArea[] = [
    { kind: 'stations', stationIds: ['sakae', 'fushimi'] },
    { kind: 'wards', wardIds: ['naka'] },
    { kind: 'radius', center: { lat: 35.17067, lng: 136.90828 }, radiusM: 1000, origin: 'sakae' },
    { kind: 'radius', center: { lat: 35.18, lng: 136.9 }, radiusM: 500, origin: 'here' },
    { kind: 'bounds', sw: { lat: 35.16, lng: 136.89 }, ne: { lat: 35.2, lng: 136.94 } },
    { kind: 'polygon', ring: square, source: 'trace' },
    { kind: 'polygon', ring: square, source: 'crosshair' },
  ];
  for (const area of cases) {
    it(`round-trips ${area.kind}${'source' in area ? `/${area.source}` : ''}${'origin' in area ? `/${area.origin}` : ''}`, () => {
      expect(roundTrip(area)).toEqual({ ok: true, area });
    });
  }

  it('serializes a station-origin radius without coordinates', () => {
    const qs = serializeArea({ kind: 'radius', center: { lat: 1, lng: 2 }, radiusM: 2000, origin: 'ozone' });
    expect(qs).toBe('area=radius&origin=ozone&r=2000');
  });
});

describe('parseArea', () => {
  const parse = (qs: string) => parseArea(new URLSearchParams(qs), gaz);

  it('returns null area when no area param is present', () => {
    expect(parse('')).toEqual({ ok: true, area: null });
  });

  it('resolves a station-origin radius to the station coordinates (no-JS form)', () => {
    expect(parse('area=radius&origin=sakae&r=1000')).toEqual({
      ok: true,
      area: { kind: 'radius', center: { lat: 35.17067, lng: 136.90828 }, radiusM: 1000, origin: 'sakae' },
    });
  });

  it('dedupes and keeps order of selected stations', () => {
    expect(parse('area=stations&station=fushimi&station=sakae&station=fushimi')).toEqual({
      ok: true,
      area: { kind: 'stations', stationIds: ['fushimi', 'sakae'] },
    });
  });

  it.each([
    ['area=stations', '駅を1つ以上選んでください。'],
    ['area=stations&station=unknown', '選択された駅が見つかりません。'],
    ['area=wards', '区を1つ以上選んでください。'],
    ['area=radius&origin=sakae&r=750', '半径は500m・1km・2kmから選んでください。'],
    ['area=radius&origin=nowhere&r=1000', '中心となる駅が見つかりません。'],
    ['area=radius&origin=here&r=1000', '中心の位置情報がありません。'],
    ['area=bounds&bbox=1,2,3', '表示範囲の指定が正しくありません。'],
    ['area=polygon&p=', '範囲の指定が正しくありません。'],
    ['area=circle', '検索範囲の種類が正しくありません。'],
  ])('rejects %s with a Japanese message', (qs, error) => {
    expect(parse(qs)).toEqual({ ok: false, error });
  });

  it('runs polygon validation (too few vertices)', () => {
    const p = serializeArea({ kind: 'polygon', ring: square.slice(0, 2), source: 'trace' });
    expect(parse(p)).toEqual({ ok: false, error: '頂点が足りません。3点以上で範囲を囲んでください。' });
  });
});
