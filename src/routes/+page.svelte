<script lang="ts">
import { liveQuery } from "dexie";
import { db, type Episode, type Podcast } from "$lib/db";
import { downloadEpisode, refreshPodcast } from "$lib/podcast-service";

let continueEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let latestEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let isRefreshing = $state(false);
let downloadingGuids = $state(new Map<string, number>());

// Continue listening: in-progress episodes regardless of subscription
$effect(() => {
	const sub = liveQuery(async () => {
		const allEpisodes = await db.episodes.orderBy("pubDate").reverse().toArray();
		const inProgress = allEpisodes.filter((e) => !e.isCompleted && e.currentTime > 0);
		const podcasts = await db.podcasts.toArray();
		const podcastMap = new Map(podcasts.map((p) => [p.feedUrl, p]));
		return inProgress.map((e) => ({ ...e, podcast: podcastMap.get(e.podcastFeedUrl) }));
	}).subscribe((val) => {
		continueEpisodes = val ?? [];
	});
	return () => sub.unsubscribe();
});

// Latest episodes: unread episodes from subscribed podcasts
$effect(() => {
	const sub = liveQuery(async () => {
		const podcasts = await db.podcasts.toArray();
		if (podcasts.length === 0) return [];

		const podcastMap = new Map(podcasts.map((p) => [p.feedUrl, p]));
		const allEpisodes = await db.episodes.orderBy("pubDate").reverse().toArray();
		return allEpisodes
			.filter((e) => podcastMap.has(e.podcastFeedUrl) && !e.isCompleted)
			.map((e) => ({ ...e, podcast: podcastMap.get(e.podcastFeedUrl) }));
	}).subscribe((val) => {
		latestEpisodes = val ?? [];
	});
	return () => sub.unsubscribe();
});

async function handleRefresh() {
	isRefreshing = true;
	const podcasts = await db.podcasts.toArray();
	await Promise.all(podcasts.map((p) => refreshPodcast(p.feedUrl).catch(() => {})));
	isRefreshing = false;
}

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
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-xl font-bold">Home</h1>
		<button
			class="text-sm text-accent disabled:opacity-50"
			onclick={handleRefresh}
			disabled={isRefreshing}
		>
			{#if isRefreshing}
				<span class="inline-flex items-center gap-1.5">
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
					Refreshing...
				</span>
			{:else}
				Refresh
			{/if}
		</button>
	</div>

	<!-- Continue Listening -->
	{#if continueEpisodes.length > 0}
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
				Continue Listening
			</h2>
			<div class="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
				{#each continueEpisodes as episode (episode.guid)}
					{@const imgUrl = episode.coverUrl || episode.podcast?.coverUrl}
					<button
						class="snap-start shrink-0 w-36 text-left"
						onclick={() => player.play(episode)}
					>
						<div class="relative">
							{#if imgUrl}
								<img
									src={imgUrl}
									alt=""
									class="w-36 h-36 rounded-xl object-cover"
								/>
							{:else}
								<div
									class="w-36 h-36 rounded-xl bg-bg-card flex items-center justify-center"
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
							<!-- Progress bar overlay -->
							<div class="absolute bottom-0 left-0 right-0 h-1 bg-black/40 rounded-b-xl overflow-hidden">
								<div
									class="h-full bg-accent"
									style="width: {episode.duration > 0
										? (episode.currentTime / episode.duration) * 100
										: 0}%"
								></div>
							</div>
						</div>
						<p class="text-xs font-medium mt-2 line-clamp-2 leading-tight">
							{episode.title}
						</p>
						<p class="text-xs text-text-secondary mt-0.5">
							{formatDuration(episode.currentTime)} / {formatDuration(episode.duration)}
						</p>
					</button>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Latest Episodes -->
	<section>
		<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
			Latest Episodes
		</h2>

		{#if latestEpisodes.length === 0 && continueEpisodes.length === 0}
			<div class="text-center text-text-secondary mt-16">
				<svg
					class="w-16 h-16 mx-auto mb-4"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="1"
						d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
					/>
				</svg>
				<p>No episodes yet</p>
				<p class="text-sm mt-1">Search and subscribe to podcasts in Discover</p>
			</div>
		{:else}
			<div class="space-y-1">
				{#each latestEpisodes as episode (episode.guid)}
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
	</section>
</div>
