# jrmarquard-travel

Personal travel site built with [Astro](https://astro.build), deployed to [travel.johnmarquard.me](https://travel.johnmarquard.me) via GitHub Pages.

## Project Structure

```
/
├── public/
│   ├── favicon.svg
│   └── photos/          # Trip photos (served as static assets)
├── src/
│   ├── data/
│   │   └── photos/      # Photo metadata JSON per trip
│   ├── layouts/
│   │   └── Layout.astro
│   └── pages/
│       ├── index.astro           # Trip index
│       └── korea-japan-2026/
│           └── index.astro       # Korea / Japan 2026 trip page
└── package.json
```

## Commands

| Command           | Action                                      |
| :---------------- | :------------------------------------------ |
| `npm install`     | Install dependencies                        |
| `npm run dev`     | Start local dev server at `localhost:4321`  |
| `npm run build`   | Build production site to `./dist/`          |
| `npm run preview` | Preview the production build locally        |

## Adding a Trip

1. Add photo metadata to `src/data/photos/<trip-slug>.json`
2. Place photos in `public/photos/<trip-slug>/`
3. Create a page at `src/pages/<trip-slug>/index.astro`
4. Add the trip to the list in `src/pages/index.astro`
