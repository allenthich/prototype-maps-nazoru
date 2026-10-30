import type { Listing } from '../data/listings.server';

export const SITE_NAME = 'なぞる賃貸サーチ（PoC）';

export interface Crumb {
  name: string;
  href: string;
}

const abs = (path: string, site: URL) => new URL(path, site).href;

export const breadcrumbJsonLd = (crumbs: Crumb[], site: URL) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.name, item: abs(c.href, site) })),
});

export const itemListJsonLd = (listings: Listing[], site: URL, startPosition: number) => ({
  '@context': 'https://schema.org',
  '@type': 'ItemList',
  itemListElement: listings.map((l, i) => ({
    '@type': 'ListItem',
    position: startPosition + i,
    url: abs(`/listings/${l.id}/`, site),
    name: l.name,
  })),
});

export const listingJsonLd = (l: Listing, site: URL, wardName: string) => ({
  '@context': 'https://schema.org',
  '@type': 'RealEstateListing',
  name: l.name,
  url: abs(`/listings/${l.id}/`, site),
  about: {
    '@type': 'Apartment',
    name: l.name,
    floorSize: { '@type': 'QuantitativeValue', value: l.areaM2, unitCode: 'MTK' },
    address: { '@type': 'PostalAddress', addressCountry: 'JP', addressRegion: '愛知県', addressLocality: `名古屋市${wardName}` },
    geo: { '@type': 'GeoCoordinates', latitude: l.lat, longitude: l.lng },
  },
  offers: {
    '@type': 'Offer',
    businessFunction: 'http://purl.org/goodrelations/v1#LeaseOut',
    price: l.rent,
    priceCurrency: 'JPY',
    priceSpecification: { '@type': 'UnitPriceSpecification', price: l.rent, priceCurrency: 'JPY', unitCode: 'MON' },
  },
});

/** Safe JSON for an inline <script type="application/ld+json">. */
export const jsonForScript = (value: unknown) => JSON.stringify(value).replace(/</g, '\\u003c');

/** Page 1 has no query string; later pages are self-canonical with ?page=n. */
export const pagePath = (path: string, page: number) => (page > 1 ? `${path}?page=${page}` : path);
export const pageSuffix = (page: number) => (page > 1 ? `（${page}ページ目）` : '');
