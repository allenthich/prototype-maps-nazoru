import type { APIRoute } from 'astro';
import { getListings } from '../data/listings.server';
import { stations, wards } from '../data/places';

// @astrojs/sitemap can't list on-demand routes, so the sitemap is an endpoint.
export const GET: APIRoute = ({ site }) => {
  const paths = [
    '/nagoya/',
    ...wards.map((w) => `/nagoya/ward/${w.id}/`),
    ...stations.map((s) => `/nagoya/station/${s.id}/`),
    ...getListings().map((l) => `/listings/${l.id}/`),
  ];
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((p) => `  <url><loc>${new URL(p, site).href}</loc></url>`).join('\n')}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};
