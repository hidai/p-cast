import Dexie, { type EntityTable } from 'dexie';

export interface Podcast {
	feedUrl: string;
	title: string;
	author: string;
	coverUrl: string;
	description: string;
	subscribedAt: number;
}

export interface Episode {
	guid: string;
	podcastFeedUrl: string;
	title: string;
	pubDate: number;
	duration: number;
	audioUrl: string;
	coverUrl: string;
	currentTime: number;
	isCompleted: boolean;
	isDownloaded: boolean;
}

export interface AudioFile {
	episodeGuid: string;
	audioBlob: Blob;
}

class PcastDatabase extends Dexie {
	podcasts!: EntityTable<Podcast, 'feedUrl'>;
	episodes!: EntityTable<Episode, 'guid'>;
	audioFiles!: EntityTable<AudioFile, 'episodeGuid'>;

	constructor() {
		super('pcast');
		this.version(1).stores({
			podcasts: 'feedUrl, subscribedAt',
			episodes: 'guid, podcastFeedUrl, pubDate, isDownloaded',
			audioFiles: 'episodeGuid',
		});
		this.version(2).stores({
			podcasts: 'feedUrl, subscribedAt',
			episodes: 'guid, podcastFeedUrl, pubDate, isDownloaded',
			audioFiles: 'episodeGuid',
		});
	}
}

export const db = new PcastDatabase();
