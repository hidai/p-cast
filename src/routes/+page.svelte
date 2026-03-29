<script lang="ts">
	import { db, type Episode, type Podcast } from '$lib/db';
	import { liveQuery } from 'dexie';
	import { player } from '$lib/player.svelte';
	import { formatDuration, downloadEpisode, refreshPodcast } from '$lib/podcast-service';

	let episodes: (Episode & { podcast?: Podcast })[] = $state([]);
	let showDownloadedOnly = $state(false);
	let isRefreshing = $state(false);

	$effect(() => {
		const filtered = showDownloadedOnly;
		const sub = liveQuery(async () => {
			const podcasts = await db.podcasts.toArray();
			if (podcasts.length === 0) return [];

			let allEpisodes = await db.episodes.orderBy('pubDate').reverse().toArray();
			if (filtered) {
				allEpisodes = allEpisodes.filter((e) => e.isDownloaded);
			}

			const podcastMap = new Map(podcasts.map((p) => [p.feedUrl, p]));
			return allEpisodes
				.filter((e) => podcastMap.has(e.podcastFeedUrl))
				.map((e) => ({ ...e, podcast: podcastMap.get(e.podcastFeedUrl) }));
		}).subscribe((val) => {
			episodes = val ?? [];
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
		await downloadEpisode(episode);
	}

	function formatDate(ts: number): string {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
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
			{isRefreshing ? 'Refreshing...' : 'Refresh'}
		</button>
	</div>

	<!-- Downloaded filter -->
	<div class="mb-4">
		<button
			class="px-3 py-1.5 text-sm rounded-full {showDownloadedOnly ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'}"
			onclick={() => (showDownloadedOnly = !showDownloadedOnly)}
		>
			Downloaded only
		</button>
	</div>

	{#if episodes.length === 0}
		<div class="text-center text-text-secondary mt-16">
			<svg class="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
			</svg>
			<p>No episodes yet</p>
			<p class="text-sm mt-1">Search and subscribe to podcasts in Discover</p>
		</div>
	{:else}
		<div class="space-y-1">
			{#each episodes as episode (episode.guid)}
				{@const imgUrl = episode.coverUrl || episode.podcast?.coverUrl}
				<div class="flex items-center gap-3 p-3 rounded-lg bg-bg-card/50 hover:bg-bg-card transition">
					{#if imgUrl}
						<img
							src={imgUrl}
							alt=""
							class="w-12 h-12 rounded-lg object-cover shrink-0"
						/>
					{/if}
					<div class="flex-1 min-w-0">
						<p
							class="text-sm font-medium truncate {episode.isCompleted ? 'text-text-secondary' : ''}"
						>
							{episode.title}
						</p>
						<p class="text-xs text-text-secondary">
							{formatDate(episode.pubDate)}
							{#if episode.duration > 0}· {formatDuration(episode.duration)}{/if}
							{#if episode.isDownloaded}<span class="text-accent"> · Downloaded</span>{/if}
						</p>
					</div>
					<div class="flex gap-1 shrink-0">
						{#if !episode.isDownloaded}
							<button
								class="p-2 text-text-secondary hover:text-accent"
								onclick={() => handleDownload(episode)}
								title="Download"
							>
								<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
								</svg>
							</button>
						{/if}
						<button
							class="p-2 text-text-secondary hover:text-accent"
							onclick={() => player.play(episode)}
							title="Play"
						>
							<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
