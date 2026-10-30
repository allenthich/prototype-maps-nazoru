// Japanese text alternative for the active area (WCAG 1.1.1) and the settled-results announcement.
import type { Gazetteer, SearchArea } from './model';
import { polygonAreaKm2 } from './validate';

const list = (names: string[], counter: string) =>
  names.length <= 3 ? names.join('・') : `${names[0]}ほか${names.length - 1}${counter}`;

const radiusLabel = (m: number) => (m >= 1000 ? `${m / 1000}km` : `${m}m`);

const km2Label = (km2: number) => `約${km2 >= 1 ? km2.toFixed(1) : km2.toFixed(2)}km²`;

export function summarizeArea(area: SearchArea, gaz: Gazetteer): string {
  switch (area.kind) {
    case 'stations':
      return list(area.stationIds.map((id) => `${gaz.stations[id]?.name ?? id}駅`), '駅');
    case 'wards':
      return list(area.wardIds.map((id) => gaz.wards[id]?.name ?? id), '区');
    case 'radius': {
      const origin =
        area.origin === 'here' ? '現在地' : area.origin === 'point' ? '選択した地点' : `${gaz.stations[area.origin]?.name ?? area.origin}駅`;
      return `${origin}から半径${radiusLabel(area.radiusM)}`;
    }
    case 'bounds':
      return '地図の表示範囲';
    case 'polygon': {
      const size = km2Label(polygonAreaKm2(area.ring));
      return area.source === 'trace' ? `なぞって描いた範囲（${size}）` : `十字で指定した範囲（頂点${area.ring.length}点・${size}）`;
    }
  }
}

export function announceResults(summary: string, count: number): string {
  return count > 0
    ? `${summary}の物件は${count.toLocaleString('ja-JP')}件です。`
    : `${summary}に該当する物件はありません。`;
}
