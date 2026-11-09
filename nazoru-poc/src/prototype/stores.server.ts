import { DISTRICTS, CATEGORIES, type DemoStore } from './catalog';

// Fictional fixture locations and business areas; no real business information is used.
const NAMES = ['月灯り', '花音', 'リュミエール', '紬', 'アトリエ', 'ルーチェ', 'サクラ', 'エトワール', '凛', 'ミモザ', 'オリーブ', 'アリア'];
let cache: DemoStore[] | undefined;

export function getStores(): DemoStore[] {
  return cache ??= DISTRICTS.flatMap((district, di) => Array.from({ length: 11 }, (_, bi) => {
    const angle = bi * 2.39996;
    const spread = bi === 0 ? 0 : 0.0007 + (bi % 4) * 0.00055;
    const lat = Number((district.center.lat + Math.sin(angle) * spread).toFixed(6));
    const lng = Number((district.center.lng + Math.cos(angle) * spread * 1.4).toFixed(6));
    const building = `${district.name}サンプルビル${bi + 1}`;
    // A 36-store building exercises pagination instead of silently truncating dense clusters.
    return Array.from({ length: bi === 0 ? 36 : bi % 3 === 1 ? 1 : 5 }, (_, si) => {
      const n = di * 1000 + bi * 40 + si;
      const category = CATEGORIES[(si + bi) % CATEGORIES.length];
      return {
        id: `store-${di}-${bi}-${si}`, name: `${NAMES[n % NAMES.length]} ${district.name}${bi + 1}${si + 1}`,
        districtId: district.id, buildingId: `${district.id}-${bi}`, lat, lng,
        category: category.id,
        preferences: [si % 3 !== 1 && 'wifi', si % 4 !== 2 && 'terrace', si % 2 === 0 && 'parking'].filter((p): p is string => Boolean(p)),
        price: (category.id === 'cafe' ? 500 : 1000) + ((si + bi) % 6) * 250,
        address: `愛知県名古屋市${district.id === 'meieki' ? '中村区' : '中区'} ${district.name}（架空の住所）`,
        building: `${building} ${si + 1}階`,
        description: '気軽に立ち寄れる架空のお店です。店内の雰囲気や設備を比較して、周辺のお店探しを試せます。',
      };
    });
  }).flat());
}
