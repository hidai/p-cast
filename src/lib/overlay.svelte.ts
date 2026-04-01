import { db, type Episode } from "./db";

export interface PodcastMeta {
	title: string;
	author: string;
	coverUrl: string;
}

class OverlayManager {
	activeOverlay: "none" | "fullPlayer" | "episodeDetail" | "podcastDetail" = $state("none");
	detailEpisode: Episode | null = $state(null);
	detailPodcastFeedUrl = $state("");
	detailPodcastMeta: PodcastMeta | null = $state(null);

	private hasHistoryEntry = false;
	private ignoringPopState = false;

	private resetState() {
		this.activeOverlay = "none";
		this.detailEpisode = null;
		this.detailPodcastFeedUrl = "";
		this.detailPodcastMeta = null;
		this.hasHistoryEntry = false;
	}

	openFullPlayer() {
		const wasActive = this.activeOverlay !== "none";
		this.activeOverlay = "fullPlayer";
		this.detailEpisode = null;
		this.syncHistory(wasActive, { overlay: "fullPlayer" });
	}

	openEpisodeDetail(episode: Episode) {
		const wasActive = this.activeOverlay !== "none";
		this.activeOverlay = "episodeDetail";
		this.detailEpisode = episode;
		this.detailPodcastFeedUrl = "";
		this.detailPodcastMeta = null;
		this.syncHistory(wasActive, { overlay: "episodeDetail", episodeGuid: episode.guid });
	}

	openPodcastDetail(feedUrl: string, meta?: PodcastMeta) {
		const wasActive = this.activeOverlay !== "none";
		this.activeOverlay = "podcastDetail";
		this.detailEpisode = null;
		this.detailPodcastFeedUrl = feedUrl;
		this.detailPodcastMeta = meta ?? null;
		this.syncHistory(wasActive, { overlay: "podcastDetail", feedUrl });
	}

	closeAll() {
		if (this.activeOverlay === "none") return;
		const hadHistoryEntry = this.hasHistoryEntry;
		this.resetState();
		if (hadHistoryEntry) {
			this.ignoringPopState = true;
			history.back();
		}
	}

	handlePopState(e: PopStateEvent) {
		if (this.ignoringPopState) {
			this.ignoringPopState = false;
			return;
		}
		const state = e.state;
		if (state?.overlay === "fullPlayer") {
			this.activeOverlay = "fullPlayer";
			this.detailEpisode = null;
			this.hasHistoryEntry = true;
		} else if (state?.overlay === "episodeDetail" && state?.episodeGuid) {
			db.episodes.get(state.episodeGuid as string).then((ep) => {
				if (ep) {
					this.activeOverlay = "episodeDetail";
					this.detailEpisode = ep;
					this.hasHistoryEntry = true;
				}
			});
		} else if (state?.overlay === "podcastDetail" && state?.feedUrl) {
			this.activeOverlay = "podcastDetail";
			this.detailPodcastFeedUrl = state.feedUrl as string;
			this.detailPodcastMeta = null;
			this.hasHistoryEntry = true;
		} else {
			this.resetState();
		}
	}

	handleNavigation(type: string) {
		if (type === "popstate") return;
		if (this.activeOverlay !== "none") {
			this.resetState();
		}
	}

	private syncHistory(wasActive: boolean, stateData: Record<string, unknown>) {
		if (wasActive && this.hasHistoryEntry) {
			history.replaceState(stateData, "");
		} else {
			history.pushState(stateData, "");
			this.hasHistoryEntry = true;
		}
	}
}

export const overlay = new OverlayManager();
