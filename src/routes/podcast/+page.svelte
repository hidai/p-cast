<script lang="ts">
import { liveQuery } from "dexie";
import { page } from "$app/state";
import EpisodeItem from "$lib/components/EpisodeItem.svelte";
import { db, type Episode, type EpisodeSortOrder } from "$lib/db";
import { episodeDetail } from "$lib/episode-detail.svelte";
import {
	downloadEpisode,
	fetchEpisodes,
	type SearchResult,
	subscribePodcast,
	unsubscribePodcast,
} from "$lib/podcast-service";

const feedUrl = $derived(page.url.searchParams.get("feedUrl") ?? "");
const title = $derived(page.url.searchParams.get("title") ?? "");
const author = $derived(page.url.searchParams.get("author") ?? "");
const coverUrl = $derived(page.url.searchParams.get("coverUrl") ?? "");

let isSubscribed = $state(false);
let episodes: Episode[] = $state([]);
let isLoading = $state(true);
let isToggling = $state(false);
let downloadingGuids = $state(new Map<string, number>());
let sortOrder: EpisodeSortOrder = $state("newest");
let sortMenuOpen = $state(false);
let podcastDescription = $state("");
let descriptionExpanded = $state(false);

$effect(() => {
	if (!feedUrl) return;

	const sub = liveQuery(() => db.podcasts.get(feedUrl)).subscribe((val) => {
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
		const raw = await fetchEpisodes(feedUrl);
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
	// Persist per-podcast preference
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

async function handleDownload(episode: Episode) {
	downloadingGuids = new Map([...downloadingGuids, [episode.guid, 0]]);
	try {
		await downloadEpisode(episode, (progress) => {
			downloadingGuids = new Map([...downloadingGuids, [episode.guid, progress]]);
		});
		const all = await db.episodes.where("podcastFeedUrl").equals(feedUrl).toArray();
		episodes = sortEpisodes(all, sortOrder);
	} finally {
		const next = new Map(downloadingGuids);
		next.delete(episode.guid);
		downloadingGuids = next;
	}
}
</script>

<div class="px-4 pt-4">
	<!-- Podcast header -->
	<div class="flex gap-4 mb-6">
		{#if coverUrl}
			<img src={coverUrl} alt="" class="w-28 h-28 rounded-xl object-cover shrink-0" />
		{/if}
		<div class="min-w-0">
			<h1 class="text-lg font-bold leading-tight">{title}</h1>
			<p class="text-sm text-text-secondary mt-1">{author}</p>
			<button
				class="mt-3 px-4 py-1.5 rounded-full text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50 {isSubscribed
					? 'bg-bg-card text-text-secondary border border-border'
					: 'bg-accent text-white'}"
				onclick={toggleSubscribe}
				disabled={isToggling}
			>
				{#if isToggling}
					<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle
							class="opacity-25"
							cx="12"
							cy="12"
							r="10"
							stroke="currentColor"
							stroke-width="4"
						/>
						<path
							class="opacity-75"
							fill="currentColor"
							d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
						/>
					</svg>
				{/if}
				{isSubscribed ? "Unsubscribe" : "Subscribe"}
			</button>
		</div>
	</div>

	<!-- Podcast description -->
	{#if podcastDescription}
		<div class="mb-6">
			<div
				class="text-sm text-text-secondary leading-relaxed {descriptionExpanded ? '' : 'line-clamp-2'}"
			>
				{podcastDescription}
			</div>
			<button
				class="text-xs text-accent mt-1"
				onclick={() => (descriptionExpanded = !descriptionExpanded)}
			>
				{descriptionExpanded ? "閉じる" : "もっと見る"}
			</button>
		</div>
	{/if}

	<!-- Episodes -->
	<div class="flex items-center justify-between mb-3">
		<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider">
			Episodes{episodes.length > 0 ? ` (${episodes.length})` : ""}
		</h2>
		<div class="relative">
			<button
				class="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-bg-card text-text-secondary hover:text-text-primary transition-colors"
				onclick={() => (sortMenuOpen = !sortMenuOpen)}
			>
				<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M3 4h13M3 8h9M3 12h5m4 0l4-4m0 0l4 4m-4-4v12"
					/>
				</svg>
				{sortOrder === "newest" ? "新しい順" : "古い順"}
				<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M19 9l-7 7-7-7"
					/>
				</svg>
			</button>
			{#if sortMenuOpen}
				<!-- backdrop to close menu -->
				<button
					class="fixed inset-0 z-10"
					onclick={() => (sortMenuOpen = false)}
					aria-label="Close menu"
				></button>
				<div
					class="absolute right-0 top-full mt-1 z-20 bg-bg-card border border-border rounded-lg shadow-lg py-1 min-w-[140px]"
				>
					{#each [
						{ key: "newest", label: "新しい順" },
						{ key: "oldest", label: "古い順" },
					] as option (option.key)}
						<button
							class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-white/5 transition-colors {sortOrder ===
							option.key
								? 'text-accent'
								: 'text-text-primary'}"
							onclick={() => changeSortOrder(option.key as EpisodeSortOrder)}
						>
							{#if sortOrder === option.key}
								<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M5 13l4 4L19 7"
									/>
								</svg>
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
			<svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				/>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
				/>
			</svg>
			<span>Loading episodes...</span>
		</div>
	{:else}
		<div class="space-y-1">
			{#each episodes as episode (episode.guid)}
				<EpisodeItem
					{episode}
					downloadingProgress={downloadingGuids.has(episode.guid)
						? downloadingGuids.get(episode.guid) ?? 0
						: null}
					ondownload={handleDownload}
					ondetail={(e) => episodeDetail.open(e)}
				/>
			{/each}
		</div>
	{/if}
</div>
