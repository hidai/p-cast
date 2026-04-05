import DOMPurify from "dompurify";
import type { Episode } from "$lib/db";
import { db } from "$lib/db";

/** Sanitize HTML from untrusted sources (RSS feeds) using DOMPurify */
export function sanitizeHtml(html: string): string {
	return DOMPurify.sanitize(html, {
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
		ALLOWED_ATTR: ["href", "title", "rel", "target"],
	});
}

/** Resolve episode cover URL, falling back to the podcast's cover */
export async function resolveCoverUrl(episode: Episode): Promise<string> {
	if (episode.coverUrl) return episode.coverUrl;
	const podcast = await db.podcasts.get(episode.podcastFeedUrl);
	return podcast?.coverUrl ?? "";
}
