import { db, type Episode, type Podcast } from "./db";
import { fetchJson, fetchXml, HttpError } from "./http";

export interface SearchResult {
	feedUrl: string;
	trackName: string;
	artistName: string;
	artworkUrl100: string;
	artworkUrl600: string;
	collectionId?: number;
}

function proxyUrl(target: string): string {
	return `/api/proxy?url=${encodeURIComponent(target)}`;
}

export interface TopPodcast {
	id: string;
	name: string;
	artistName: string;
	artworkUrl100: string;
}

const topPodcastsCache = new Map<string, { data: TopPodcast[]; fetchedAt: number }>();
const TOP_PODCASTS_TTL = 30 * 60 * 1000;

export async function fetchTopPodcasts(countryCode = "us"): Promise<TopPodcast[]> {
	const cached = topPodcastsCache.get(countryCode);
	if (cached && Date.now() - cached.fetchedAt < TOP_PODCASTS_TTL) {
		return cached.data;
	}
	const url = `https://rss.applemarketingtools.com/api/v2/${countryCode}/podcasts/top/25/podcasts.json`;
	const data = await fetchJson<{ feed?: { results?: TopPodcast[] } }>(proxyUrl(url));
	const results: TopPodcast[] = data.feed?.results ?? [];
	topPodcastsCache.set(countryCode, { data: results, fetchedAt: Date.now() });
	return results;
}

export async function lookupPodcastById(id: string): Promise<SearchResult | null> {
	const data = await fetchJson<{
		results?: Array<{
			collectionId?: number;
			feedUrl?: string;
			trackName?: string;
			artistName?: string;
			artworkUrl100?: string;
			artworkUrl600?: string;
		}>;
	}>(proxyUrl(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`));
	const result = data.results?.[0];
	if (!result?.feedUrl) return null;
	return {
		feedUrl: result.feedUrl,
		trackName: result.trackName ?? "",
		artistName: result.artistName ?? "",
		artworkUrl100: result.artworkUrl100 ?? "",
		artworkUrl600: result.artworkUrl600 ?? "",
		collectionId: result.collectionId,
	};
}

export async function searchPodcasts(query: string): Promise<SearchResult[]> {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=20`;
	const data = await fetchJson<{
		results?: Array<{
			collectionId?: number;
			feedUrl?: string;
			trackName?: string;
			artistName?: string;
			artworkUrl100?: string;
			artworkUrl600?: string;
		}>;
	}>(proxyUrl(url));
	return (data.results ?? [])
		.filter((r): r is { feedUrl: string } & typeof r => Boolean(r.feedUrl))
		.map((r) => ({
			feedUrl: r.feedUrl,
			trackName: r.trackName ?? "",
			artistName: r.artistName ?? "",
			artworkUrl100: r.artworkUrl100 ?? "",
			artworkUrl600: r.artworkUrl600 ?? "",
			collectionId: r.collectionId,
		}));
}

/** Fetch episode-level artwork URLs from Apple. Apple returns at most ~200
 * recent episodes (often fewer). Older episodes simply won't be in the map and
 * will keep their RSS-derived coverUrl. */
async function fetchAppleEpisodeArtwork(collectionId: number): Promise<Map<string, string>> {
	const url = `https://itunes.apple.com/lookup?id=${collectionId}&media=podcast&entity=podcastEpisode&limit=200`;
	const data = await fetchJson<{
		results?: Array<{
			wrapperType?: string;
			episodeGuid?: string;
			artworkUrl600?: string;
			artworkUrl160?: string;
			artworkUrl60?: string;
		}>;
	}>(proxyUrl(url));
	const map = new Map<string, string>();
	for (const r of data.results ?? []) {
		if (r.wrapperType !== "podcastEpisode" || !r.episodeGuid) continue;
		const cover = r.artworkUrl600 ?? r.artworkUrl160 ?? r.artworkUrl60;
		if (cover) map.set(r.episodeGuid, cover);
	}
	return map;
}

/** Best-effort backfill for podcasts subscribed before collectionId was tracked
 * (e.g. via the share target). Match by feedUrl among title-search results. */
async function findCollectionIdByTitle(
	title: string,
	feedUrl: string,
): Promise<number | undefined> {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(title)}&media=podcast&limit=10`;
	const data = await fetchJson<{
		results?: Array<{ collectionId?: number; feedUrl?: string }>;
	}>(proxyUrl(url));
	return data.results?.find((r) => r.feedUrl === feedUrl)?.collectionId;
}

async function fetchAndParseFeed(feedUrl: string): Promise<Document> {
	return fetchXml(proxyUrl(feedUrl));
}

function parseFeedDocument(doc: Document) {
	const channel = doc.querySelector("channel");
	const podcastDescription = channel?.querySelector("description")?.textContent ?? "";
	const podcastTitle = channel?.querySelector("title")?.textContent ?? "";
	const podcastAuthor =
		channel?.getElementsByTagNameNS("http://www.itunes.com/dtds/podcast-1.0.dtd", "author")[0]
			?.textContent ??
		channel?.querySelector("managingEditor")?.textContent ??
		channel?.querySelector("author")?.textContent ??
		"";
	const podcastCoverUrl =
		channel
			?.getElementsByTagNameNS("http://www.itunes.com/dtds/podcast-1.0.dtd", "image")[0]
			?.getAttribute("href") ??
		channel?.querySelector("image url")?.textContent ??
		"";
	return { podcastDescription, podcastTitle, podcastAuthor, podcastCoverUrl };
}

function fetchEpisodesFromDoc(feedUrl: string, doc: Document): Omit<Episode, "isDownloaded">[] {
	const items = doc.querySelectorAll("item");
	const episodes: Omit<Episode, "isDownloaded">[] = [];
	for (const item of items) {
		const guid =
			item.querySelector("guid")?.textContent ??
			item.querySelector("enclosure")?.getAttribute("url") ??
			"";
		const title = item.querySelector("title")?.textContent ?? "Untitled";
		const pubDateStr = item.querySelector("pubDate")?.textContent ?? "";
		const pubDate = pubDateStr ? new Date(pubDateStr).getTime() : 0;
		const enclosure = item.querySelector("enclosure");
		const audioUrl = enclosure?.getAttribute("url") ?? "";

		const coverUrl =
			item
				.getElementsByTagNameNS("http://www.itunes.com/dtds/podcast-1.0.dtd", "image")[0]
				?.getAttribute("href") ??
			item.querySelector("image url")?.textContent ??
			item
				.getElementsByTagNameNS("http://search.yahoo.com/mrss/", "thumbnail")[0]
				?.getAttribute("url") ??
			"";

		const durationStr =
			item.querySelector("duration")?.textContent ??
			item.getElementsByTagNameNS("http://www.itunes.com/dtds/podcast-1.0.dtd", "duration")[0]
				?.textContent ??
			"0";
		const duration = parseDuration(durationStr);

		const description =
			item.getElementsByTagNameNS("http://purl.org/rss/1.0/modules/content/", "encoded")[0]
				?.textContent ??
			item.querySelector("description")?.textContent ??
			item.getElementsByTagNameNS("http://www.itunes.com/dtds/podcast-1.0.dtd", "summary")[0]
				?.textContent ??
			"";

		if (!audioUrl) continue;

		episodes.push({
			guid,
			podcastFeedUrl: feedUrl,
			title,
			description,
			pubDate,
			duration,
			audioUrl,
			coverUrl,
			currentTime: 0,
			isCompleted: false,
		});
	}

	return episodes;
}

export async function fetchEpisodes(feedUrl: string): Promise<{
	episodes: Omit<Episode, "isDownloaded">[];
	podcastDescription: string;
	podcastTitle: string;
	podcastAuthor: string;
	podcastCoverUrl: string;
}> {
	const doc = await fetchAndParseFeed(feedUrl);
	const { podcastDescription, podcastTitle, podcastAuthor, podcastCoverUrl } =
		parseFeedDocument(doc);
	return {
		episodes: fetchEpisodesFromDoc(feedUrl, doc),
		podcastDescription,
		podcastTitle,
		podcastAuthor,
		podcastCoverUrl,
	};
}

function parseDuration(str: string): number {
	if (!str) return 0;
	// Pure seconds
	if (/^\d+$/.test(str)) return Number.parseInt(str, 10);
	// HH:MM:SS or MM:SS
	const parts = str.split(":").map(Number);
	if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
	if (parts.length === 2) return parts[0] * 60 + parts[1];
	return 0;
}

export async function subscribePodcast(result: SearchResult): Promise<void> {
	const podcast: Podcast = {
		feedUrl: result.feedUrl,
		title: result.trackName,
		author: result.artistName,
		coverUrl: result.artworkUrl600 || result.artworkUrl100,
		description: "",
		subscribedAt: Date.now(),
		collectionId: result.collectionId,
	};
	await db.podcasts.put(podcast);
}

export async function unsubscribePodcast(feedUrl: string): Promise<void> {
	const episodes = await db.episodes.where("podcastFeedUrl").equals(feedUrl).toArray();
	const guids = episodes.map((e) => e.guid);
	await db.audioFiles.bulkDelete(guids);
	await db.episodes.where("podcastFeedUrl").equals(feedUrl).delete();
	await db.podcasts.delete(feedUrl);
}

export async function refreshPodcast(feedUrl: string): Promise<void> {
	const doc = await fetchAndParseFeed(feedUrl);

	// Update podcast description from channel-level data
	const { podcastDescription } = parseFeedDocument(doc);
	if (podcastDescription) {
		await db.podcasts.update(feedUrl, { description: podcastDescription });
	}

	const rawEpisodes = fetchEpisodesFromDoc(feedUrl, doc);
	for (const ep of rawEpisodes) {
		const existing = await db.episodes.get(ep.guid);
		if (!existing) {
			await db.episodes.put({ ...ep, isDownloaded: false });
		} else {
			// Update metadata but keep user state
			await db.episodes.update(ep.guid, {
				title: ep.title,
				description: ep.description,
				audioUrl: ep.audioUrl,
				duration: ep.duration,
			});
		}
	}

	await applyAppleEpisodeArtwork(feedUrl);
}

/** Overwrite episode coverUrl with Apple-hosted artwork when possible.
 * Apple's CDN serves stable, resizable URLs (see resizeMzstatic) and is shared
 * across podcasts, so this dramatically improves caching and transfer size.
 * Once an episode has been mapped, the URL is preserved across refreshes —
 * Apple's lookup window is too narrow to rely on continuous matching. */
async function applyAppleEpisodeArtwork(feedUrl: string): Promise<void> {
	let podcast = await db.podcasts.get(feedUrl);
	if (!podcast) return;

	if (!podcast.collectionId && podcast.title) {
		try {
			const id = await findCollectionIdByTitle(podcast.title, feedUrl);
			if (id) {
				await db.podcasts.update(feedUrl, { collectionId: id });
				podcast = { ...podcast, collectionId: id };
			}
		} catch {
			// Network failure or not in Apple's index — fall through.
		}
	}

	if (!podcast.collectionId) return;

	let artworkByGuid: Map<string, string>;
	try {
		artworkByGuid = await fetchAppleEpisodeArtwork(podcast.collectionId);
	} catch {
		return;
	}
	if (artworkByGuid.size === 0) return;

	const episodes = await db.episodes.where("podcastFeedUrl").equals(feedUrl).toArray();
	for (const ep of episodes) {
		const appleUrl = artworkByGuid.get(ep.guid);
		if (appleUrl && ep.coverUrl !== appleUrl) {
			await db.episodes.update(ep.guid, { coverUrl: appleUrl });
		}
	}
}

export async function downloadEpisode(
	episode: Episode,
	onProgress?: (fraction: number) => void,
): Promise<void> {
	const res = await fetch(proxyUrl(episode.audioUrl));
	if (!res.ok) throw new HttpError(res.status, `Download failed: ${res.status}`);

	const contentLength = Number(res.headers.get("Content-Length") || 0);
	if (!contentLength || !res.body) {
		// Fallback: no streaming progress
		const blob = await res.blob();
		await db.audioFiles.put({ episodeGuid: episode.guid, audioBlob: blob });
		await db.episodes.update(episode.guid, { isDownloaded: true });
		return;
	}

	const reader = res.body.getReader();
	const chunks: BlobPart[] = [];
	let received = 0;

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		chunks.push(value);
		received += value.length;
		onProgress?.(received / contentLength);
	}

	const blob = new Blob(chunks, {
		type: res.headers.get("Content-Type") || "audio/mpeg",
	});
	await db.audioFiles.put({ episodeGuid: episode.guid, audioBlob: blob });
	await db.episodes.update(episode.guid, { isDownloaded: true });
}

export async function deleteDownload(episodeGuid: string): Promise<void> {
	await db.audioFiles.delete(episodeGuid);
	await db.episodes.update(episodeGuid, { isDownloaded: false });
}

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

export async function cleanupExpiredDownloads(): Promise<void> {
	const cutoff = Date.now() - TWENTY_FOUR_HOURS;
	const expired = await db.episodes
		.where("completedAt")
		.below(cutoff)
		.and((e) => e.isDownloaded && e.isCompleted)
		.toArray();
	for (const episode of expired) {
		await deleteDownload(episode.guid);
	}
}

export function formatDuration(seconds: number): string {
	if (!seconds || seconds <= 0) return "0:00";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	return `${m}:${s.toString().padStart(2, "0")}`;
}
