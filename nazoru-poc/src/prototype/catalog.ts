import type { LatLng, SearchArea } from '../core/area/model';

export const DISTRICTS = [
  { id: 'nishiki', name: '錦', center: { lat: 35.1739, lng: 136.9047 }, sw: { lat: 35.1700, lng: 136.9000 }, ne: { lat: 35.178, lng: 136.909 } },
  { id: 'sakae', name: '栄', center: { lat: 35.1685, lng: 136.9110 }, sw: { lat: 35.164, lng: 136.906 }, ne: { lat: 35.173, lng: 136.916 } },
  { id: 'meieki', name: '名駅', center: { lat: 35.1700, lng: 136.8840 }, sw: { lat: 35.166, lng: 136.879 }, ne: { lat: 35.174, lng: 136.890 } },
  { id: 'shinsakae', name: '新栄', center: { lat: 35.1710, lng: 136.9203 }, sw: { lat: 35.167, lng: 136.916 }, ne: { lat: 35.175, lng: 136.925 } },
  { id: 'kanayama', name: '金山', center: { lat: 35.1435, lng: 136.9010 }, sw: { lat: 35.140, lng: 136.896 }, ne: { lat: 35.148, lng: 136.906 } },
] as const;

export const CATEGORIES = [
  { id: 'cafe', name: 'カフェ' }, { id: 'restaurant', name: 'レストラン' },
  { id: 'shop', name: '雑貨店' }, { id: 'bookstore', name: '書店' },
] as const;
export const PREFERENCES = [
  { id: 'wifi', name: 'Wi-Fiあり' }, { id: 'terrace', name: 'テラス席あり' }, { id: 'parking', name: '駐車場あり' },
] as const;

export interface DemoStore extends LatLng {
  id: string;
  name: string;
  districtId: string;
  buildingId: string;
  category: string;
  preferences: string[];
  price: number;
  address: string;
  building: string;
  description: string;
}

export type Scope = { kind: 'districts'; ids: string[] } | Extract<SearchArea, { kind: 'bounds' | 'radius' | 'polygon' }>;
export interface Filters { category: string; preferences: string[] }
export interface Viewport { sw: LatLng; ne: LatLng }
export interface StorePin extends LatLng { id: string; name: string; buildingId: string; inResults: boolean }
export interface StorePage { items: DemoStore[]; total: number; page: number; pageCount: number; fitBounds?: Viewport }
export interface PinsResponse { pins: StorePin[]; total: number }

export const districtName = (id: string) => DISTRICTS.find(d => d.id === id)?.name ?? id;
export const categoryName = (id: string) => CATEGORIES.find(g => g.id === id)?.name ?? 'すべてのカテゴリ';
export const preferenceName = (id: string) => PREFERENCES.find(p => p.id === id)?.name ?? id;
