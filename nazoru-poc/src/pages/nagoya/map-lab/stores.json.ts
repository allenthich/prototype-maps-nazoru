import type { APIRoute } from 'astro';
import { getStores } from '../../../prototype/stores.server';
import { fitViewport, matchesFilters, paginate, parseRequest, parseViewport, searchStores, viewportPins } from '../../../prototype/search';

export const GET: APIRoute = ({ url }) => {
  const headers = { 'Content-Type': 'application/json; charset=utf-8', 'X-Robots-Tag': 'noindex', 'Cache-Control': 'no-store' };
  try {
    const { scope, filters, page } = parseRequest(url.searchParams);
    const view = url.searchParams.get('view') ?? 'results';
    const stores = getStores();
    if (view === 'pins') {
      const viewport = parseViewport(url.searchParams.get('viewport') ?? '');
      const pins = viewportPins(stores, viewport, scope, filters);
      return new Response(JSON.stringify({ pins, total: pins.length }), { headers });
    }
    if (view === 'selection') {
      const ids = [...new Set((url.searchParams.get('ids') ?? '').split(','))];
      if (!ids.length || ids.length > stores.length || ids.some(id => !stores.some(s => s.id === id))) throw new Error('店舗の指定が正しくありません。');
      return new Response(JSON.stringify(paginate(stores.filter(s => ids.includes(s.id) && matchesFilters(s, filters)), page)), { headers });
    }
    if (view !== 'results') throw new Error('表示方法の指定が正しくありません。');
    const matches = searchStores(stores, scope, filters);
    return new Response(JSON.stringify({ ...paginate(matches, page), fitBounds: fitViewport(scope, matches) }), { headers });
  } catch (error) {
    return new Response(JSON.stringify({ error: { message: (error as Error).message } }), { status: 400, headers });
  }
};
