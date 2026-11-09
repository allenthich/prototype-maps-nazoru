import { describe, expect, it } from 'vitest';
import { createPinIndex } from '../../../src/prototype/clusters';
import type { StorePin } from '../../../src/prototype/catalog';

const viewport = { sw: { lat: 35.16, lng: 136.89 }, ne: { lat: 35.18, lng: 136.92 } };
const pins: StorePin[] = [
  { id: 'a', name: 'A', buildingId: 'one', lat: 35.17, lng: 136.9, inResults: true },
  { id: 'b', name: 'B', buildingId: 'one', lat: 35.17, lng: 136.9, inResults: true },
  { id: 'c', name: 'C', buildingId: 'two', lat: 35.17001, lng: 136.90001, inResults: false },
  { id: 'd', name: 'D', buildingId: 'one', lat: 35.17, lng: 136.9, inResults: false },
];

describe('prototype map clustering', () => {
  it('never mixes regular-result and surrounding-store membership', () => {
    const groups = createPinIndex(pins, true).groups(viewport, 12);
    expect(groups.map(g => g.ids.length).reduce((a, b) => a + b, 0)).toBe(4);
    for (const group of groups) expect(new Set(group.ids.map(id => pins.find(p => p.id === id)!.inResults)).size).toBe(1);
  });
  it('keeps identical buildings grouped beyond the proximity clustering zoom', () => {
    const groups = createPinIndex(pins, true).groups(viewport, 22);
    expect(groups.find(g => g.ids.includes('a'))?.ids).toEqual(['a', 'b']);
  });
  it('does not merge nearby buildings when proximity clustering is disabled', () => {
    const groups = createPinIndex(pins, false).groups(viewport, 10);
    expect(groups).toHaveLength(3);
    expect(groups.flatMap(g => g.ids).sort()).toEqual(['a', 'b', 'c', 'd']);
  });
  it('makes separate coincident membership groups individually reachable', () => {
    const groups = createPinIndex(pins, false).groups(viewport, 20).filter(g => g.lng === 136.9);
    expect(new Set(groups.map(g => g.offset)).size).toBe(groups.length);
  });
});
