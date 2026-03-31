import type { Episode } from "./db";

class EpisodeDetailState {
	episode: Episode | null = $state(null);

	open(episode: Episode) {
		this.episode = episode;
	}

	close() {
		this.episode = null;
	}
}

export const episodeDetail = new EpisodeDetailState();
