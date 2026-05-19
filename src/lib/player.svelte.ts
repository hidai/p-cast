import { liveQuery } from "dexie";
import { db, type Episode } from "./db";
import { i18n } from "./i18n";
import { resolveCoverUrl } from "./utils";

const PLAYBACK_RATE_STORAGE_KEY = "p-cast:playbackRate";

function loadStoredPlaybackRate(): number {
	if (typeof localStorage === "undefined") return 1.0;
	const raw = localStorage.getItem(PLAYBACK_RATE_STORAGE_KEY);
	if (!raw) return 1.0;
	const parsed = Number.parseFloat(raw);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : 1.0;
}

class PlayerState {
	currentEpisode: Episode | null = $state(null);
	isPlaying = $state(false);
	currentTime = $state(0);
	duration = $state(0);
	playbackRate = $state(loadStoredPlaybackRate());

	progress = $derived(this.duration > 0 ? this.currentTime / this.duration : 0);

	private audio: HTMLAudioElement | null = null;
	private saveInterval: ReturnType<typeof setInterval> | null = null;
	private blobUrl: string | null = null;
	private currentEpisodeSub: { unsubscribe(): void } | null = null;

	constructor() {
		if (typeof window !== "undefined") {
			this.audio = new Audio();
			this.audio.addEventListener("timeupdate", () => {
				this.currentTime = this.audio?.currentTime ?? 0;
			});
			this.audio.addEventListener("loadedmetadata", () => {
				this.duration = this.audio?.duration ?? 0;
			});
			this.audio.addEventListener("ended", async () => {
				this.isPlaying = false;
				this.stopSaveInterval();
				if (this.currentEpisode) {
					await db.episodes.update(this.currentEpisode.guid, {
						isCompleted: true,
						currentTime: 0,
						completedAt: Date.now(),
					});
					await this.playNext();
				}
			});
			this.audio.addEventListener("pause", () => {
				this.isPlaying = false;
				this.updateMediaSession();
				this.stopSaveInterval();
			});
			this.audio.addEventListener("play", () => {
				this.isPlaying = true;
				this.updateMediaSession();
				this.startSaveInterval();
			});
			this.initMediaSessionHandlers();
		}
	}

	private initMediaSessionHandlers() {
		if (!("mediaSession" in navigator)) return;
		navigator.mediaSession.setActionHandler("play", () => this.togglePlay());
		navigator.mediaSession.setActionHandler("pause", () => this.togglePlay());
		navigator.mediaSession.setActionHandler("seekbackward", () => this.skip(-10));
		navigator.mediaSession.setActionHandler("seekforward", () => this.skip(10));
	}

	// Keeps currentEpisode in sync with the DB row so external changes
	// (downloads, deletions, expiry cleanup, completion) flow into the player UI.
	private watchCurrentEpisode(guid: string) {
		this.currentEpisodeSub?.unsubscribe();
		this.currentEpisodeSub = liveQuery(() => db.episodes.get(guid)).subscribe((ep) => {
			if (ep && this.currentEpisode?.guid === guid) {
				this.currentEpisode = ep;
			}
		});
	}

	async play(episode: Episode) {
		if (!this.audio) return;

		// Save position of previous episode
		if (this.currentEpisode && this.currentEpisode.guid !== episode.guid) {
			await this.savePosition();
		}

		// Revoke previous blob URL to prevent memory leak
		if (this.blobUrl) {
			URL.revokeObjectURL(this.blobUrl);
			this.blobUrl = null;
		}

		// Fetch the latest state from DB to avoid stale snapshot issues
		const freshEpisode = await db.episodes.get(episode.guid);
		if (!freshEpisode) return;

		this.currentEpisode = freshEpisode;
		this.watchCurrentEpisode(freshEpisode.guid);

		// Record last played timestamp
		await db.episodes.update(freshEpisode.guid, { lastPlayedAt: Date.now() });

		// Try offline audio first
		if (freshEpisode.isDownloaded) {
			const audioFile = await db.audioFiles.get(freshEpisode.guid);
			if (audioFile) {
				this.blobUrl = URL.createObjectURL(audioFile.audioBlob);
				this.audio.src = this.blobUrl;
			}
		} else {
			this.audio.src = freshEpisode.audioUrl;
		}

		this.audio.playbackRate = this.playbackRate;

		// If completed, restart from beginning; otherwise resume from saved position
		if (freshEpisode.isCompleted) {
			this.audio.currentTime = 0;
			await db.episodes.update(freshEpisode.guid, {
				isCompleted: false,
				currentTime: 0,
				completedAt: undefined,
			});
		} else if (freshEpisode.currentTime > 0) {
			this.audio.currentTime = freshEpisode.currentTime;
		}

		try {
			await this.audio.play();
		} catch {
			this.isPlaying = false;
			return;
		}
		await this.setupMediaSession();
	}

	togglePlay() {
		if (!this.audio || !this.currentEpisode) return;
		if (this.isPlaying) {
			this.audio.pause();
		} else {
			this.audio.play();
		}
	}

	skip(seconds: number) {
		if (!this.audio) return;
		this.audio.currentTime = Math.max(0, Math.min(this.audio.currentTime + seconds, this.duration));
	}

	seek(time: number) {
		if (!this.audio) return;
		this.audio.currentTime = time;
	}

	setRate(rate: number) {
		this.playbackRate = rate;
		if (this.audio) {
			this.audio.playbackRate = rate;
		}
		localStorage.setItem(PLAYBACK_RATE_STORAGE_KEY, String(rate));
	}

	async savePosition() {
		if (this.currentEpisode && this.currentTime > 0) {
			await db.episodes.update(this.currentEpisode.guid, {
				currentTime: this.currentTime,
			});
		}
	}

	private async playNext() {
		if (!this.currentEpisode) return;
		const current = this.currentEpisode;
		const candidates = await db.episodes
			.where("podcastFeedUrl")
			.equals(current.podcastFeedUrl)
			.and((e) => e.pubDate > current.pubDate && !e.isCompleted)
			.sortBy("pubDate");
		if (candidates.length > 0) {
			await this.play(candidates[0]);
		}
	}

	private startSaveInterval() {
		if (this.saveInterval) clearInterval(this.saveInterval);
		this.saveInterval = setInterval(() => this.savePosition(), 10000);
	}

	private stopSaveInterval() {
		if (this.saveInterval) {
			clearInterval(this.saveInterval);
			this.saveInterval = null;
		}
	}

	destroy() {
		if (this.saveInterval) {
			clearInterval(this.saveInterval);
			this.saveInterval = null;
		}
		this.currentEpisodeSub?.unsubscribe();
		this.currentEpisodeSub = null;
		this.savePosition();
	}

	private async setupMediaSession() {
		if (!("mediaSession" in navigator) || !this.currentEpisode) return;

		const [coverUrl, podcast] = await Promise.all([
			resolveCoverUrl(this.currentEpisode),
			db.podcasts.get(this.currentEpisode.podcastFeedUrl),
		]);
		navigator.mediaSession.metadata = new MediaMetadata({
			title: this.currentEpisode.title,
			artist: podcast?.title ?? "",
			album: i18n.t("player.nowPlaying"),
			artwork: coverUrl ? [{ src: coverUrl }] : [],
		});
	}

	private updateMediaSession() {
		if (!("mediaSession" in navigator)) return;
		navigator.mediaSession.playbackState = this.isPlaying ? "playing" : "paused";
	}
}

export const player = new PlayerState();

if (typeof window !== "undefined") {
	window.addEventListener("beforeunload", () => player.savePosition());
}

if (import.meta.hot) {
	import.meta.hot.dispose(() => player.destroy());
}
