<script lang="ts">
import { page } from "$app/state";
import EpisodeItem from "$lib/components/EpisodeItem.svelte";
import { type Episode, db } from "$lib/db";
import {
	type SearchResult,
	downloadEpisode,
	fetchEpisodes,
	subscribePodcast,
	unsubscribePodcast,
} from "$lib/podcast-service";
import { liveQuery } from "dexie";

const feedUrl = $derived(page.url.searchParams.get("feedUrl") ?? "");
const title = $derived(page.url.searchParams.get("title") ?? "");
const author = $derived(page.url.searchParams.get("author") ?? "");
const coverUrl = $derived(page.url.searchParams.get("coverUrl") ?? "");

let isSubscribed = $state(false);
let episodes: Episode[] = $state([]);
let isLoading = $state(true);
let isToggling = $state(false);
let downloadingGuids = $state(new Map<string, number>());

$effect(() => {
	if (!feedUrl) return;

	const sub = liveQuery(() => db.podcasts.get(feedUrl));
	sub.subscribe((val) => {
		isSubscribed = !!val;
	});

	loadEpisodes();
});

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
		episodes = await db.episodes
			.where("podcastFeedUrl")
			.equals(feedUrl)
			.reverse()
			.sortBy("pubDate");
	} catch {
		episodes = [];
	}
	isLoading = false;
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
		episodes = await db.episodes
			.where("podcastFeedUrl")
			.equals(feedUrl)
			.reverse()
			.sortBy("pubDate");
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

	<!-- Episodes -->
	<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
		Episodes
	</h2>

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
				/>
			{/each}
		</div>
	{/if}
</div>
