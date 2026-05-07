# jrmarquard-travel

Personal travel site built with [Astro](https://astro.build), deployed to [travel.johnmarquard.me](https://travel.johnmarquard.me) via GitHub Pages.

Monorepo managed with [pnpm](https://pnpm.io) and [Turborepo](https://turbo.build).

## Structure

```
apps/
  site/     # @travel/site — Astro site (deployed to GitHub Pages)
  editor/   # @travel/editor — Next.js content editor
tooling/    # Map generation scripts (tsx)
```

## Development

```bash
pnpm install
pnpm dev        # start all dev servers
pnpm build      # build all apps
```

To work on a single app:

```bash
pnpm --filter @travel/site dev
pnpm --filter @travel/site build
```

## Git Worktrees

Recommended workflow for working on multiple branches simultaneously:

```bash
# From the parent directory of this repo
git clone --bare https://github.com/jrmarquard/jrmarquard-travel.git travel.git

# Add worktrees per branch
git -C travel.git worktree add ../travel-main main
git -C travel.git worktree add ../travel-feature-name feature/name

# Each worktree needs its own install
cd ../travel-main && pnpm install
```
