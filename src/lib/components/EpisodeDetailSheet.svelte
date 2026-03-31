<script lang="ts">
import BottomSheet from "$lib/components/BottomSheet.svelte";
import type { Episode } from "$lib/db";
import { db } from "$lib/db";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, downloadEpisode, formatDuration } from "$lib/podcast-service";
import { sanitizeHtml } from "$lib/utils";

let {
	episode,
}: {
	episode: Episode;
} = $props();

let isDownloading = $state(false);
let downloadProgress = $state(0);

// Cover URL with fallback to podcast cover
let coverUrl = $state("");
$effect(() => {
	if (episode.coverUrl) {
		coverUrl = episode.coverUrl;
	} else {
		db.podcasts.get(episode.podcastFeedUrl).then((p) => {
			coverUrl = p?.coverUrl ?? "";
		});
	}
});

// Podcast name
let podcastTitle = $state("");
$effect(() => {
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
				<img src={coverUrl} alt="" class="w-20 h-20 rounded-xl object-cover shrink-0" />
			{:else}
				<div
					class="w-20 h-20 rounded-xl bg-bg-card flex items-center justify-center shrink-0"
				>
					<svg
						class="w-8 h-8 text-text-secondary"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="1.5"
							d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z"
						/>
					</svg>
				</div>
			{/if}
			<div class="min-w-0 flex-1">
				<h2 class="text-base font-bold leading-tight line-clamp-2">{episode.title}</h2>
				{#if podcastTitle}
					<button
						class="text-sm text-accent mt-1 truncate block hover:underline"
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
		<div class="border-t border-border mb-4"></div>

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
		class="shrink-0 px-5 py-4 border-t border-border flex items-center gap-3"
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
				class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-medium text-sm"
				onclick={handlePlay}
			>
				<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
					<path d="M8 5v14l11-7z" />
				</svg>
				{#if episode.currentTime > 0 && !episode.isCompleted}
					{i18n.t("episode.resume")}
				{:else}
					{i18n.t("episode.play")}
				{/if}
			</button>
		{/if}

		{#if episode.isDownloaded}
			<button
				class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-card text-red-400 font-medium text-sm"
				onclick={handleDeleteDownload}
			>
				<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
					/>
				</svg>
				{i18n.t("episode.delete")}
			</button>
		{:else}
			<button
				class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-card text-text-secondary font-medium text-sm disabled:opacity-50"
				onclick={handleDownload}
				disabled={isDownloading}
			>
				{#if isDownloading}
					{@const pct = Math.round(downloadProgress * 100)}
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							class="opacity-25"
						/>
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-dasharray={2 * Math.PI * 10}
							stroke-dashoffset={2 * Math.PI * 10 * (1 - downloadProgress)}
							stroke-linecap="round"
							transform="rotate(-90 12 12)"
							class="text-accent transition-[stroke-dashoffset] duration-300"
						/>
						<text
							x="12"
							y="12"
							text-anchor="middle"
							dominant-baseline="central"
							fill="currentColor"
							font-size="7"
							class="text-accent">{pct}</text
						>
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
				{/if}
				{i18n.t("episode.download")}
			</button>
		{/if}
	</div>
	{/snippet}
</BottomSheet>

<style>
	.rich-description :global(a) {
		color: var(--color-accent);
		text-decoration: underline;
	}

	.rich-description :global(p) {
		margin-bottom: 0.75rem;
	}

	.rich-description :global(img) {
		max-width: 100%;
		border-radius: 0.5rem;
		margin: 0.5rem 0;
	}
</style>
