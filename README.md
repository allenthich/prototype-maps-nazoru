# prototype-maps-nazoru

Research and a working proof of concept for **finger-traced ("なぞる") map area search** on the web: drawing a shape on a Google Map to restrict a property search to it, built SEO-first and to WCAG 2.2 AA.

## Contents

| Path | What |
|---|---|
| [`nazoru-poc/`](nazoru-poc/) | Astro 7 + Google Maps JS proof of concept. Start with its [README](nazoru-poc/README.md) |
| [`reports/Freehand map area search.md`](<reports/Freehand map area search.md>) | Is freehand area search possible on Google Maps, and what are the alternatives (radius, viewport, lists, isochrones)? |
| [`reports/Freehand map area search accessibility.md`](<reports/Freehand map area search accessibility.md>) | What accessibility requires for it on the web: WCAG 2.2, library gaps, patterns, Japanese law, testing |
| [`research_notes/`](research_notes/) | Source notes behind both reports |

## Quick start

```bash
cd nazoru-poc
pnpm install
pnpm dev   # http://localhost:4321/nagoya/
```

All listings are synthetic.
