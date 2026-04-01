<script lang="ts">
import DownloadSimple from "phosphor-svelte/lib/DownloadSimple";
import MusicNote from "phosphor-svelte/lib/MusicNote";
import Play from "phosphor-svelte/lib/Play";
import Trash from "phosphor-svelte/lib/Trash";
import BottomSheet from "$lib/components/BottomSheet.svelte";
import DownloadProgress from "$lib/components/DownloadProgress.svelte";
import type { Episode } from "$lib/db";
import { db } from "$lib/db";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, downloadEpisode, formatDuration } from "$lib/podcast-service";
import { resolveCoverUrl, sanitizeHtml } from "$lib/utils";

let {
	episode,
}: {
	episode: Episode;
} = $props();

let isDownloading = $state(false);
let downloadProgress = $state(0);

let coverUrl = $state("");
let podcastTitle = $state("");

$effect(() => {
	coverUrl = "";
	podcastTitle = "";
	resolveCoverUrl(episode).then((url) => {
		coverUrl = url;
	});
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

function handlePlay() {
	player.play(episode);
	overlay.closeAll();
}

function handleGoToPlayer() {
	overlay.openFullPlayer();
}

async function handleDownload() {
	isDownloading = true;
	downloadProgress = 0;
	try {
		await downloadEpisode(episode, (p) => {
			downloadProgress = p;
		});
		episode = { ...episode, isDownloaded: true };
	} finally {
		isDownloading = false;
	}
}

async function handleDeleteDownload() {
	await deleteDownload(episode.guid);
	episode = { ...episode, isDownloaded: false };
}
</script>

<BottomSheet initialTop={0.3}>
	<div class="px-5 pb-4">
		<!-- Header: cover + info -->
		<div class="flex gap-4 mb-4">
			{#if coverUrl}
				<img src={coverUrl} alt="" class="w-20 h-20 rounded-xl object-cover shrink-0 ring-1 ring-border-subtle" />
			{:else}
				<div
					class="w-20 h-20 rounded-xl bg-bg-card flex items-center justify-center shrink-0"
				>
					<MusicNote size={32} weight="light" class="text-text-secondary" />
				</div>
			{/if}
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
				disabled={isDownloading}
			>
				{#if isDownloading}
					<DownloadProgress progress={downloadProgress} />
				{:else}
					<DownloadSimple size={20} />
				{/if}
				{i18n.t("episode.download")}
			</button>
		{/if}
	</div>
	{/snippet}
</BottomSheet>
