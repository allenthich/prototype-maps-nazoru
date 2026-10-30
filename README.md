# prototype-maps-nazoru

Research and a working proof of concept for **finger-traced ("なぞる") map area search** on the web: drawing a shape on a Google Map to restrict a property search to it, built SEO-first and to WCAG 2.2 AA.

## Contents

| Path | What |
|---|---|
| [`nazoru-poc/`](nazoru-poc/) | Astro 7 + Google Maps JS proof of concept. Start with its [README](nazoru-poc/README.md) |
| [`reports/Freehand map area search.md`](<reports/Freehand map area search.md>) | Is freehand area search possible on Google Maps, and what are the alternatives (radius, viewport, lists, isochrones)? |
| [`reports/Freehand map area search accessibility.md`](<reports/Freehand map area search accessibility.md>) | What accessibility requires for it on the web: WCAG 2.2, library gaps, patterns, Japanese law, testing |
| [`research_notes/`](research_notes/) | Source notes behind both reports |

## Open in CodeSandbox

**[Open in CodeSandbox](https://codesandbox.io/p/devbox/github/allenthich/prototype-maps-nazoru)**. Alternatively, replace `github.com` with `githubbox.com` in this repo's URL.

It opens as a CodeSandbox VM Sandbox:
- Node 24 LTS, from [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json).
- Setup installs pnpm 10.25 and the dependencies, then starts the Astro dev server on port 4321 with the preview open. See [`.codesandbox/tasks.json`](.codesandbox/tasks.json); type check and unit tests are available as tasks too.
- The map runs in Google's **keyless development mode** (watermarked tiles plus a dismissible dialog), so nobody's key is shared.
- To use a real key, add a `GOOGLE_MAPS_API_KEY` secret (environment variable) in your fork of the sandbox, and allow `https://*.csb.app/*` in the key's HTTP-referrer restrictions.
- Canonical URLs still point to `http://localhost:4321` (the `site` setting). That's fine for a demo.

## Quick start (local)

```bash
cd nazoru-poc
pnpm install
pnpm dev   # http://localhost:4321/nagoya/
```

All listings are synthetic.
