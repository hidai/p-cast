import { db, type Episode, type Podcast } from "./db";

export interface SearchResult {
	feedUrl: string;
	trackName: string;
	artistName: string;
	artworkUrl100: string;
	artworkUrl600: string;
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

let topPodcastsCache: TopPodcast[] | null = null;
let topPodcastsCacheTime = 0;
const TOP_PODCASTS_TTL = 30 * 60 * 1000;

export async function fetchTopPodcasts(): Promise<TopPodcast[]> {
	if (topPodcastsCache && Date.now() - topPodcastsCacheTime < TOP_PODCASTS_TTL) {
		return topPodcastsCache;
	}
	const url = "https://rss.applemarketingtools.com/api/v2/jp/podcasts/top/25/podcasts.json";
	const res = await fetch(proxyUrl(url));
	const data = await res.json();
	const results = data.feed?.results ?? [];
	topPodcastsCache = results;
	topPodcastsCacheTime = Date.now();
	return results;
}

export async function lookupPodcastById(id: string): Promise<SearchResult | null> {
	const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=podcast`);
	const data = await res.json();
	const result = data.results?.[0];
	if (!result?.feedUrl) return null;
	return {
		feedUrl: result.feedUrl,
		trackName: result.trackName ?? "",
		artistName: result.artistName ?? "",
		artworkUrl100: result.artworkUrl100 ?? "",
		artworkUrl600: result.artworkUrl600 ?? "",
	};
}

export async function searchPodcasts(query: string): Promise<SearchResult[]> {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=20`;
	const res = await fetch(url);
	const data = await res.json();
	return data.results ?? [];
}

async function fetchAndParseFeed(feedUrl: string): Promise<Document> {
	const res = await fetch(proxyUrl(feedUrl));
	const text = await res.text();
	return new DOMParser().parseFromString(text, "text/xml");
}

function parseFeedDocument(doc: Document) {
	const channel = doc.querySelector("channel");
	const podcastDescription = channel?.querySelector("description")?.textContent ?? "";
	return { podcastDescription };
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

export async function fetchEpisodes(
	feedUrl: string,
): Promise<{ episodes: Omit<Episode, "isDownloaded">[]; podcastDescription: string }> {
	const doc = await fetchAndParseFeed(feedUrl);
	const { podcastDescription } = parseFeedDocument(doc);
	return { episodes: fetchEpisodesFromDoc(feedUrl, doc), podcastDescription };
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
}

export async function downloadEpisode(
	episode: Episode,
	onProgress?: (fraction: number) => void,
): Promise<void> {
	const res = await fetch(proxyUrl(episode.audioUrl));
	if (!res.ok) throw new Error(`Download failed: ${res.status}`);

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

export function formatDuration(seconds: number): string {
	if (!seconds || seconds <= 0) return "0:00";
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	const s = Math.floor(seconds % 60);
	if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
	return `${m}:${s.toString().padStart(2, "0")}`;
}
