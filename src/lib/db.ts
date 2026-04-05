import Dexie, { type EntityTable } from "dexie";

export type EpisodeSortOrder = "newest" | "oldest";

export interface Podcast {
	feedUrl: string;
	title: string;
	author: string;
	coverUrl: string;
	description: string;
	subscribedAt: number;
	episodeSortOrder?: EpisodeSortOrder;
}

export interface Episode {
	guid: string;
	podcastFeedUrl: string;
	title: string;
	description: string;
	pubDate: number;
	duration: number;
	audioUrl: string;
	coverUrl: string;
	currentTime: number;
	isCompleted: boolean;
	isDownloaded: boolean;
	lastPlayedAt?: number;
	completedAt?: number;
}

export interface AudioFile {
	episodeGuid: string;
	audioBlob: Blob;
}

class PcastDatabase extends Dexie {
	podcasts!: EntityTable<Podcast, "feedUrl">;
	episodes!: EntityTable<Episode, "guid">;
	audioFiles!: EntityTable<AudioFile, "episodeGuid">;

	constructor() {
		super("pcast");
		this.version(1).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate, isDownloaded",
			audioFiles: "episodeGuid",
		});
		this.version(2).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate, isDownloaded",
			audioFiles: "episodeGuid",
		});
		this.version(3).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate",
			audioFiles: "episodeGuid",
		});
		this.version(4).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate",
			audioFiles: "episodeGuid",
		});
		this.version(5).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate, lastPlayedAt",
			audioFiles: "episodeGuid",
		});
		this.version(6).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate, lastPlayedAt",
			audioFiles: "episodeGuid",
		});
		this.version(7).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate, lastPlayedAt",
			audioFiles: "episodeGuid",
		});
		this.version(8).stores({
			podcasts: "feedUrl, subscribedAt",
			episodes: "guid, podcastFeedUrl, pubDate, lastPlayedAt, completedAt",
			audioFiles: "episodeGuid",
		});
	}
}

export const db = new PcastDatabase();
