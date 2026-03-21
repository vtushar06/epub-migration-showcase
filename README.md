# EPUB Migration Showcase

**epub.js vs foliate-js** — Kolibri GSoC 2026 Proposal Demo

## Quick Start

```bash
# Start local server
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

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
├── foliate-js/         # Symlink to ../foliate-js
└── public/epubs/       # Sample EPUB files
```

## References

- [MASTER_GUIDE.md](../MASTER_GUIDE.md) - Full research documentation
- [Kolibri](https://github.com/learningequality/kolibri)
- [foliate-js](https://github.com/johnfactotum/foliate-js)
