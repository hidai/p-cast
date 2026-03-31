import { db, type Episode } from "./db";

class OverlayManager {
	activeOverlay: "none" | "fullPlayer" | "episodeDetail" = $state("none");
	detailEpisode: Episode | null = $state(null);

	private hasHistoryEntry = false;
	private ignoringPopState = false;

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
		this.syncHistory(wasActive, { overlay: "episodeDetail", episodeGuid: episode.guid });
	}

	closeAll() {
		if (this.activeOverlay === "none") return;
		this.activeOverlay = "none";
		this.detailEpisode = null;
		if (this.hasHistoryEntry) {
			this.ignoringPopState = true;
			this.hasHistoryEntry = false;
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
		} else {
			this.activeOverlay = "none";
			this.detailEpisode = null;
			this.hasHistoryEntry = false;
		}
	}

	handleNavigation(type: string) {
		if (type === "popstate") return;
		if (this.activeOverlay !== "none") {
			this.activeOverlay = "none";
			this.detailEpisode = null;
			this.hasHistoryEntry = false;
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
