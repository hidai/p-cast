import type { Episode } from "$lib/db";
import { downloadEpisode } from "$lib/podcast-service";

class DownloadState {
	private guids = $state(new Map<string, number>());

	getProgress(episodeGuid: string): number | null {
		return this.guids.has(episodeGuid) ? (this.guids.get(episodeGuid) ?? 0) : null;
	}

	isDownloading(episodeGuid: string): boolean {
		return this.guids.has(episodeGuid);
	}

	async download(episode: Episode): Promise<void> {
		if (this.guids.has(episode.guid)) return;
		const start = new Map(this.guids);
		start.set(episode.guid, 0);
		this.guids = start;
		try {
			await downloadEpisode(episode, (progress) => {
				const next = new Map(this.guids);
				next.set(episode.guid, progress);
				this.guids = next;
			});
		} finally {
			const next = new Map(this.guids);
			next.delete(episode.guid);
			this.guids = next;
		}
	}
}

export const downloads = new DownloadState();
