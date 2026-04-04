import type { Episode } from "$lib/db";
import { downloadEpisode } from "$lib/podcast-service";

export function createDownloadState() {
	let guids = $state(new Map<string, number>());

	return {
		getProgress(episodeGuid: string): number | null {
			return guids.has(episodeGuid) ? (guids.get(episodeGuid) ?? 0) : null;
		},

		async download(episode: Episode, onComplete?: () => Promise<void> | void) {
			const start = new Map(guids);
			start.set(episode.guid, 0);
			guids = start;
			try {
				await downloadEpisode(episode, (progress) => {
					const next = new Map(guids);
					next.set(episode.guid, progress);
					guids = next;
				});
				await onComplete?.();
			} finally {
				const next = new Map(guids);
				next.delete(episode.guid);
				guids = next;
			}
		},
	};
}
