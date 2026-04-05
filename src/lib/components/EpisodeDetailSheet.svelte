<script lang="ts">
import DownloadSimple from "phosphor-svelte/lib/DownloadSimple";
import Play from "phosphor-svelte/lib/Play";
import Trash from "phosphor-svelte/lib/Trash";
import BottomSheet from "$lib/components/BottomSheet.svelte";
import CoverImage from "$lib/components/CoverImage.svelte";
import DownloadProgress from "$lib/components/DownloadProgress.svelte";
import { createCoverUrlState } from "$lib/cover-url.svelte";
import type { Episode } from "$lib/db";
import { db } from "$lib/db";
import { createDownloadState } from "$lib/download.svelte";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, formatDuration } from "$lib/podcast-service";
import { sanitizeHtml } from "$lib/utils";

let {
	episode,
}: {
	episode: Episode;
} = $props();

const downloading = createDownloadState();
let isDeleting = $state(false);

const cover = createCoverUrlState(() => episode);
let podcastTitle = $state("");

$effect(() => {
	podcastTitle = "";
	db.podcasts.get(episode.podcastFeedUrl).then((p) => {
		podcastTitle = p?.title ?? "";
	});
});

function openPodcast() {
	overlay.openPodcastDetail(episode.podcastFeedUrl);
}

function formatDate(ts: number): string {
	return i18n.formatDate(ts, { year: "numeric", month: "short", day: "numeric" });
}

// Is this episode currently loaded in the player?
let isCurrentEpisode = $derived(player.currentEpisode?.guid === episode.guid);
const episodeDownloadProgress = $derived(downloading.getProgress(episode.guid));

function handlePlay() {
	player.play(episode);
	overlay.closeAll();
}

function handleGoToPlayer() {
	overlay.openFullPlayer();
}

async function handleDownload() {
	await downloading.download(episode, async () => {
		episode = { ...episode, isDownloaded: true };
		if (player.currentEpisode?.guid === episode.guid) {
			player.currentEpisode = { ...player.currentEpisode, isDownloaded: true };
		}
	});
}

async function handleDeleteDownload() {
	isDeleting = true;
	try {
		await deleteDownload(episode.guid);
		episode = { ...episode, isDownloaded: false };
		if (player.currentEpisode?.guid === episode.guid) {
			player.currentEpisode = { ...player.currentEpisode, isDownloaded: false };
		}
	} finally {
		isDeleting = false;
	}
}
</script>

<BottomSheet initialTop={0.3}>
	<div class="px-5 pb-4">
		<!-- Header: cover + info -->
		<div class="flex gap-4 mb-4">
			<CoverImage src={cover.url} class="w-20 h-20 rounded-xl object-cover shrink-0 ring-1 ring-border-subtle" />
			<div class="min-w-0 flex-1">
				<h2 class="text-base font-bold leading-tight line-clamp-2">{episode.title}</h2>
				{#if podcastTitle}
					<button
						class="text-sm text-accent mt-1 truncate block max-w-full hover:underline"
						onclick={openPodcast}
					>{podcastTitle}</button>
				{/if}
				<p class="text-xs text-text-secondary mt-1">
					{formatDate(episode.pubDate)}
					{#if episode.duration > 0} · {formatDuration(episode.duration)}{/if}
					{#if episode.isDownloaded}<span class="text-accent"> · {i18n.t("episode.downloaded")}</span>{/if}
					{#if episode.currentTime > 0 && !episode.isCompleted}
						<span class="text-accent">
							· {formatDuration(episode.currentTime)} {i18n.t("episode.played")}</span
						>
					{/if}
				</p>
			</div>
		</div>

		<!-- Separator -->
		<div class="border-t border-border-subtle mb-4"></div>

		<!-- Description -->
		{#if episode.description}
			<div class="text-sm text-text-secondary leading-relaxed rich-description">
				{@html sanitizeHtml(episode.description)}
			</div>
		{:else}
			<p class="text-sm text-text-secondary italic">{i18n.t("episode.noDescription")}</p>
		{/if}
	</div>

	{#snippet footer()}
	<!-- Fixed footer: actions -->
	<div
		class="shrink-0 px-5 py-4 border-t border-border-subtle flex items-center gap-3"
		style="padding-bottom: max(1rem, env(safe-area-inset-bottom));"
	>
		{#if isCurrentEpisode}
			<button
				class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-bg-card text-accent font-medium text-sm border border-accent/30"
				onclick={handleGoToPlayer}
			>
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
					<rect x="3" y="8" width="3" height="8" rx="1" />
					<rect x="8.5" y="4" width="3" height="16" rx="1" />
					<rect x="14" y="6" width="3" height="12" rx="1" />
					<rect x="19.5" y="9" width="3" height="6" rx="1" />
				</svg>
				{i18n.t("episode.nowPlaying")}
			</button>
		{:else}
			<button
				class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-medium text-sm shadow-md shadow-accent/20 active:scale-95 transition-transform"
				onclick={handlePlay}
			>
				<Play size={20} weight="fill" />
				{#if episode.currentTime > 0 && !episode.isCompleted}
					{i18n.t("episode.resume")}
				{:else}
					{i18n.t("episode.play")}
				{/if}
			</button>
		{/if}

		{#if episode.isDownloaded}
			<button
				class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-card text-danger font-medium text-sm"
				onclick={handleDeleteDownload}
			>
				<Trash size={20} />
				{i18n.t("episode.delete")}
			</button>
		{:else}
			<button
				class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-card text-text-secondary font-medium text-sm disabled:opacity-50"
				onclick={handleDownload}
				disabled={episodeDownloadProgress !== null || isDeleting}
			>
				{#if episodeDownloadProgress !== null}
					<DownloadProgress progress={episodeDownloadProgress} />
				{:else}
					<DownloadSimple size={20} />
				{/if}
				{i18n.t("episode.download")}
			</button>
		{/if}
	</div>
	{/snippet}
</BottomSheet>
