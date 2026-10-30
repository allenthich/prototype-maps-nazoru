// Central-Nagoya stations and wards for the PoC. Coordinates are approximate (±100 m) and
// ward assignments follow each station's address as best known; verify before any real use.
import type { Gazetteer } from '../core/area/model';

export interface Ward {
  id: string;
  name: string;
  slugJa: string;
}

export interface Station {
  id: string;
  name: string;
  lines: string[];
  wardId: string;
  lat: number;
  lng: number;
}

export const wards: Ward[] = [
  { id: 'naka', name: '中区', slugJa: 'なかく' },
  { id: 'higashi', name: '東区', slugJa: 'ひがしく' },
  { id: 'kita', name: '北区', slugJa: 'きたく' },
  { id: 'nishi', name: '西区', slugJa: 'にしく' },
  { id: 'nakamura', name: '中村区', slugJa: 'なかむらく' },
];

export const stations: Station[] = [
  { id: 'nagoya', name: '名古屋', lines: ['東山線', '桜通線'], wardId: 'nakamura', lat: 35.1709, lng: 136.8815 },
  { id: 'kokusai-center', name: '国際センター', lines: ['桜通線'], wardId: 'nakamura', lat: 35.1735, lng: 136.8888 },
  { id: 'fushimi', name: '伏見', lines: ['東山線', '鶴舞線'], wardId: 'naka', lat: 35.1694, lng: 136.8977 },
  { id: 'marunouchi', name: '丸の内', lines: ['桜通線', '鶴舞線'], wardId: 'naka', lat: 35.1729, lng: 136.8984 },
  { id: 'sakae', name: '栄', lines: ['東山線', '名城線'], wardId: 'naka', lat: 35.1703, lng: 136.9085 },
  { id: 'hisaya-odori', name: '久屋大通', lines: ['名城線', '桜通線'], wardId: 'naka', lat: 35.1746, lng: 136.9082 },
  { id: 'nagoyajo', name: '名古屋城', lines: ['名城線'], wardId: 'naka', lat: 35.1813, lng: 136.9064 },
  { id: 'shinsakae-machi', name: '新栄町', lines: ['東山線'], wardId: 'naka', lat: 35.1704, lng: 136.9199 },
  { id: 'sengencho', name: '浅間町', lines: ['鶴舞線'], wardId: 'nishi', lat: 35.1829, lng: 136.8908 },
  { id: 'takaoka', name: '高岳', lines: ['桜通線'], wardId: 'higashi', lat: 35.1752, lng: 136.9172 },
  { id: 'kurumamichi', name: '車道', lines: ['桜通線'], wardId: 'higashi', lat: 35.1747, lng: 136.931 },
  { id: 'higashi-ote', name: '東大手', lines: ['名鉄瀬戸線'], wardId: 'higashi', lat: 35.1847, lng: 136.9135 },
  { id: 'morishita', name: '森下', lines: ['名鉄瀬戸線'], wardId: 'higashi', lat: 35.1907, lng: 136.9318 },
  { id: 'ozone', name: '大曽根', lines: ['名城線', '名鉄瀬戸線', 'JR中央線'], wardId: 'higashi', lat: 35.191, lng: 136.937 },
  { id: 'shimizu', name: '清水', lines: ['名鉄瀬戸線'], wardId: 'kita', lat: 35.1894, lng: 136.9183 },
  { id: 'amagasaka', name: '尼ケ坂', lines: ['名鉄瀬戸線'], wardId: 'kita', lat: 35.1918, lng: 136.9249 },
  { id: 'meijo-koen', name: '名城公園', lines: ['名城線'], wardId: 'kita', lat: 35.1907, lng: 136.9064 },
  { id: 'kurokawa', name: '黒川', lines: ['名城線'], wardId: 'kita', lat: 35.1975, lng: 136.91 },
  { id: 'shiga-hondori', name: '志賀本通', lines: ['名城線'], wardId: 'kita', lat: 35.2004, lng: 136.9133 },
  { id: 'heian-dori', name: '平安通', lines: ['名城線', '上飯田線'], wardId: 'kita', lat: 35.2029, lng: 136.9255 },
];

export const gazetteer: Gazetteer = {
  stations: Object.fromEntries(stations.map((s) => [s.id, { name: s.name, lat: s.lat, lng: s.lng, wardId: s.wardId }])),
  wards: Object.fromEntries(wards.map((w) => [w.id, { name: w.name }])),
};

export const stationById = (id: string) => stations.find((s) => s.id === id);
export const wardById = (id: string) => wards.find((w) => w.id === id);
