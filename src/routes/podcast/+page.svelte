<script lang="ts">
	import { page } from '$app/state';
	import { db, type Episode } from '$lib/db';
	import { subscribePodcast, unsubscribePodcast, fetchEpisodes, downloadEpisode, formatDuration, type SearchResult } from '$lib/podcast-service';
	import { player } from '$lib/player.svelte';
	import { liveQuery } from 'dexie';

	const feedUrl = $derived(page.url.searchParams.get('feedUrl') ?? '');
	const title = $derived(page.url.searchParams.get('title') ?? '');
	const author = $derived(page.url.searchParams.get('author') ?? '');
	const coverUrl = $derived(page.url.searchParams.get('coverUrl') ?? '');

	let isSubscribed = $state(false);
	let episodes: Episode[] = $state([]);
	let isLoading = $state(true);

	$effect(() => {
		if (!feedUrl) return;

		// Check subscription status
		const sub = liveQuery(() => db.podcasts.get(feedUrl));
		sub.subscribe((val) => {
			isSubscribed = !!val;
		});

		// Load episodes
		loadEpisodes();
	});

	async function loadEpisodes() {
		isLoading = true;
		try {
			const raw = await fetchEpisodes(feedUrl);
			// Store in DB and load back
			for (const ep of raw) {
				const existing = await db.episodes.get(ep.guid);
				if (!existing) {
					await db.episodes.put({ ...ep, isDownloaded: false });
				}
			}
			episodes = await db.episodes.where('podcastFeedUrl').equals(feedUrl).reverse().sortBy('pubDate');
		} catch {
			episodes = [];
		}
		isLoading = false;
	}

	async function toggleSubscribe() {
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
	}

	async function handleDownload(episode: Episode) {
		await downloadEpisode(episode);
		episodes = await db.episodes.where('podcastFeedUrl').equals(feedUrl).reverse().sortBy('pubDate');
	}

	function formatDate(ts: number): string {
		if (!ts) return '';
		return new Date(ts).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', year: 'numeric' });
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
				class="mt-3 px-4 py-1.5 rounded-full text-sm font-medium {isSubscribed ? 'bg-bg-card text-text-secondary border border-border' : 'bg-accent text-white'}"
				onclick={toggleSubscribe}
			>
				{isSubscribed ? 'Unsubscribe' : 'Subscribe'}
			</button>
		</div>
	</div>

	<!-- Episodes -->
	<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Episodes</h2>

	{#if isLoading}
		<p class="text-center text-text-secondary py-8">Loading episodes...</p>
	{:else}
		<div class="space-y-1">
			{#each episodes as episode (episode.guid)}
				{@const imgUrl = episode.coverUrl || coverUrl}
				<div class="flex items-center gap-3 p-3 rounded-lg bg-bg-card/50 hover:bg-bg-card transition">
					{#if imgUrl}
						<img
							src={imgUrl}
							alt=""
							class="w-12 h-12 rounded-lg object-cover shrink-0"
						/>
					{/if}
					<div class="flex-1 min-w-0">
						<p class="text-sm font-medium {episode.isCompleted ? 'text-text-secondary' : ''}">
							{episode.title}
						</p>
						<p class="text-xs text-text-secondary mt-0.5">
							{formatDate(episode.pubDate)}
							{#if episode.duration > 0} · {formatDuration(episode.duration)}{/if}
							{#if episode.isDownloaded}<span class="text-accent"> · Downloaded</span>{/if}
							{#if episode.currentTime > 0 && !episode.isCompleted}
								<span class="text-accent"> · {formatDuration(episode.currentTime)} played</span>
							{/if}
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
