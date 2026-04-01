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

- **`src/lib/db.ts`** — Dexie database schema and TypeScript interfaces (`Podcast`, `Episode`, `AudioFile`). Podcast has `description` and optional `episodeSortOrder`; Episode has `description`, `audioUrl`, `coverUrl`, and optional `lastPlayedAt` beyond what the original spec lists.
- **`src/lib/podcast-service.ts`** — All podcast logic: iTunes search API, RSS feed parsing (via DOMParser), subscribe/unsubscribe, episode download/delete, feed refresh. Also provides `fetchTopPodcasts()` (Apple Marketing Tools API, 30-min in-memory cache) and `lookupPodcastById()`.
- **`src/lib/player.svelte.ts`** — Singleton `PlayerState` class using Svelte 5 runes (`$state`, `$derived`). Manages HTMLAudioElement, playback, position saving (every 10s), Media Session API, and auto-play-next (plays the next unplayed episode from the same podcast when the current one finishes). Exported as `player`.
- **`src/lib/overlay.svelte.ts`** — Singleton overlay manager for sheet-style modals (`FullPlayer`, `PodcastDetailSheet`, `EpisodeDetailSheet`). Integrates with browser history state so the back button closes overlays naturally.

### RSS Proxy

`src/routes/api/proxy/+server.ts` — A SvelteKit server route that proxies RSS feed requests to avoid CORS issues. Used in production on Vercel; podcast search hits iTunes API directly (no CORS issues there).

### Routes

- `/` (Home) — Three sections: "Continue Listening" (episodes in progress), "Next Up" (next unplayed episode per podcast), and "Latest Episodes" from subscribed podcasts
- `/discover` — Top podcasts and keyword search via iTunes Search API, navigate to podcast detail overlay
- `/library` — Three tabs: subscribed podcasts, downloaded episodes, listening history

Podcast detail and episode detail are **overlay sheets** (not separate routes), managed by `overlay.svelte.ts` and rendered in `+layout.svelte`. They use `history.pushState` so the back button closes them.

### UI Structure

Layout (`+layout.svelte`) renders: main content area, `MiniPlayer` (shown when an episode is loaded), `BottomNav` (Home/Discover/Library tabs), `FullPlayer` overlay, `PodcastDetailSheet` overlay, and `EpisodeDetailSheet` overlay. Global keyboard shortcuts: Space (play/pause), J (-10s), L (+10s).

### Deployment

Deployed to Vercel using `@sveltejs/adapter-vercel`. PWA support via `@vite-pwa/sveltekit`.

## Conventions

- Svelte 5 runes mode is enforced for all non-node_modules files (see `svelte.config.js` `compilerOptions.runes`)
- Use `$state`, `$derived`, `$effect`, `$props` — not legacy Svelte stores
- Reactive DB queries: use `liveQuery` from Dexie, subscribed via `$effect` (not Svelte stores)
- Dark theme with custom CSS variables defined in `src/app.css` using Tailwind `@theme`
- Biome for linting and formatting (not ESLint/Prettier) — `useConst` rule is disabled in `.svelte` files (Svelte runes require `let`)
- i18n: All UI strings go through `i18n.t(key)` from `$lib/i18n`. Translations live in `src/lib/i18n/translations/{ja,en}.ts`. Add keys to `keys.ts`, then both translation files. Date formatting uses `i18n.formatDate()` instead of hardcoded locale.
- SSR and prerendering are disabled globally in `+layout.ts` — this is a fully client-side SPA
