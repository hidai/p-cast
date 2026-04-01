import type { Episode } from "$lib/db";
import { db } from "$lib/db";

/** Strip <script> tags for safety, keep other HTML */
export function sanitizeHtml(html: string): string {
	return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

/** Resolve episode cover URL, falling back to the podcast's cover */
export async function resolveCoverUrl(episode: Episode): Promise<string> {
	if (episode.coverUrl) return episode.coverUrl;
	const podcast = await db.podcasts.get(episode.podcastFeedUrl);
	return podcast?.coverUrl ?? "";
}
