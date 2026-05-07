# Travel Editor

Local-only trip editor for the travel site. Reads and writes trip JSON files directly in `site/src/data/trips/`.

## Usage

```bash
cd editor
npm install
npm run dev        # runs on http://localhost:3001
```

The site's Astro dev server can run at the same time on port 4321.

## What it does

- **List trips** — shows all `*.json` files in `site/src/data/trips/`
- **Create a trip** — generates a new `[id].json` data file and a `[id].ts` wrapper that imports and validates it
- **Edit a trip** — four tabs:
  - **Overview** — title, description, dates, countries, tags
  - **Itinerary** — add/edit/remove days; each day has stops (location, timezone, coordinates) and a primary stop
  - **Segments** — flights (with legs), accommodation, activities, notes
  - **Photos** — edit alt text, caption, and stop association for existing photos
- **Save** — writes the updated JSON back to disk; the API validates with Zod before writing

## Workflow

1. Edit in the browser
2. Hit **Save** — the JSON is written to `site/src/data/trips/[id].json`
3. The Astro site (running on port 4321) hot-reloads automatically
4. When happy, commit the JSON file and push — the site deploys on merge

## Notes

- Photo files are managed separately by `site/scripts/process-photos.js` — the editor only edits photo metadata (alt, caption, stop association)
- The editor is never deployed; it is excluded from the site's GitHub Pages build
