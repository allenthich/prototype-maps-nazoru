import { describe, expect, it } from 'vitest';
import type { SearchArea } from '../../../src/core/area/model';
import { announceResults, summarizeArea } from '../../../src/core/area/summary';
import { gaz, square } from './fixtures';

describe('summarizeArea', () => {
  it.each<[SearchArea, string]>([
    [{ kind: 'stations', stationIds: ['sakae'] }, '栄駅'],
    [{ kind: 'stations', stationIds: ['sakae', 'fushimi', 'ozone'] }, '栄駅・伏見駅・大曽根駅'],
    [{ kind: 'stations', stationIds: ['sakae', 'fushimi', 'ozone', 'shiga'] }, '栄駅ほか3駅'],
    [{ kind: 'wards', wardIds: ['naka', 'kita'] }, '中区・北区'],
    [{ kind: 'radius', center: gaz.stations.sakae, radiusM: 1000, origin: 'sakae' }, '栄駅から半径1km'],
    [{ kind: 'radius', center: { lat: 35, lng: 136 }, radiusM: 500, origin: 'here' }, '現在地から半径500m'],
    [{ kind: 'radius', center: { lat: 35, lng: 136 }, radiusM: 2000, origin: 'point' }, '選択した地点から半径2km'],
    [{ kind: 'bounds', sw: { lat: 35.16, lng: 136.89 }, ne: { lat: 35.2, lng: 136.94 } }, '地図の表示範囲'],
    [{ kind: 'polygon', ring: square, source: 'trace' }, 'なぞって描いた範囲（約1.2km²）'],
    [{ kind: 'polygon', ring: square, source: 'crosshair' }, '十字で指定した範囲（頂点4点・約1.2km²）'],
  ])('%o → %s', (area, text) => {
    expect(summarizeArea(area, gaz)).toBe(text);
  });
});

describe('announceResults', () => {
  it('formats the settled count announcement', () => {
    expect(announceResults('栄駅から半径1km', 1234)).toBe('栄駅から半径1kmの物件は1,234件です。');
  });
  it('says when nothing matched', () => {
    expect(announceResults('地図の表示範囲', 0)).toBe('地図の表示範囲に該当する物件はありません。');
  });
});
