<script lang="ts">
import { cubicIn, cubicOut } from "svelte/easing";
import { fly } from "svelte/transition";
import DownloadProgress from "$lib/components/DownloadProgress.svelte";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, downloadEpisode, formatDuration } from "$lib/podcast-service";
import { resolveCoverUrl } from "$lib/utils";

const rates = [0.5, 0.75, 1.0, 1.2, 1.5, 2.0];
let isDownloading = $state(false);
let downloadProgress = $state(0);

let touchStartY = 0;

function handleTouchStart(e: TouchEvent) {
	touchStartY = e.touches[0].clientY;
}

function handleTouchEnd(e: TouchEvent) {
	const diff = e.changedTouches[0].clientY - touchStartY;
	if (diff > 100) {
		overlay.closeAll();
	}
}

function handleSeek(e: Event) {
	const input = e.target as HTMLInputElement;
	player.seek(Number(input.value));
}

async function toggleDownload() {
	if (!player.currentEpisode) return;
	isDownloading = true;
	try {
		if (player.currentEpisode.isDownloaded) {
			await deleteDownload(player.currentEpisode.guid);
			player.currentEpisode = { ...player.currentEpisode, isDownloaded: false };
		} else {
			downloadProgress = 0;
			await downloadEpisode(player.currentEpisode, (p) => {
				downloadProgress = p;
			});
			player.currentEpisode = { ...player.currentEpisode, isDownloaded: true };
		}
	} finally {
		isDownloading = false;
	}
}

let coverUrl = $state("");

$effect(() => {
	const episode = player.currentEpisode;
	coverUrl = "";
	if (!episode) return;
	resolveCoverUrl(episode).then((url) => {
		coverUrl = url;
	});
});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 bg-bg-primary flex flex-col"
	in:fly={{ y: window.innerHeight, duration: 300, easing: cubicOut }}
	out:fly={{ y: window.innerHeight, duration: 300, easing: cubicIn }}
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
>
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-3">
		<button class="text-text-secondary active:scale-95 transition-transform" onclick={() => overlay.closeAll()} aria-label="Close player">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		<span class="text-sm text-text-secondary">{i18n.t("player.nowPlaying")}</span>
		<div class="w-6"></div>
	</div>

	<!-- Artwork -->
	<div class="flex-1 flex items-center justify-center px-8">
		{#if coverUrl}
			<img src={coverUrl} alt="Cover" class="w-full max-w-80 rounded-2xl shadow-2xl aspect-square object-cover ring-1 ring-border-subtle" />
		{:else}
			<div class="w-full max-w-80 rounded-2xl bg-bg-card aspect-square flex items-center justify-center ring-1 ring-border-subtle">
				<svg class="w-24 h-24 text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
				</svg>
			</div>
		{/if}
	</div>

	<!-- Info & Controls -->
	<div class="px-6 pb-8 pt-4">
		<div class="flex items-center gap-2">
			<h2 class="text-lg font-semibold truncate flex-1">{player.currentEpisode?.title}</h2>
			<button
				class="shrink-0 text-xs text-accent border border-accent/30 rounded-full px-2.5 py-1 hover:bg-accent-subtle active:scale-95 transition-all"
				onclick={() => {
					if (player.currentEpisode) {
						overlay.openEpisodeDetail(player.currentEpisode);
					}
				}}
			>
				{i18n.t("player.details")}
			</button>
		</div>

		<!-- Seek bar -->
		<div class="mt-4">
			<input
				type="range"
				min="0"
				max={player.duration || 0}
				value={player.currentTime}
				oninput={handleSeek}
				class="seek-bar w-full h-1 appearance-none bg-border rounded-full accent-accent"
				style="--seek-progress: {player.duration ? (player.currentTime / player.duration) * 100 : 0}%"
			/>
			<div class="flex justify-between text-xs text-text-secondary mt-1">
				<span>{formatDuration(player.currentTime)}</span>
				<span>-{formatDuration(Math.max(0, player.duration - player.currentTime))}</span>
			</div>
		</div>

		<!-- Controls -->
		<div class="flex items-center justify-center gap-8 mt-4">
			<button class="text-text-secondary active:scale-95 transition-transform" onclick={() => player.skip(-10)}>
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
				</svg>
				<span class="text-xs block">10s</span>
			</button>
			<button
				class="w-16 h-16 flex items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/25 active:scale-95 transition-transform"
				onclick={() => player.togglePlay()}
			>
				{#if player.isPlaying}
					<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
					</svg>
				{:else}
					<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{/if}
			</button>
			<button class="text-text-secondary active:scale-95 transition-transform" onclick={() => player.skip(10)}>
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
				</svg>
				<span class="text-xs block">10s</span>
			</button>
		</div>

		<!-- Rate & Download -->
		<div class="flex items-center justify-between mt-6">
			<div class="flex gap-1">
				{#each rates as rate}
					<button
						class="px-2.5 py-1 text-xs rounded-lg font-medium transition-colors {player.playbackRate === rate ? 'bg-accent-subtle text-accent' : 'bg-bg-card text-text-tertiary hover:text-text-secondary'}"
						onclick={() => player.setRate(rate)}
					>
						{rate}x
					</button>
				{/each}
			</div>
			<button
				class="p-2 rounded-full disabled:opacity-50 active:scale-95 transition-transform {player.currentEpisode?.isDownloaded ? 'text-accent' : 'text-text-secondary'}"
				onclick={toggleDownload}
				disabled={isDownloading}
				aria-label="Toggle download"
			>
				{#if isDownloading}
					<DownloadProgress progress={downloadProgress} class="w-6 h-6" />
				{:else}
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
					</svg>
				{/if}
			</button>
		</div>
	</div>
</div>

<style>
	.seek-bar::-webkit-slider-runnable-track {
		height: 4px;
		border-radius: 9999px;
		background: linear-gradient(
			to right,
			var(--color-accent) 0%,
			var(--color-accent) var(--seek-progress),
			var(--color-border) var(--seek-progress),
			var(--color-border) 100%
		);
	}

	.seek-bar::-moz-range-track {
		height: 4px;
		border-radius: 9999px;
		background: var(--color-border);
	}

	.seek-bar::-moz-range-progress {
		height: 4px;
		border-radius: 9999px;
		background: var(--color-accent);
	}

	.seek-bar::-webkit-slider-thumb {
		-webkit-appearance: none;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--color-accent);
		margin-top: -6px;
	}

	.seek-bar::-moz-range-thumb {
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--color-accent);
		border: none;
	}
</style>
