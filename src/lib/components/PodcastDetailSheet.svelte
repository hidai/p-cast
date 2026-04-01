<script lang="ts">
import { liveQuery } from "dexie";
import CaretDown from "phosphor-svelte/lib/CaretDown";
import Check from "phosphor-svelte/lib/Check";
import SortAscending from "phosphor-svelte/lib/SortAscending";
import BottomSheet from "$lib/components/BottomSheet.svelte";
import EpisodeItem from "$lib/components/EpisodeItem.svelte";
import Spinner from "$lib/components/Spinner.svelte";
import { db, type Episode, type EpisodeSortOrder, type Podcast } from "$lib/db";
import { createDownloadState } from "$lib/download.svelte";
import { i18n } from "$lib/i18n";
import { overlay, type PodcastMeta } from "$lib/overlay.svelte";
import {
	fetchEpisodes,
	type SearchResult,
	subscribePodcast,
	unsubscribePodcast,
} from "$lib/podcast-service";
import { sanitizeHtml } from "$lib/utils";

let {
	feedUrl,
	meta = null,
}: {
	feedUrl: string;
	meta?: PodcastMeta | null;
} = $props();

let dbPodcast = $state<Podcast | null>(null);
const title = $derived(dbPodcast?.title || meta?.title || "");
const author = $derived(dbPodcast?.author || meta?.author || "");
const coverUrl = $derived(dbPodcast?.coverUrl || meta?.coverUrl || "");

let isSubscribed = $state(false);
let episodes: Episode[] = $state([]);
let isLoading = $state(true);
let isToggling = $state(false);
const downloading = createDownloadState();
let sortOrder: EpisodeSortOrder = $state("newest");
let sortMenuOpen = $state(false);
let podcastDescription = $state("");
let descriptionExpanded = $state(false);

$effect(() => {
	if (!feedUrl) return;

	const sub = liveQuery(() => db.podcasts.get(feedUrl)).subscribe((val) => {
		dbPodcast = val ?? null;
		isSubscribed = !!val;
		if (val?.episodeSortOrder) {
			sortOrder = val.episodeSortOrder;
		}
		if (val?.description) {
			podcastDescription = val.description;
		}
	});

	loadEpisodes();

	return () => sub.unsubscribe();
});

function sortEpisodes(eps: Episode[], order: EpisodeSortOrder): Episode[] {
	return [...eps].sort((a, b) =>
		order === "newest" ? b.pubDate - a.pubDate : a.pubDate - b.pubDate,
	);
}

async function loadEpisodes() {
	isLoading = true;
	try {
		const { episodes: raw, podcastDescription: feedDescription } = await fetchEpisodes(feedUrl);
		if (feedDescription && !podcastDescription) {
			podcastDescription = feedDescription;
		}
		for (const ep of raw) {
			const existing = await db.episodes.get(ep.guid);
			if (!existing) {
				await db.episodes.put({ ...ep, isDownloaded: false });
			}
		}
		const all = await db.episodes.where("podcastFeedUrl").equals(feedUrl).toArray();
		episodes = sortEpisodes(all, sortOrder);
	} catch {
		episodes = [];
	}
	isLoading = false;
}

async function changeSortOrder(order: EpisodeSortOrder) {
	sortOrder = order;
	sortMenuOpen = false;
	episodes = sortEpisodes(episodes, order);
	const podcast = await db.podcasts.get(feedUrl);
	if (podcast) {
		await db.podcasts.update(feedUrl, { episodeSortOrder: order });
	}
}

async function toggleSubscribe() {
	isToggling = true;
	try {
		if (isSubscribed) {
			await unsubscribePodcast(feedUrl);
		} else {
			const result: SearchResult = {
				feedUrl,
				trackName: title,
				artistName: author,
				artworkUrl100: coverUrl,
				artworkUrl600: coverUrl,
			};
			await subscribePodcast(result);
		}
	} finally {
		isToggling = false;
	}
}

function handleDownload(episode: Episode) {
	downloading.download(episode, async () => {
		const all = await db.episodes.where("podcastFeedUrl").equals(feedUrl).toArray();
		episodes = sortEpisodes(all, sortOrder);
	});
}
</script>

<BottomSheet initialTop={0.15}>
	<div class="px-4 pb-4">
		<!-- Podcast header -->
		<div class="flex gap-4 mb-6">
			{#if coverUrl}
				<img src={coverUrl} alt="" class="w-24 h-24 rounded-xl object-cover shrink-0 shadow-lg ring-1 ring-border-subtle" />
			{/if}
			<div class="min-w-0">
				<h1 class="text-lg font-bold leading-tight">{title}</h1>
				<p class="text-sm text-text-secondary mt-1">{author}</p>
				<button
					class="mt-3 px-4 py-1.5 rounded-xl text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all {isSubscribed
						? 'bg-accent-subtle text-accent border border-accent/20'
						: 'bg-accent text-white shadow-md shadow-accent/20'}"
					onclick={toggleSubscribe}
					disabled={isToggling}
				>
					{#if isToggling}
						<Spinner class="w-3.5 h-3.5" />
					{/if}
					{isSubscribed ? i18n.t("podcast.unsubscribe") : i18n.t("podcast.subscribe")}
				</button>
			</div>
		</div>

		<!-- Podcast description -->
		{#if podcastDescription}
			<div class="mb-6">
				<div
					class="text-sm text-text-secondary leading-relaxed rich-description {descriptionExpanded ? '' : 'line-clamp-2'}"
				>
					{@html sanitizeHtml(podcastDescription)}
				</div>
				<button
					class="text-xs text-accent mt-1"
					onclick={() => (descriptionExpanded = !descriptionExpanded)}
				>
					{descriptionExpanded ? i18n.t("podcast.showLess") : i18n.t("podcast.showMore")}
				</button>
			</div>
		{/if}

		<!-- Episodes header -->
		<div class="flex items-center justify-between mb-3">
			<h2 class="text-sm font-semibold text-text-secondary tracking-wide">
				{i18n.t("podcast.episodes")}{episodes.length > 0 ? ` (${episodes.length})` : ""}
			</h2>
			<div class="relative">
				<button
					class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bg-card text-text-secondary hover:text-text-primary transition-colors"
					onclick={() => (sortMenuOpen = !sortMenuOpen)}
				>
					<SortAscending size={14} />
					{sortOrder === "newest" ? i18n.t("podcast.newestFirst") : i18n.t("podcast.oldestFirst")}
					<CaretDown size={12} />
				</button>
				{#if sortMenuOpen}
					<button
						class="fixed inset-0 z-10"
						onclick={() => (sortMenuOpen = false)}
						aria-label="Close menu"
					></button>
					<div
						class="absolute right-0 top-full mt-1 z-20 bg-bg-card border border-border rounded-xl shadow-xl py-1 min-w-[140px]"
					>
						{#each [
							{ key: "newest", label: i18n.t("podcast.newestFirst") },
							{ key: "oldest", label: i18n.t("podcast.oldestFirst") },
						] as option (option.key)}
							<button
								class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-bg-elevated/50 transition-colors {sortOrder ===
								option.key
									? 'text-accent'
									: 'text-text-primary'}"
								onclick={() => changeSortOrder(option.key as EpisodeSortOrder)}
							>
								{#if sortOrder === option.key}
									<Check size={16} />
								{:else}
									<span class="w-4"></span>
								{/if}
								{option.label}
							</button>
						{/each}
					</div>
				{/if}
			</div>
		</div>

		{#if isLoading}
			<div class="flex items-center justify-center gap-2 text-text-secondary py-8">
				<Spinner class="w-5 h-5" />
				<span>{i18n.t("podcast.loadingEpisodes")}</span>
			</div>
		{:else}
			<div class="space-y-1">
				{#each episodes as episode (episode.guid)}
					<EpisodeItem
						{episode}
						downloadingProgress={downloading.getProgress(episode.guid)}
						ondownload={handleDownload}
						ondetail={(e) => overlay.openEpisodeDetail(e)}
					/>
				{/each}
			</div>
		{/if}
	</div>
</BottomSheet>
