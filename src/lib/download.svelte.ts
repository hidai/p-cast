import type { Episode } from "$lib/db";
import { downloadEpisode } from "$lib/podcast-service";

export function createDownloadState() {
	let guids = $state(new Map<string, number>());

	return {
		get guids() {
			return guids;
		},

		getProgress(episodeGuid: string): number | null {
			return guids.has(episodeGuid) ? (guids.get(episodeGuid) ?? 0) : null;
		},

		async download(episode: Episode, onComplete?: () => Promise<void> | void) {
			guids = new Map([...guids, [episode.guid, 0]]);
			try {
				await downloadEpisode(episode, (progress) => {
					guids = new Map([...guids, [episode.guid, progress]]);
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
