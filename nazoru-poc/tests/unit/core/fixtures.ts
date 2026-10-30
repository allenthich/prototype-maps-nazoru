import type { Gazetteer } from '../../../src/core/area/model';

export const gaz: Gazetteer = {
  stations: {
    sakae: { name: '栄', lat: 35.17067, lng: 136.90828, wardId: 'naka' },
    fushimi: { name: '伏見', lat: 35.16936, lng: 136.89778, wardId: 'naka' },
    ozone: { name: '大曽根', lat: 35.19084, lng: 136.93716, wardId: 'kita' },
    shiga: { name: '志賀本通', lat: 35.19944, lng: 136.91306, wardId: 'kita' },
  },
  wards: {
    naka: { name: '中区' },
    kita: { name: '北区' },
  },
};

// ~1.1 km × 1.1 km square around Nagoya Castle / city hall
export const square = [
  { lat: 35.18, lng: 136.9 },
  { lat: 35.18, lng: 136.912 },
  { lat: 35.19, lng: 136.912 },
  { lat: 35.19, lng: 136.9 },
];
