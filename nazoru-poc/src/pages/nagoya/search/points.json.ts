import type { APIRoute } from 'astro';
import { parseArea } from '../../../core/area/model';
import { areaOutline } from '../../../core/area/outline';
import { searchListings } from '../../../data/listings.server';
import { gazetteer } from '../../../data/places';

// Every in-area point for the map's clusters, from the same search as the list (so counts agree).
// Fetched by the map widget only once the map loads; never linked, never indexed.
export const GET: APIRoute = ({ url }) => {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex' };
  const parsed = parseArea(url.searchParams, gazetteer);
  if (!parsed.ok || !parsed.area) {
    return new Response(JSON.stringify({ error: parsed.ok ? '検索範囲を指定してください。' : parsed.error }), { status: 400, headers });
  }
  const { total, points } = searchListings(parsed.area, { page: 1, perPage: 1 });
  const outline = areaOutline(parsed.area)?.map(({ lat, lng }) => [lat, lng]) ?? null;
  return new Response(JSON.stringify({ total, outline, points: points.map((p) => [p.id, p.lat, p.lng, p.name]) }), { headers });
};
