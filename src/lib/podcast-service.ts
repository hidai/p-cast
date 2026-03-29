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

export async function searchPodcasts(query: string): Promise<SearchResult[]> {
	const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=podcast&limit=20`;
	const res = await fetch(url);
	const data = await res.json();
	return data.results ?? [];
}

export async function fetchEpisodes(feedUrl: string): Promise<Omit<Episode, "isDownloaded">[]> {
	const res = await fetch(proxyUrl(feedUrl));
	const text = await res.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(text, "text/xml");
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

		if (!audioUrl) continue;

		episodes.push({
			guid,
			podcastFeedUrl: feedUrl,
			title,
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
	const rawEpisodes = await fetchEpisodes(feedUrl);
	for (const ep of rawEpisodes) {
		const existing = await db.episodes.get(ep.guid);
		if (!existing) {
			await db.episodes.put({ ...ep, isDownloaded: false });
		} else {
			// Update metadata but keep user state
			await db.episodes.update(ep.guid, {
				title: ep.title,
				audioUrl: ep.audioUrl,
				duration: ep.duration,
			});
		}
	}
}

export async function downloadEpisode(episode: Episode): Promise<void> {
	const res = await fetch(episode.audioUrl);
	const blob = await res.blob();
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
