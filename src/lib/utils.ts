import DOMPurify from "dompurify";
import type { Episode } from "$lib/db";
import { db } from "$lib/db";

/** Sanitize HTML from untrusted sources (RSS feeds) using DOMPurify.
 * All links are forced to open in a new tab with noopener/noreferrer — the app
 * owns link behaviour, RSS feeds do not. */
export function sanitizeHtml(html: string): string {
	const clean = DOMPurify.sanitize(html, {
		ALLOWED_TAGS: [
			"b",
			"i",
			"em",
			"strong",
			"p",
			"br",
			"a",
			"ul",
			"ol",
			"li",
			"blockquote",
			"h1",
			"h2",
			"h3",
			"pre",
			"code",
		],
		ALLOWED_ATTR: ["href", "title", "rel"],
	});
	// Enforce target="_blank" and rel="noopener noreferrer" on every link so that
	// (a) the PWA is never navigated away from, and (b) window.opener is not leaked.
	const doc = new DOMParser().parseFromString(clean, "text/html");
	for (const a of doc.querySelectorAll("a[href]")) {
		a.setAttribute("target", "_blank");
		a.setAttribute("rel", "noopener noreferrer");
	}
	return doc.body.innerHTML;
}

/** Resolve episode cover URL, falling back to the podcast's cover */
export async function resolveCoverUrl(episode: Episode): Promise<string> {
	if (episode.coverUrl) return episode.coverUrl;
	const podcast = await db.podcasts.get(episode.podcastFeedUrl);
	return podcast?.coverUrl ?? "";
}

/** Request a smaller variant of an Apple mzstatic.com artwork URL by rewriting
 * the size segment (e.g. /600x600bb.jpg → /192x192bb.jpg). Non-mzstatic URLs
 * are returned unchanged. */
export function resizeMzstatic(url: string | undefined, size: number): string {
	if (!url?.includes("mzstatic.com")) return url ?? "";
	return url.replace(/\/\d+x\d+bb(-?\d*)?\.(jpg|jpeg|png|webp)/i, `/${size}x${size}bb$1.$2`);
}
