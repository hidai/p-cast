# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

P-Cast is a client-side podcast player PWA built with SvelteKit 2, Svelte 5 (runes mode), and Tailwind CSS 4. It uses Dexie (IndexedDB) for all data persistence — there is no backend database. The app runs entirely in the browser (SSR and prerendering are disabled in `+layout.ts`).

## Commands

- **Dev server:** `npm run dev`
- **Build:** `npm run build`
- **Type check:** `npm run check`
- **Lint:** `npm run lint` / **Lint fix:** `npm run lint:fix`
- **Format:** `npm run format` (Biome, uses tabs, 100 char line width)

## Architecture

### Data Flow

All data lives in IndexedDB via Dexie (`src/lib/db.ts`). Three tables: `podcasts` (keyed by `feedUrl`), `episodes` (keyed by `guid`), and `audioFiles` (stores downloaded audio blobs). Reactive queries use `liveQuery` from Dexie subscribed inside Svelte `$effect` blocks.

### Key Modules

- **`src/lib/db.ts`** — Dexie database schema and TypeScript interfaces (`Podcast`, `Episode`, `AudioFile`)
- **`src/lib/podcast-service.ts`** — All podcast logic: iTunes search API, RSS feed parsing (via DOMParser), subscribe/unsubscribe, episode download/delete, feed refresh
- **`src/lib/player.svelte.ts`** — Singleton `PlayerState` class using Svelte 5 runes (`$state`, `$derived`). Manages HTMLAudioElement, playback, position saving (every 10s), Media Session API. Exported as `player`.

### RSS Proxy

`src/routes/api/proxy/+server.ts` — A SvelteKit server route that proxies RSS feed requests to avoid CORS issues. Used in production on Vercel; podcast search hits iTunes API directly (no CORS issues there).

### Routes

- `/` (Home) — Lists episodes from subscribed podcasts, sorted by date
- `/discover` — Search podcasts via iTunes Search API, navigate to podcast detail
- `/library` — Three tabs: subscribed podcasts, downloaded episodes, listening history
- `/podcast?feedUrl=...&title=...` — Podcast detail page with episode list, subscribe/unsubscribe, sort order toggle

### UI Structure

Layout (`+layout.svelte`) renders: main content area, `MiniPlayer` (shown when an episode is loaded), `BottomNav` (Home/Discover/Library tabs), and `FullPlayer` overlay. Global keyboard shortcuts: Space (play/pause), J (-10s), L (+10s).

### Deployment

Deployed to Vercel using `@sveltejs/adapter-vercel`. PWA support via `@vite-pwa/sveltekit`.

## Conventions

- Svelte 5 runes mode is enforced for all non-node_modules files (see `svelte.config.js` `compilerOptions.runes`)
- Use `$state`, `$derived`, `$effect`, `$props` — not legacy Svelte stores
- Reactive DB queries: use `liveQuery` from Dexie, subscribed via `$effect` (not Svelte stores)
- Dark theme with custom CSS variables defined in `src/app.css` using Tailwind `@theme`
- Biome for linting and formatting (not ESLint/Prettier) — `useConst` rule is disabled in `.svelte` files (Svelte runes require `let`)
- Date formatting uses `ja-JP` locale
- SSR and prerendering are disabled globally in `+layout.ts` — this is a fully client-side SPA
