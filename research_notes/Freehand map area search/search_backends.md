# Freehand map area search: getting results inside a drawn polygon (backend/query side)

Scope: once the user has traced a closed shape, how do you return only results inside it, from Google Places or from your own dataset? Covers limits, pricing, ToS and polygon query support. Research date 2026-10-29. Verification status: the Google pages (Text Search, Nearby Search, Search Along Route, pricing, Places Aggregate overview and billing, Places policies), Algolia insidePolygon, the Elasticsearch geo_polygon deprecation, MongoDB $geoWithin, Firestore geoqueries, Typesense geosearch and the Meilisearch geosearch pages were all fetched in this session. Items marked "(canonical doc, not re-fetched)" come from well-established official docs that were not re-opened this session.

## 1. Places API (New): which shapes do Text Search and Nearby Search accept, what are the limits, and does any Google API take an arbitrary polygon?

### Takeaway
Neither Places search endpoint takes a polygon. Text Search (New) can restrict only to a rectangle, or bias toward a circle or rectangle. It returns 20 results per page and 60 in total. Nearby Search (New) restricts only to a circle of up to 50 km and returns at most 20 results, with no pagination. Search Along Route takes an encoded polyline, but it biases results toward a route corridor and does not clip to an area. The one Google API that accepts an arbitrary polygon is the **Places Aggregate API** (`customArea`). It returns a **count** of matching places, plus Place IDs when the count is 100 or lower. That maps closely onto the "210 / 349" count badges in the target app.

### Cited Findings
**Text Search (New)**
- `locationBias` accepts a **circle** (center plus radius) or a **rectangular viewport** (low/high corners). Polygons are not mentioned. Circle radius "must be between 0.0 and 50000.0, inclusive." Results can fall outside the bias area, and the bias is overridden when the query text contains an explicit location (e.g. "Market in Barcelona"). — [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- `locationRestriction` accepts **only a rectangular viewport**. It applies to categorical queries such as "Restaurants in New York", and results outside the area are excluded. "You can specify `locationRestriction` or `locationBias`, but not both." If both are omitted, the API biases by IP. — [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- `pageSize`: "between 1 and 20" results per page. Values above 20 are capped at 20. `maxResultCount` is deprecated, and `pageSize` wins if both are set. — [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- "Text Search (New) returns a maximum of 60 results across all pages, although this limit is subject to change." To paginate, pass `nextPageToken` back as `pageToken`. All other parameters must match the previous request, or the API returns `INVALID_ARGUMENT`. — [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)
- `includedType` takes only **one** Table A type, and `strictTypeFiltering` forces type filtering. `rankPreference` is RELEVANCE (default) or DISTANCE for categorical queries. — [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)

**Nearby Search (New)**
- `locationRestriction` is documented only as a **circle**: "The region to search specified as a circle, defined by center point and radius in meters." Radius is between 0.0 and 50000.0 inclusive. The default is 0.0, so every request must set a radius. — [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- `maxResultCount` "Must be between 1 and 20 (default) inclusive." The page documents **no next-page token**, so the hard cap is 20 results per request. — [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- `rankPreference` is POPULARITY (default) or DISTANCE. `includedTypes`, `excludedTypes` and their primary-type variants accept up to 50 types each. With no type parameters, the search returns all types in the area. — [Nearby Search (New)](https://developers.google.com/maps/documentation/places/web-service/nearby-search)

**Search Along Route**
- This is a Text Search (New) feature. You pass `searchAlongRouteParameters.polyline.encodedPolyline`, which can be a Routes API polyline or one you encode yourself with the Encoded Polyline Algorithm. It "biases results toward the route." By default it searches "along the entire route from the origin to the destination as defined by the polyline." `routingParameters.origin` lets you search only part of the route. — [Search along route](https://developers.google.com/maps/documentation/places/web-service/search-along-route)
- Constraints: it "only supports an encoded polyline". Because results are limited to places needing only a small detour, it "may not return any results" when the origin and destination are the same or close together. A closed freehand loop therefore fits poorly. — [Search along route](https://developers.google.com/maps/documentation/places/web-service/search-along-route)
- `routingSummaries` (detour time and distance per result) can be requested in the field mask, for Text Search and Nearby Search only. — [Text Search (New)](https://developers.google.com/maps/documentation/places/web-service/text-search)

**Places Aggregate API (formerly "Area Insights", RPC package `google.maps.areainsights.v1`)**
- "The Places Aggregate API is a service that provides insights about places within a specified area based on criteria such as location, type, operating status, price level, and user ratings." You can "Define the area of interest using circles, regions, or custom polygons." — [Places Aggregate API overview](https://developers.google.com/maps/documentation/places-aggregate/overview)
- Insight types: `INSIGHT_COUNT` returns the number of matching places. `INSIGHT_PLACES` returns Place IDs. "Place IDs are returned only if the `count` is 100 or lower." Filters cover place types, operating status, price levels and ratings. — [Places Aggregate API overview](https://developers.google.com/maps/documentation/places-aggregate/overview)
- `customArea` polygon format: "we only support one counterclockwise exterior ring", and "The coordinates form a closed loop and define a filled region. The first and last coordinates are equivalent." Endpoint: `areainsights.googleapis.com/v1:computeInsights`. — [RPC reference google.maps.areainsights.v1](https://developers.google.com/maps/documentation/places-aggregate/reference/rpc/google.maps.areainsights.v1)
- Billing: one SKU ("Places Aggregate API", **Pro** category, pay-as-you-go). The usage page does not list a price, and the "count" and "places" insights do not get separate SKUs. Quota is **1,200 QPM**, with no daily maximum. — [Places Aggregate usage and billing](https://developers.google.com/maps/documentation/places-aggregate/usage-and-billing)

### Inferences
- To give a freehand polygon to Google directly, call **Places Aggregate `computeInsights` with `customArea`**. Simplify the traced path first, force counterclockwise winding, and close the ring. `INSIGHT_COUNT` gives the badge number. When count is 100 or lower, `INSIGHT_PLACES` gives Place IDs, which then need Place Details calls (separately billed) to get name and location for markers. Above 100, you would split the polygon into smaller sub-polygons to get IDs.
- Search Along Route does not suit a closed lasso. It could serve a deliberately drawn corridor (an open stroke along a street or rail line), but it ranks by detour and returns at most Text Search's 60 results.
- A drawn polygon therefore needs: (a) the polygon's bounding rectangle as Text Search `locationRestriction`; or (b) one or more circles (radius 50 km or less) covering the polygon for Nearby Search; then (c) a point-in-polygon filter on the results.

### Gaps
- No published vertex limit, area limit or self-intersection behaviour was found for Places Aggregate `customArea`. The custom-area guide URL returned 404, and the RPC reference states only "one counterclockwise exterior ring", closed.
- No Places Aggregate price was found on the usage page (it links out to the global price list). Its free cap was not confirmed either: Pro-category SKUs normally get 5,000 free events, but the Aggregate page says nothing about it.
- GA or preview status of Places Aggregate in 2026, and its data coverage for Japan, were not confirmed.
- The maximum route length for Search Along Route, and whether it can be combined with `locationBias`/`locationRestriction`, are not documented on the page.

## 2. Standard workaround (bounding box or covering circles, then point-in-polygon), request counts for tiling, and cost under 2025+ pricing

### Takeaway
The usual pattern is: compute the polygon's bounding box, tile it into rectangles (Text Search) or circles (Nearby Search) small enough that each tile returns fewer results than the cap, then keep only the results inside the polygon. Because of the caps (20 per Nearby request, 60 per Text query over 3 pages), a dense area needs many requests. At $32 per 1,000 Pro requests, beyond 5,000 free per month per SKU, one lasso over a dense city area can cost dollars. Google's free monthly caps per SKU replaced the $200 credit on 2025-03-01.

### Cited Findings
**Point-in-polygon helpers (canonical docs, not re-fetched)**
- JS Maps API: `google.maps.geometry.poly.containsLocation(point, polygon)` (needs the `geometry` library) — [Maps JS geometry reference](https://developers.google.com/maps/documentation/javascript/reference/geometry#poly.containsLocation)
- Turf.js: `booleanPointInPolygon(point, polygon)` — [Turf booleanPointInPolygon](https://turfjs.org/docs/api/booleanPointInPolygon); for path reduction, `simplify` (Ramer–Douglas–Peucker, `tolerance`, `highQuality`) — [Turf simplify](https://turfjs.org/docs/api/simplify)
- Android: `PolyUtil.containsLocation(point, polygon, geodesic)` in android-maps-utils — [android-maps-utils](https://github.com/googlemaps/android-maps-utils)
- iOS: `GMSGeometryContainsLocation(point, path, geodesic)` — [Maps SDK for iOS GMSGeometryUtils](https://developers.google.com/maps/documentation/ios-sdk/reference/objc/Functions)

**Pricing (Places API New, USD per 1,000 billable events, monthly)** — [Google Maps Platform pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

| SKU | Free cap per month | Cap to 100k | 100k–500k | 500k–1M | 1M–5M | 5M+ |
|---|---|---|---|---|---|---|
| Text Search Essentials (IDs Only) | Unlimited | – | – | – | – | – |
| Text Search Pro | 5,000 | $32.00 | $25.60 | $19.20 | $9.60 | $2.40 |
| Text Search Enterprise | 1,000 | $35.00 | $28.00 | $21.00 | $10.50 | $2.63 |
| Text Search Enterprise + Atmosphere | 1,000 | $40.00 | $32.00 | $24.00 | $12.00 | $3.40 |
| Nearby Search Pro | 5,000 | $32.00 | $25.60 | $19.20 | $9.60 | $2.40 |
| Nearby Search Enterprise | 1,000 | $35.00 | $28.00 | $21.00 | $10.50 | $2.63 |
| Nearby Search Enterprise + Atmosphere | 1,000 | $40.00 | $32.00 | $24.00 | $12.00 | $3.40 |
| Place Details Essentials | 10,000 | $5.00 | $4.00 | $3.00 | $1.50 | $0.38 |

- On 2025-03-01, Google replaced the $200 monthly credit with a **free usage threshold per Core Services SKU**: 10,000 free events per month for Essentials, 5,000 for Pro and 1,000 for Enterprise (Map Tiles 2D and Street View tiles get 100,000). The change also expanded volume discounts and moved some services to Legacy. — [March 2025 changes](https://developers.google.com/maps/billing-and-pricing/march-2025); [Billing FAQ](https://developers.google.com/maps/billing-and-pricing/faq)
- Nearby Search has no Essentials tier and Text Search's Essentials tier is "IDs Only". Any request that returns more than IDs is therefore billed at Pro or higher. — [Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)

### Inferences
- **Request math (my estimate, not from Google):**
  - Nearby Search is capped at 20 results with no pagination. Getting every POI of a type in a polygon means every covering circle must hold fewer than 20 matches; if a tile returns exactly 20, subdivide it (quadtree recursion).
  - Text Search with a rectangle can reach 60 results via 3 page requests. Each page is a separate HTTP request with the same parameters, and presumably each is billed. Saturated tiles again need subdivision.
  - Example: a lasso over dense central Tokyo containing ~350 matching POIs needs at least 18 Nearby requests at perfect packing. With uneven density and over-coverage (circles overlap and spill outside the polygon), 30–80+ requests is plausible.
- **Cost:** at the first paid Pro tier (requests 5,001–100,000 in a month), each request costs $0.032. Fifty requests per lasso is about $1.60 per search. Once 5,000 free requests are spent, 1,000 searches a month would cost about $1,600. Place Details for markers adds $5 per 1,000 beyond 10k free (Essentials fields only).
- **Cheaper Google patterns:** (1) a Text Search Essentials (IDs Only) sweep is free and unlimited, but you then need Place Details for location. Essentials is $5 per 1,000 beyond 10k free, and Place IDs can be stored indefinitely (see section 3). (2) Places Aggregate `INSIGHT_COUNT` with the polygon gives counts in one request each, so badges can come from this and markers be fetched lazily. (3) Show a capped "top 20/60 by relevance" list with a "zoom in for more" message instead of exhaustive results. This is the common product compromise.
- **Simplify the drawn path before anything.** A finger trace produces hundreds of points. Run Douglas–Peucker (Turf `simplify` / PostGIS `ST_SimplifyPreserveTopology`) to tens of vertices before point-in-polygon checks or before sending to Places Aggregate, Algolia or Typesense. Close the ring, and repair self-intersections (lasso traces often cross themselves), for example with PostGIS `ST_MakeValid` ([doc](https://postgis.net/docs/ST_MakeValid.html), canonical, not re-fetched) or Turf `unkinkPolygon` ([doc](https://turfjs.org/docs/api/unkinkPolygon), canonical, not re-fetched).

### Gaps
- I did not find an official statement that each `pageToken` request is billed as a separate Text Search event. It is very likely, since every page is a distinct request, but this was not confirmed on the pricing page.
- The field-to-SKU mapping (which fields push Text Search from IDs Only to Pro or Enterprise, e.g. `places.location`) was not re-fetched. See the Places "data fields / SKU" docs.
- Japan or India-specific price lists were not checked. India has a separate price list per the Aggregate billing page.

## 3. Google Maps Platform ToS and Places policies: caching, map display, attribution, mixing with non-Google maps

### Takeaway
Places content must not be pre-fetched, cached or stored beyond narrow exceptions. **Place IDs can be stored indefinitely.** Places results shown on a map must be on a **Google map**, with the Google Maps logo and any third-party attributions; photos and reviews need author attribution. The practical consequence: the backend can keep Place IDs, but it cannot build its own POI database from Places results to run PostGIS/Elasticsearch polygon queries on. Polygon queries over your own index are only allowed for data you own or license.

### Cited Findings
- "You must not pre-fetch, cache, or store Places API content beyond the allowed exceptions." Place IDs are exempt: "You can therefore store place ID values indefinitely." — [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- "Places API results displayed on a map must be shown on a Google Map, with proper attribution including the Google logo and third-party data providers, if applicable." — [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- "When displaying Places API data without a Google Map, you must include the Google logo, adhering to the provided style guidelines and attribution requirements." The Google Maps logo should be used whenever possible ("Google Maps" text if space is limited), at a minimum height of 16dp and a maximum of 19dp. — [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- "When Google provides third-party attribution, only including 'Google Maps' or the Google logo is not proper attribution." "You must always credit the author when displaying photos or reviews" (author avatar, name, profile link). Users must be able to reach the source content via `googleMapsUri`. — [Places API policies](https://developers.google.com/maps/documentation/places/web-service/policies)

### Inferences
- If the app shows Google POIs alongside its own listings on one map, the map must be a Google map. Rendering Places results on a Mapbox, MapLibre or OSM base map is not allowed under the policy above.
- An own-data backend (property listings) has no such restriction. Mixing in Google POIs is what brings in the Google-map, attribution and caching obligations.
- Building a "Places mirror" in PostGIS for polygon queries would violate the caching rule. The compliant hybrid is to store **Place IDs only**, plus your own derived or owned attributes, and re-fetch details at display time.

### Gaps
- The main [Google Maps Platform Terms](https://cloud.google.com/maps-platform/terms) and the [Service Specific Terms](https://cloud.google.com/maps-platform/terms/maps-service-terms) came back truncated, so I could not quote:
  - the "No Use With Non-Google Maps" clause (commonly cited as §3.2.3(e) of the main terms);
  - the Places allowance for temporarily caching latitude/longitude for up to 30 consecutive calendar days.

  Both are widely reported but **not verified this session**. The report writer should present them as "reported, verify in current terms".
- Specific terms for Places Aggregate output (e.g., whether counts can be stored or displayed without a Google map) were not found.

## 4. Own-data backends with native polygon queries

### Takeaway
Your own data (property listings) gets true polygon filtering from every major geo-capable store except Firestore. PostGIS (also on Supabase), MongoDB, Elasticsearch/OpenSearch, Algolia, Typesense and Meilisearch (since v1.22.0, Sept 2025) all support it. Firestore needs geohash range queries over a covering circle or box, then client-side point-in-polygon. Watch coordinate order, which differs by system: GeoJSON/Mongo/PostGIS use `lng,lat`, while Algolia, Typesense and Meilisearch use `lat,lng`. Also watch winding rules and vertex caps.

### Cited Findings
**MongoDB**
- `$geoWithin: { $geometry: { type: "Polygon" | "MultiPolygon", coordinates: [...] } }`. "`$geoWithin` does not require a geospatial index. However, a geospatial index will improve query performance. Both 2dsphere and 2d geospatial indexes support `$geoWithin`." — [MongoDB $geoWithin](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/)
- With the default CRS, polygons larger than a hemisphere query the complementary geometry. The custom CRS `urn:x-mongodb:crs:strictwinding:EPSG:4326` "uses a counter-clockwise winding order" and supports "big polygons" of a hemisphere or more. — [MongoDB $geoWithin](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/)
- "The `$geoWithin` operator does not return sorted results", which makes it faster than `$near`/`$nearSphere`. Coordinates are in "longitude, latitude" order. Legacy planar shape operators are `$box`, `$polygon`, `$center` and `$centerSphere`. — [MongoDB $geoWithin](https://www.mongodb.com/docs/manual/reference/operator/query/geoWithin/)

**Elasticsearch / OpenSearch**
- The `geo_polygon` query was "Deprecated in 7.12". The docs say "Use Geoshape instead where polygons are defined in GeoJSON or Well-Known Text (WKT)." — [Elasticsearch geo_polygon query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-polygon-query)
- The `geo_shape` query works against both `geo_shape` and `geo_point` fields, with relations `intersects` (default), `within`, `disjoint` and `contains`. `geo_bounding_box` and `geo_distance` cover box and radius. — [Elasticsearch geo_shape query](https://www.elastic.co/docs/reference/query-languages/query-dsl/query-dsl-geo-shape-query) (canonical, not re-fetched)
- OpenSearch forked from Elasticsearch 7.10.2, before the 7.12 deprecation, and still documents a `geo_polygon` query alongside `geo_shape`. — [OpenSearch geopolygon query](https://docs.opensearch.org/latest/query-dsl/geo-and-xy/geopolygon/) (canonical, not re-fetched)

**Algolia**
- `insidePolygon`: a flat list `[lat1, lng1, lat2, lng2, …]` for one polygon, or a list of lists for several. "Minimum of 3 coordinate pairs (6 values) per polygon." "Up to 10,000 coordinate pairs supported per request." — [Algolia insidePolygon](https://www.algolia.com/doc/api-reference/api-parameters/insidePolygon/)
- If `insideBoundingBox` is also set, "only `insideBoundingBox` is applied." `aroundLatLng`/`aroundLatLngViaIP` "will be ignored if used with `insidePolygon`." To get all records in the polygon, send an empty query `""`. "Avoid polygons that cross the 180th meridian." — [Algolia insidePolygon](https://www.algolia.com/doc/api-reference/api-parameters/insidePolygon/)

**Typesense**
- Polygon filter: `filter_by=location:(lat1, lng1, lat2, lng2, ...)`. Vertices must be in "proper CCW or CW order to form a valid polygon", and incorrect ordering causes an error. Radius filter: `location:(48.906, 2.343, 5.1 km)`. Distance sort: `sort_by=location(lat,lng):asc`, which returns `geo_distance_meters`. A `geopolygon` field type stores polygons, so the reverse query is also possible ("which stored areas contain this point"). No vertex limit is documented. — [Typesense GeoSearch](https://typesense.org/docs/latest/api/geosearch.html)

**Meilisearch**
- Documents need `_geo: {lat, lng}`, and `_geo` must be in `filterableAttributes`, which triggers an index rebuild. Radius filter: `_geoRadius(45.472735, 9.184019, 2000)` (meters). Distance sort: `_geoPoint(lat,lng):asc`. "Meilisearch also supports GeoJSON for complex geometries like polygons and multi-polygons." — [Meilisearch geosearch](https://www.meilisearch.com/docs/learn/filtering_and_sorting/geosearch)
- `_geoPolygon([lat, lng], ...)` takes at least 3 pairs, and the polygon is closed automatically. It does not support crossing the 180th meridian (split the polygon instead). For GeoJSON documents, the filter checks whether the area intersects the document geometry. — [Meilisearch filter by geo polygon](https://www.meilisearch.com/docs/capabilities/geo_search/how_to/filter_by_geo_polygon)
- `_geoPolygon` and the GeoJSON backend shipped in **v1.22.0** (September 2025). `_geoBoundingBox` dates from v1.1. — [Meilisearch September 2025 updates](https://www.meilisearch.com/blog/september-2025-updates); [v1.1.0 release](https://github.com/meilisearch/meilisearch/releases/tag/v1.1.0)

**Firestore / Firebase**
- No native polygon query. Store a `geohash` alongside `lat`/`lng`, then call `geofire-common`'s `geohashQueryBounds(center, radiusInM)`. It returns "up to 9" start/end pairs, usually 4. Run one `orderBy('geohash')` range query per pair, merge the results, and drop points that `distanceBetween` places outside the radius. — [Firestore geoqueries](https://firebase.google.com/docs/firestore/solutions/geoqueries)
- "querying by Geohash is not exact, and you have to filter out false-positive results on the client side. These extra reads add cost and latency to your app." Accuracy degrades toward the poles. — [Firestore geoqueries](https://firebase.google.com/docs/firestore/solutions/geoqueries)

**PostGIS / Supabase (canonical docs, not re-fetched)**
- `ST_Within(A, B)`, `ST_Contains` and `ST_Intersects` are geometry predicates that use a GiST index automatically through the bounding-box `&&` operator. `ST_Within`/`ST_Contains` are **geometry-only**. For the `geography` type, use `ST_Intersects`, `ST_Covers`/`ST_CoveredBy` or `ST_DWithin`. — [ST_Within](https://postgis.net/docs/ST_Within.html); [ST_Intersects](https://postgis.net/docs/ST_Intersects.html); [ST_Covers](https://postgis.net/docs/ST_Covers.html); [PostGIS geography](https://postgis.net/docs/using_postgis_dbmanagement.html#PostGIS_Geography)
- Typical query: `WHERE ST_Intersects(location, ST_GeomFromGeoJSON($polygon)::geography)` with `CREATE INDEX … USING GIST (location)`.
- Supabase ships PostGIS as an extension. Its guide calls PostGIS functions through RPC, including bounding-box "in view" queries with `ST_MakeEnvelope`. — [Supabase PostGIS guide](https://supabase.com/docs/guides/database/extensions/postgis)

**GeoJSON winding and closure**
- RFC 7946: a linear ring's first and last positions are equivalent. Exterior rings follow the right-hand rule (counterclockwise), but parsers "SHOULD NOT reject" polygons that don't. — [RFC 7946 §3.1.6](https://datatracker.ietf.org/doc/html/rfc7946#section-3.1.6) (canonical, not re-fetched)

### Inferences
- **Normalize the drawn shape once, on the client or server, before querying:**
  1. Simplify to roughly 20–200 vertices.
  2. Close the ring.
  3. Force counterclockwise winding. Places Aggregate requires it, RFC 7946 and Mongo strict CRS expect it, and Typesense accepts either but rejects a scrambled order.
  4. Unkink self-intersections.
  5. Emit two orderings: `lng,lat` for GeoJSON/Mongo/PostGIS/ES, and `lat,lng` for Algolia, Typesense and Meilisearch.
- On geography vs geometry for small, city-scale lassos: geometry with SRID 4326 plus `ST_Intersects`/`ST_Within` is simpler and fully indexed. Geography interprets polygon edges as great-circle arcs. The difference is negligible at neighborhood scale.
- Algolia's cap of 10,000 coordinate pairs per request is generous, but an unsimplified finger trace plus a second polygon could still approach it. Simplification also improves query speed everywhere.
- Firestore is the weakest fit. Use a covering circle or box, geohash ranges, then client-side point-in-polygon, and pay for every false-positive read. If on Firebase, consider syncing listings into Typesense, Algolia or Meilisearch (all have Firebase extensions or integrations) for the polygon search.

### Gaps
- Vertex limits were not found for Typesense, Meilisearch, MongoDB or Elasticsearch. MongoDB's 2dsphere rule that "edges must not cross" for self-intersecting polygons was not verified this session.
- The OpenSearch `geo_shape`-on-`geo_point` support version was not verified.
- Firestore's composite-index and inequality constraints when combining geohash ranges with other filters (price, rooms) were not covered on the page.

## 5. Clustering counts inside the area ("210", "349" badges): server-side aggregation vs client-side clustering

### Takeaway
For a few thousand points or fewer, fetch the in-polygon points and cluster on the client: Supercluster, or @googlemaps/markerclusterer, which uses a Supercluster-based algorithm by default. For larger datasets, have the server return per-cell counts:
- Elasticsearch/OpenSearch: `geotile_grid`/`geohash_grid` aggregation filtered by the `geo_shape` polygon.
- PostGIS: `GROUP BY ST_SnapToGrid(...)`, or `ST_ClusterKMeans`/`ST_ClusterDBSCAN`.
- Algolia/Typesense/Meilisearch: no native geo-grid aggregation, so facet on precomputed geohash-prefix attributes.

For Google POIs, Places Aggregate `INSIGHT_COUNT` per sub-polygon is the only way to get counts without listing every place.

### Cited Findings (canonical docs, not re-fetched unless noted)
- Elasticsearch `geotile_grid` buckets `geo_point`/`geo_shape` values into map tiles at a zoom-level `precision` (0–29), and supports `bounds`. `geohash_grid` (precision 1–12) and `geo_centroid` sub-aggregations give a marker position per bucket. — [geotile_grid aggregation](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geotilegrid-aggregation); [geohash_grid aggregation](https://www.elastic.co/docs/reference/aggregations/search-aggregations-bucket-geohashgrid-aggregation); [geo_centroid](https://www.elastic.co/docs/reference/aggregations/search-aggregations-metrics-geocentroid-aggregation)
- Elasticsearch also has a vector tile search API (`_mvt`) that returns aggregated grid cells as Mapbox Vector Tiles. — [Vector tile search API](https://www.elastic.co/docs/api/doc/elasticsearch/operation/operation-search-mvt)
- PostGIS `ST_SnapToGrid` snaps points to a grid; group by the snapped point for counts. `ST_ClusterKMeans` and `ST_ClusterDBSCAN` are window functions that assign cluster IDs. `ST_SquareGrid`/`ST_HexagonGrid` (PostGIS 3.1+) generate grid cells to join against. — [ST_SnapToGrid](https://postgis.net/docs/ST_SnapToGrid.html); [ST_ClusterKMeans](https://postgis.net/docs/ST_ClusterKMeans.html); [ST_ClusterDBSCAN](https://postgis.net/docs/ST_ClusterDBSCAN.html); [ST_SquareGrid](https://postgis.net/docs/ST_SquareGrid.html)
- Supercluster is a fast hierarchical point clustering library for browser and Node, which can handle hundreds of thousands of points. — [mapbox/supercluster](https://github.com/mapbox/supercluster)
- @googlemaps/markerclusterer clusters markers on a Google map, with pluggable algorithms (default `SuperClusterAlgorithm`) and custom renderers for count badges. — [googlemaps/js-markerclusterer](https://github.com/googlemaps/js-markerclusterer)
- Places Aggregate `INSIGHT_COUNT` returns a place count for a circle, region or custom polygon at 1,200 QPM. — [Places Aggregate overview](https://developers.google.com/maps/documentation/places-aggregate/overview); [usage and billing](https://developers.google.com/maps/documentation/places-aggregate/usage-and-billing) (fetched)
- Algolia offers no geo-grid aggregation, but `insidePolygon` combines with normal faceting. — [Algolia insidePolygon](https://www.algolia.com/doc/api-reference/api-parameters/insidePolygon/) (fetched)

### Inferences
- **Badges like "210" / "349" by area** (e.g., per ward or station area within the lasso) look like per-region counts rather than pixel clusters. Two server-side options:
  - Intersect the lasso with stored admin or station polygons (PostGIS `ST_Intersects` join plus `COUNT`).
  - Facet on a `ward`/`station` attribute (Algolia, Typesense or Meilisearch facets with the polygon filter applied).

  Either is cheap and cacheable.
- **Pixel-style clusters that re-group on zoom:** use ES `geotile_grid` at `precision ≈ map zoom + 2..3` with the `geo_shape` polygon as a filter, or PostGIS `ST_SnapToGrid` at a zoom-dependent cell size. Return `{centroid, count}` and render as count markers.
- For Google POIs, exhaustive marker clustering is expensive because of the 20/60 caps and per-request cost. Counts per sub-area from Places Aggregate are the scalable route; fetch individual markers only after zooming in.

### Gaps
- Typesense and Meilisearch have no documented geo-grid or geohash aggregation that I could verify. The "facet on precomputed geohash prefix" approach is a common pattern, not a documented feature.
- Neither performance benchmarks for server-side vs client-side clustering at specific point counts, nor the actual implementation behind the Japanese app's count badges, were found.
