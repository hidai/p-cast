<script lang="ts">
import { liveQuery } from "dexie";
import DownloadSimple from "phosphor-svelte/lib/DownloadSimple";
import Play from "phosphor-svelte/lib/Play";
import Trash from "phosphor-svelte/lib/Trash";
import BottomSheet from "$lib/components/BottomSheet.svelte";
import CoverImage from "$lib/components/CoverImage.svelte";
import DownloadProgress from "$lib/components/DownloadProgress.svelte";
import PlayingIndicator from "$lib/components/PlayingIndicator.svelte";
import { createCoverUrlState } from "$lib/cover-url.svelte";
import type { Episode, EpisodeSortOrder } from "$lib/db";
import { db } from "$lib/db";
import { downloads } from "$lib/download.svelte";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, formatDuration } from "$lib/podcast-service";
import { resizeMzstatic, sanitizeHtml } from "$lib/utils";

let {
	episode,
}: {
	episode: Episode;
} = $props();

let isDeleting = $state(false);

// Live episode state from DB — guid-matched so a stale dbEpisode from a previous
// navigation never shadows the current prop while the new liveQuery is settling.
let dbEpisode = $state<Episode | null>(null);
const view = $derived(dbEpisode && dbEpisode.guid === episode.guid ? dbEpisode : episode);

const cover = createCoverUrlState(() => view);
let podcastTitle = $state("");

// Film strip state
let dbSiblings = $state<Episode[]>([]);
let podcastSortOrder = $state<EpisodeSortOrder>("newest");
let stripLoading = $state(true);
let stripEl = $state<HTMLElement | undefined>(undefined);

// Memoize feedUrl so the podcast/siblings effect only re-runs when the podcast
// actually changes — same-podcast navigation keeps title and strip data intact.
const feedUrl = $derived(episode.podcastFeedUrl);

const siblingEpisodes = $derived(
	[...dbSiblings].sort((a, b) =>
		podcastSortOrder === "newest" ? b.pubDate - a.pubDate : a.pubDate - b.pubDate,
	),
);
const currentIndex = $derived(siblingEpisodes.findIndex((ep) => ep.guid === view.guid));
const positionLabel = $derived(
	currentIndex >= 0 ? `${currentIndex + 1} / ${siblingEpisodes.length}` : "",
);

$effect(() => {
	const guid = episode.guid;
	const sub = liveQuery(() => db.episodes.get(guid)).subscribe((ep) => {
		dbEpisode = ep ?? null;
	});
	return () => sub.unsubscribe();
});

$effect(() => {
	const f = feedUrl;
	stripLoading = true;
	dbSiblings = [];
	podcastTitle = "";
	const podcastSub = liveQuery(() => db.podcasts.get(f)).subscribe((p) => {
		podcastTitle = p?.title ?? "";
		podcastSortOrder = p?.episodeSortOrder ?? "newest";
	});
	const siblingsSub = liveQuery(() =>
		db.episodes.where("podcastFeedUrl").equals(f).toArray(),
	).subscribe((eps) => {
		dbSiblings = eps;
		stripLoading = false;
	});
	return () => {
		podcastSub.unsubscribe();
		siblingsSub.unsubscribe();
	};
});

// All strip items are uniform w-16 (64px) wide — scroll math is simple arithmetic.
// Cover image sizes vary inside a fixed-height container to show visual hierarchy.
// gap-3=12, px-8=32
function scrollToCurrentIndex() {
	if (!stripEl || currentIndex < 0 || siblingEpisodes.length === 0) return;
	const ITEM_WIDTH = 64; // w-16
	const GAP = 12; // gap-3
	const PADDING = 32; // px-8
	stripEl.scrollLeft =
		PADDING + currentIndex * (ITEM_WIDTH + GAP) + ITEM_WIDTH / 2 - stripEl.clientWidth / 2;
}

$effect(() => {
	if (currentIndex < 0 || !stripEl || siblingEpisodes.length === 0) return;
	const rafId = requestAnimationFrame(scrollToCurrentIndex);
	return () => cancelAnimationFrame(rafId);
});

function openPodcast() {
	overlay.openPodcastDetail(view.podcastFeedUrl);
}

function handleStripNavigate(ep: Episode) {
	if (ep.guid === view.guid) return;
	overlay.openEpisodeDetail(ep);
}

function stripItemClasses(i: number) {
	const d = Math.abs(i - currentIndex);
	const coverSize = d === 0 ? "w-14 h-14" : d === 1 ? "w-11 h-11" : "w-9 h-9";
	const opacity = d === 0 ? "opacity-100" : d === 1 ? "opacity-60" : "opacity-30";
	const ring = d === 0 ? "ring-2 ring-accent" : "";
	return { coverSize, opacity, ring };
}

function formatDate(ts: number): string {
	return i18n.formatDate(ts, { year: "numeric", month: "short", day: "numeric" });
}

function shortDate(ts: number): string {
	return i18n.formatDate(ts, { month: "short", day: "numeric" });
}

const isCurrentEpisode = $derived(player.currentEpisode?.guid === view.guid);
const episodeDownloadProgress = $derived(downloads.getProgress(view.guid));

function handlePlay() {
	player.play(view);
	overlay.closeAll();
}

function handleGoToPlayer() {
	overlay.openFullPlayer();
}

async function handleDownload() {
	await downloads.download(view);
}

async function handleDeleteDownload() {
	isDeleting = true;
	try {
		await deleteDownload(view.guid);
	} finally {
		isDeleting = false;
	}
}
</script>

<BottomSheet initialTop={0.3}>
	<div class="px-5 pb-4">
		<!-- Header: cover + info -->
		<div class="flex gap-4 mb-4">
			<CoverImage src={resizeMzstatic(cover.url, 160)} class="w-20 h-20 rounded-xl object-cover shrink-0 ring-1 ring-border-subtle" />
			<div class="min-w-0 flex-1">
				<h2 class="text-base font-bold leading-tight line-clamp-2">{view.title}</h2>
				{#if podcastTitle}
					<button
						class="text-sm text-accent mt-1 truncate block max-w-full hover:underline"
						onclick={openPodcast}
					>{podcastTitle}</button>
				{/if}
				<p class="text-xs text-text-secondary mt-1 truncate">
					{formatDate(view.pubDate)}
					{#if view.duration > 0} · {formatDuration(view.duration)}{/if}
					{#if view.isDownloaded}<span class="text-accent"> · {i18n.t("episode.downloaded")}</span>{/if}
					{#if view.currentTime > 0 && !view.isCompleted}
						<span class="text-accent"
							> · {formatDuration(view.currentTime)} {i18n.t("episode.played")}</span
						>
					{/if}
				</p>
			</div>
		</div>

		<!-- Film strip: episode navigator -->
		{#if siblingEpisodes.length > 1 || stripLoading}
			<div class="mb-3">
				{#if positionLabel}
					<p class="text-xs text-text-tertiary text-center mb-2 tabular-nums">{positionLabel}</p>
				{/if}
				<div class="relative">
					<!-- Left/right gradient fades -->
					<div
						class="absolute left-0 inset-y-0 w-8 z-10 pointer-events-none"
						style="background: linear-gradient(to right, var(--color-bg-secondary), transparent);"
					></div>
					<div
						class="absolute right-0 inset-y-0 w-8 z-10 pointer-events-none"
						style="background: linear-gradient(to left, var(--color-bg-secondary), transparent);"
					></div>
					<!-- Scroll row -->
					<div
						bind:this={stripEl}
						class="strip-scroll flex items-start gap-3 overflow-x-auto px-8 py-1"
					>
						{#if stripLoading && siblingEpisodes.length === 0}
							{#each Array(5) as _, i (i)}
								<div class="w-16 shrink-0 flex flex-col items-center gap-1">
									<div class="w-14 h-14 rounded-lg bg-bg-card animate-pulse"></div>
									<div class="h-2.5 w-10 rounded bg-bg-card animate-pulse"></div>
									<div class="h-2 w-8 rounded bg-bg-card animate-pulse"></div>
								</div>
							{/each}
						{:else}
							{#each siblingEpisodes as ep, i (ep.guid)}
								{@const cls = stripItemClasses(i)}
								<button
									class="shrink-0 w-16 flex flex-col items-center gap-1 transition-opacity duration-200 {cls.opacity}"
									data-strip-index={i}
									onclick={() => handleStripNavigate(ep)}
									aria-label={ep.title}
									aria-current={ep.guid === view.guid ? "true" : undefined}
								>
									<!-- Fixed-height cover container: centers varying cover sizes vertically -->
									<div class="w-full h-14 flex items-center justify-center">
										<div class="rounded-lg overflow-hidden transition-all duration-200 {cls.coverSize} {cls.ring}">
											<CoverImage src={resizeMzstatic(ep.coverUrl, 112)} class="w-full h-full object-cover" />
										</div>
									</div>
									<span class="w-full text-[10px] leading-tight text-text-secondary truncate text-center">
										{ep.title}
									</span>
									<span class="text-[9px] text-text-tertiary tabular-nums">
										{shortDate(ep.pubDate)}
									</span>
								</button>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<!-- Separator -->
		<div class="border-t border-border-subtle mb-4"></div>

		<!-- Description -->
		{#if view.description}
			<div class="text-sm text-text-secondary leading-relaxed rich-description">
				{@html sanitizeHtml(view.description)}
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
				<PlayingIndicator playing={isCurrentEpisode && player.isPlaying} />
				{i18n.t("episode.nowPlaying")}
			</button>
		{:else}
			<button
				class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-accent text-white font-medium text-sm shadow-md shadow-accent/20 active:scale-95 transition-transform"
				onclick={handlePlay}
			>
				<Play size={20} weight="fill" />
				{#if view.currentTime > 0 && !view.isCompleted}
					{i18n.t("episode.resume")}
				{:else}
					{i18n.t("episode.play")}
				{/if}
			</button>
		{/if}

		{#if view.isDownloaded}
			<button
				class="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-bg-card text-danger font-medium text-sm disabled:opacity-50"
				onclick={handleDeleteDownload}
				disabled={isDeleting}
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

<style>
	.strip-scroll {
		scrollbar-width: none;
	}
	.strip-scroll::-webkit-scrollbar {
		display: none;
	}
</style>
