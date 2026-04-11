<p align="center">
  <img src="static/icon-512.png" alt="P-Cast" width="120" />
</p>

# P-Cast

A podcast player that lives in your browser. No account. No sync. Just your podcasts.

→ Open **[P-Cast](https://p-cast.org/)**

---

## Why P-Cast?

Most podcast apps want your email, your data, and a monthly subscription.
P-Cast doesn't. Everything — your subscriptions, your listening history,
your downloaded episodes — stays on your device. Close the tab and it's
all still there next time.

## Features

- **Discover** — Browse top podcasts or search by keyword
- **Offline playback** — Download episodes and listen without internet
- **Installable** — Add to your home screen, no App Store needed
- **Resume anywhere** — Picks up exactly where you left off
- **Auto-play next** — Moves to the next episode automatically
- **Background playback** — Lock screen controls on mobile
- **Playback speed** — 1.0×, 1.2×, 1.5×, 2.0×
- **No account required** — All data stays in your browser

---

### Tech Stack

- [SvelteKit 2](https://svelte.dev/) (SPA mode) + [Svelte 5](https://svelte.dev/) (runes)
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Dexie.js](https://dexie.org/) (IndexedDB wrapper)
- [Vite PWA](https://vite-pwa-org.netlify.app/) for offline support

### Getting Started

```bash
npm install
npm run dev
```

### Deployment

Requires a server runtime (Vercel or similar) for the RSS proxy route.
Static hosting won't work.

```bash
npm i -g vercel
vercel
```

### Architecture

All data is stored in IndexedDB — no backend database. A server-side proxy
handles RSS feed fetching to work around CORS restrictions.

---

[MIT License](LICENSE)
