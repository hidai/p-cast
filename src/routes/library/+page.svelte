<script lang="ts">
import { type Episode, type Podcast, db } from "$lib/db";
import { downloadEpisode } from "$lib/podcast-service";
import { liveQuery } from "dexie";

type Tab = "subscribed" | "downloaded" | "history";

let activeTab: Tab = $state("subscribed");
let podcasts: Podcast[] = $state([]);
let downloadedEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let historyEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let downloadingGuids = $state(new Map<string, number>());

// Subscribed podcasts
$effect(() => {
	const sub = liveQuery(() => db.podcasts.orderBy("subscribedAt").reverse().toArray()).subscribe(
		(val) => {
			podcasts = val ?? [];
		},
	);
	return () => sub.unsubscribe();
});

// Downloaded episodes (regardless of subscription)
$effect(() => {
	const sub = liveQuery(async () => {
		const allEpisodes = await db.episodes.orderBy("pubDate").reverse().toArray();
		const episodes = allEpisodes.filter((e) => e.isDownloaded);

		const allPodcasts = await db.podcasts.toArray();
		const podcastMap = new Map(allPodcasts.map((p) => [p.feedUrl, p]));
		return episodes.map((e) => ({ ...e, podcast: podcastMap.get(e.podcastFeedUrl) }));
	}).subscribe((val) => {
		downloadedEpisodes = val ?? [];
	});
	return () => sub.unsubscribe();
});

// History: completed episodes
$effect(() => {
	const sub = liveQuery(async () => {
		const allEpisodes = await db.episodes.orderBy("pubDate").reverse().toArray();
		const episodes = allEpisodes.filter((e) => e.isCompleted);

		const allPodcasts = await db.podcasts.toArray();
		const podcastMap = new Map(allPodcasts.map((p) => [p.feedUrl, p]));
		return episodes.map((e) => ({ ...e, podcast: podcastMap.get(e.podcastFeedUrl) }));
	}).subscribe((val) => {
		historyEpisodes = val ?? [];
	});
	return () => sub.unsubscribe();
});

async function handleDownload(episode: Episode) {
	downloadingGuids = new Map([...downloadingGuids, [episode.guid, 0]]);
	try {
		await downloadEpisode(episode, (progress) => {
			downloadingGuids = new Map([...downloadingGuids, [episode.guid, progress]]);
		});
	} finally {
		const next = new Map(downloadingGuids);
		next.delete(episode.guid);
		downloadingGuids = next;
	}
}
</script>

<div class="px-4 pt-4">
	<h1 class="text-xl font-bold mb-4">Library</h1>

	<!-- Tab bar -->
	<div class="flex gap-2 mb-4">
		{#each [
			{ key: "subscribed", label: "Subscribed" },
			{ key: "downloaded", label: "Downloaded" },
			{ key: "history", label: "History" },
		] as tab (tab.key)}
			<button
				class="px-3 py-1.5 text-sm rounded-full {activeTab === tab.key
					? 'bg-accent text-white'
					: 'bg-bg-card text-text-secondary'}"
				onclick={() => (activeTab = tab.key as Tab)}
			>
				{tab.label}
			</button>
		{/each}
	</div>

	<!-- Subscribed tab: podcast grid -->
	{#if activeTab === "subscribed"}
		{#if podcasts.length === 0}
			<div class="text-center text-text-secondary mt-16">
				<p>No subscriptions yet</p>
				<p class="text-sm mt-1">Discover and subscribe to podcasts</p>
			</div>
		{:else}
			<div class="grid grid-cols-3 gap-3">
				{#each podcasts as podcast (podcast.feedUrl)}
					<a
						href="/podcast?feedUrl={encodeURIComponent(podcast.feedUrl)}&title={encodeURIComponent(podcast.title)}&author={encodeURIComponent(podcast.author)}&coverUrl={encodeURIComponent(podcast.coverUrl)}"
						class="block"
					>
						{#if podcast.coverUrl}
							<img
								src={podcast.coverUrl}
								alt={podcast.title}
								class="w-full aspect-square rounded-xl object-cover"
							/>
						{:else}
							<div
								class="w-full aspect-square rounded-xl bg-bg-card flex items-center justify-center"
							>
								<svg
									class="w-10 h-10 text-text-secondary"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="1.5"
										d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"
									/>
								</svg>
							</div>
						{/if}
						<p class="text-xs font-medium mt-1.5 line-clamp-2 leading-tight">
							{podcast.title}
						</p>
					</a>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Downloaded tab: episode list -->
	{#if activeTab === "downloaded"}
		{#if downloadedEpisodes.length === 0}
			<div class="text-center text-text-secondary mt-16">
				<p>No downloaded episodes</p>
				<p class="text-sm mt-1">Download episodes for offline listening</p>
			</div>
		{:else}
			<div class="space-y-1">
				{#each downloadedEpisodes as episode (episode.guid)}
					<EpisodeItem {episode} podcast={episode.podcast} />
				{/each}
			</div>
		{/if}
	{/if}

	<!-- History tab: completed episodes -->
	{#if activeTab === "history"}
		{#if historyEpisodes.length === 0}
			<div class="text-center text-text-secondary mt-16">
				<p>No listening history</p>
				<p class="text-sm mt-1">Episodes you finish will appear here</p>
			</div>
		{:else}
			<div class="space-y-1">
				{#each historyEpisodes as episode (episode.guid)}
					<EpisodeItem
						{episode}
						podcast={episode.podcast}
						downloadingProgress={downloadingGuids.has(episode.guid)
							? downloadingGuids.get(episode.guid) ?? 0
							: null}
						ondownload={handleDownload}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</div>
