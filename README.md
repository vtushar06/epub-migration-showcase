# EPUB Migration Showcase

**epub.js vs foliate-js** — Kolibri GSoC 2026 Proposal Demo

## Quick Start

### For Local Development

```bash
# 1. Clone foliate-js dependency (required for local testing)
./setup-local.sh

# 2. Start local server
python3 -m http.server 8080

# 3. Open in browser
open http://localhost:8080
```

**Note:** The `foliate-js/` directory is gitignored and automatically cloned during GitHub Pages deployment. For local development, run `./setup-local.sh` first to clone it.

### Viewing on GitHub Pages

The site is automatically deployed to GitHub Pages when changes are pushed to main. No setup needed - just visit: https://vtushar06.github.io/epub-migration-showcase/

## Features

- **Pre-loaded sample EPUBs** - Select from dropdown, no upload needed
- **Side-by-side viewers** - Same book in both libraries
- **Research findings** - Bugs from MASTER_GUIDE.md with root causes
- **Library comparison** - Metrics and feature comparison

## Sample EPUBs (in `public/epubs/`)

| File | Description |
|------|-------------|
| `accessible-epub3.epub` | Complex book with accessibility features |
| `epub3-spec.epub` | Technical specification document |
| `rtl-book.epub` | Right-to-left language content |
| `tinsiima.epub` | African storybook with images |

## Key Bugs Demonstrated

| Bug | Impact | Root Cause |
|-----|--------|------------|
| Progress stuck at 57% | HIGH | `locations.generate(1000)` creates phantom CFI slots |
| Sandbox security warning | SECURITY | `allow-scripts` + `allow-same-origin` + `srcdoc` |
| Image 404 errors | MEDIUM | `replacements()` never called for URL-loaded EPUBs |
| Tables force scroll | LOW | Manual detection switches to scrolled mode |

## Structure

```
epub-migration-showcase/
├── index.html          # Main page
├── app.js              # Vue 3 app with research data
├── styles.css          # Clean styles
├── foliate-inner.html  # foliate-js iframe viewer
├── foliate-js/         # Cloned from github.com/johnfactotum/foliate-js (gitignored)
├── setup-local.sh      # Setup script for local development
└── public/epubs/       # Sample EPUB files
```

## References

- [MASTER_GUIDE.md](../MASTER_GUIDE.md) - Full research documentation
- [Kolibri](https://github.com/learningequality/kolibri)
- [foliate-js](https://github.com/johnfactotum/foliate-js)
