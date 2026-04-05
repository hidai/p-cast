<script lang="ts">
import ArrowClockwise from "phosphor-svelte/lib/ArrowClockwise";
import ArrowCounterClockwise from "phosphor-svelte/lib/ArrowCounterClockwise";
import CaretDown from "phosphor-svelte/lib/CaretDown";
import DownloadSimple from "phosphor-svelte/lib/DownloadSimple";
import MusicNote from "phosphor-svelte/lib/MusicNote";
import Pause from "phosphor-svelte/lib/Pause";
import Play from "phosphor-svelte/lib/Play";
import { cubicIn, cubicOut } from "svelte/easing";
import { fly } from "svelte/transition";
import DownloadProgress from "$lib/components/DownloadProgress.svelte";
import { createCoverUrlState } from "$lib/cover-url.svelte";
import { createDownloadState } from "$lib/download.svelte";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, formatDuration } from "$lib/podcast-service";

const rates = [0.5, 0.75, 1.0, 1.2, 1.5, 2.0];
const downloading = createDownloadState();
let isDeleting = $state(false);

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
	if (player.currentEpisode.isDownloaded) {
		isDeleting = true;
		try {
			await deleteDownload(player.currentEpisode.guid);
			player.currentEpisode = { ...player.currentEpisode, isDownloaded: false };
		} finally {
			isDeleting = false;
		}
	} else {
		const episode = player.currentEpisode;
		await downloading.download(episode, async () => {
			if (player.currentEpisode?.guid === episode.guid) {
				player.currentEpisode = { ...player.currentEpisode, isDownloaded: true };
			}
		});
	}
}

const currentDownloadProgress = $derived(
	player.currentEpisode ? downloading.getProgress(player.currentEpisode.guid) : null,
);

const cover = createCoverUrlState(() => player.currentEpisode);
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
		<button class="text-text-secondary active:scale-95 transition-transform" onclick={() => overlay.closeAll()} aria-label={i18n.t("player.close")}>
			<CaretDown size={24} />
		</button>
		<span class="text-sm text-text-secondary">{i18n.t("player.nowPlaying")}</span>
		<div class="w-6"></div>
	</div>

	<!-- Artwork -->
	<div class="flex-1 flex items-center justify-center px-8">
		{#if cover.url}
			<img src={cover.url} alt="Cover" class="w-full max-w-80 rounded-2xl shadow-2xl aspect-square object-cover ring-1 ring-border-subtle" />
		{:else}
			<div class="w-full max-w-80 rounded-2xl bg-bg-card aspect-square flex items-center justify-center ring-1 ring-border-subtle">
				<MusicNote size={96} weight="light" class="text-text-tertiary" />
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
				<ArrowCounterClockwise size={32} weight="fill" />
				<span class="text-xs block">10s</span>
			</button>
			<button
				class="w-16 h-16 flex items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/25 active:scale-95 transition-transform"
				onclick={() => player.togglePlay()}
			>
				{#if player.isPlaying}
					<Pause size={32} weight="fill" />
				{:else}
					<Play size={32} weight="fill" />
				{/if}
			</button>
			<button class="text-text-secondary active:scale-95 transition-transform" onclick={() => player.skip(10)}>
				<ArrowClockwise size={32} weight="fill" />
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
				disabled={currentDownloadProgress !== null || isDeleting}
				aria-label={i18n.t("player.toggleDownload")}
			>
				{#if currentDownloadProgress !== null}
					<DownloadProgress progress={currentDownloadProgress} class="w-6 h-6" />
				{:else}
					<DownloadSimple size={24} />
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
