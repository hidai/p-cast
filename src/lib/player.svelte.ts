import { type Episode, db } from "./db";

class PlayerState {
	currentEpisode: Episode | null = $state(null);
	isPlaying = $state(false);
	currentTime = $state(0);
	duration = $state(0);
	playbackRate = $state(1.0);
	isFullPlayer = $state(false);

	progress = $derived(this.duration > 0 ? this.currentTime / this.duration : 0);

	private audio: HTMLAudioElement | null = null;
	private saveInterval: ReturnType<typeof setInterval> | null = null;

	constructor() {
		if (typeof window !== "undefined") {
			this.audio = new Audio();
			this.audio.addEventListener("timeupdate", () => {
				this.currentTime = this.audio?.currentTime;
			});
			this.audio.addEventListener("loadedmetadata", () => {
				this.duration = this.audio?.duration;
			});
			this.audio.addEventListener("ended", () => {
				this.isPlaying = false;
				if (this.currentEpisode) {
					db.episodes.update(this.currentEpisode.guid, {
						isCompleted: true,
						currentTime: 0,
					});
				}
			});
			this.audio.addEventListener("pause", () => {
				this.isPlaying = false;
				this.updateMediaSession();
			});
			this.audio.addEventListener("play", () => {
				this.isPlaying = true;
				this.updateMediaSession();
			});
		}
	}

	async play(episode: Episode) {
		if (!this.audio) return;

		// Save position of previous episode
		if (this.currentEpisode && this.currentEpisode.guid !== episode.guid) {
			await this.savePosition();
		}

		this.currentEpisode = episode;

		// Try offline audio first
		if (episode.isDownloaded) {
			const audioFile = await db.audioFiles.get(episode.guid);
			if (audioFile) {
				const url = URL.createObjectURL(audioFile.audioBlob);
				this.audio.src = url;
			}
		} else {
			this.audio.src = episode.audioUrl;
		}

		this.audio.playbackRate = this.playbackRate;
		if (episode.currentTime > 0) {
			this.audio.currentTime = episode.currentTime;
		}

		await this.audio.play();
		this.setupMediaSession();
		this.startSaveInterval();
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
	}

	async savePosition() {
		if (this.currentEpisode && this.currentTime > 0) {
			await db.episodes.update(this.currentEpisode.guid, {
				currentTime: this.currentTime,
			});
		}
	}

	private startSaveInterval() {
		if (this.saveInterval) clearInterval(this.saveInterval);
		this.saveInterval = setInterval(() => this.savePosition(), 10000);
	}

	private setupMediaSession() {
		if (!("mediaSession" in navigator) || !this.currentEpisode) return;

		navigator.mediaSession.metadata = new MediaMetadata({
			title: this.currentEpisode.title,
			artist: "",
			album: "Podcast",
		});

		navigator.mediaSession.setActionHandler("play", () => this.togglePlay());
		navigator.mediaSession.setActionHandler("pause", () => this.togglePlay());
		navigator.mediaSession.setActionHandler("seekbackward", () => this.skip(-10));
		navigator.mediaSession.setActionHandler("seekforward", () => this.skip(10));
	}

	private updateMediaSession() {
		if (!("mediaSession" in navigator)) return;
		navigator.mediaSession.playbackState = this.isPlaying ? "playing" : "paused";
	}
}

export const player = new PlayerState();
