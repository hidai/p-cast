<script lang="ts">
import { liveQuery } from "dexie";
import { goto } from "$app/navigation";
import EpisodeItem from "$lib/components/EpisodeItem.svelte";
import { db, type Episode, type Podcast } from "$lib/db";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import {
	deleteDownload,
	downloadEpisode,
	formatDuration,
	refreshPodcast,
} from "$lib/podcast-service";

// Redirect to Discover if user has never used the app
$effect(() => {
	Promise.all([db.podcasts.count(), db.episodes.count(), db.audioFiles.count()]).then(
		([podcasts, episodes, audioFiles]) => {
			if (podcasts === 0 && episodes === 0 && audioFiles === 0) {
				goto("/discover", { replaceState: true });
			}
		},
	);
});

let continueEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let nextUpEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let latestEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let isRefreshing = $state(false);
let downloadingGuids = $state(new Map<string, number>());

// All three sections computed from a single reactive query
$effect(() => {
	const sub = liveQuery(async () => {
		const podcasts = await db.podcasts.toArray();
		const podcastMap = new Map(podcasts.map((p) => [p.feedUrl, p]));
		const allEpisodes = await db.episodes.orderBy("pubDate").reverse().toArray();

		// 1. Continue Listening: in-progress episodes
		const continueGuids = new Set<string>();
		const continueList = allEpisodes
			.filter((e) => !e.isCompleted && e.currentTime > 0)
			.map((e) => {
				continueGuids.add(e.guid);
				return { ...e, podcast: podcastMap.get(e.podcastFeedUrl) };
			});

		// Group episodes by podcast for Next Up and Latest
		const episodesByPodcast = new Map<string, Episode[]>();
		for (const e of allEpisodes) {
			if (!podcastMap.has(e.podcastFeedUrl)) continue;
			let list = episodesByPodcast.get(e.podcastFeedUrl);
			if (!list) {
				list = [];
				episodesByPodcast.set(e.podcastFeedUrl, list);
			}
			list.push(e);
		}

		// 2. Next Up: for each podcast, find the episode after the last played one
		const nextUpGuids = new Set<string>();
		const nextUpList: (Episode & { podcast?: Podcast })[] = [];
		for (const [feedUrl, episodes] of episodesByPodcast) {
			// Find the most recently played episode (highest lastPlayedAt)
			let lastPlayed: Episode | null = null;
			for (const e of episodes) {
				if (e.lastPlayedAt && (!lastPlayed || e.lastPlayedAt > (lastPlayed.lastPlayedAt ?? 0))) {
					lastPlayed = e;
				}
			}
			if (!lastPlayed) continue; // Never played → skip, will appear in Latest

			// Episodes are sorted by pubDate descending; find the one right after lastPlayed
			// "right after" = smallest pubDate that is greater than lastPlayed's pubDate
			let nextEp: Episode | null = null;
			for (const e of episodes) {
				if (e.pubDate > lastPlayed.pubDate) {
					if (!nextEp || e.pubDate < nextEp.pubDate) {
						nextEp = e;
					}
				}
			}
			if (nextEp && !continueGuids.has(nextEp.guid)) {
				nextUpGuids.add(nextEp.guid);
				nextUpList.push({ ...nextEp, podcast: podcastMap.get(feedUrl) });
			}
		}
		nextUpList.sort((a, b) => b.pubDate - a.pubDate);

		// 3. Latest Episodes: newest unread episode per podcast (excluding continue & next up)
		const excludedGuids = new Set([...continueGuids, ...nextUpGuids]);
		const latestList: (Episode & { podcast?: Podcast })[] = [];
		for (const [feedUrl, episodes] of episodesByPodcast) {
			// episodes are already sorted by pubDate descending
			const newest = episodes.find((e) => !e.isCompleted && !excludedGuids.has(e.guid));
			if (newest) {
				latestList.push({ ...newest, podcast: podcastMap.get(feedUrl) });
			}
		}
		latestList.sort((a, b) => b.pubDate - a.pubDate);

		return { continueList, nextUpList, latestList };
	}).subscribe((val) => {
		if (val) {
			continueEpisodes = val.continueList;
			nextUpEpisodes = val.nextUpList;
			latestEpisodes = val.latestList;
		}
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

	<!-- Next Up -->
	{#if nextUpEpisodes.length > 0}
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
				Next Up
			</h2>
			<div class="space-y-1">
				{#each nextUpEpisodes as episode (episode.guid)}
					<EpisodeItem
						{episode}
						podcast={episode.podcast}
						downloadingProgress={downloadingGuids.has(episode.guid)
							? downloadingGuids.get(episode.guid) ?? 0
							: null}
						ondownload={handleDownload}
						ondelete={(e) => deleteDownload(e.guid)}
						ondetail={(e) => overlay.openEpisodeDetail(e)}
					/>
				{/each}
			</div>
		</section>
	{/if}

	<!-- Latest Episodes -->
	{#if latestEpisodes.length > 0}
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">
				Latest Episodes
			</h2>
			<div class="space-y-1">
				{#each latestEpisodes as episode (episode.guid)}
					<EpisodeItem
						{episode}
						podcast={episode.podcast}
						downloadingProgress={downloadingGuids.has(episode.guid)
							? downloadingGuids.get(episode.guid) ?? 0
							: null}
						ondownload={handleDownload}
						ondelete={(e) => deleteDownload(e.guid)}
						ondetail={(e) => overlay.openEpisodeDetail(e)}
					/>
				{/each}
			</div>
		</section>
	{/if}

	{#if continueEpisodes.length === 0 && nextUpEpisodes.length === 0 && latestEpisodes.length === 0}
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
	{/if}
</div>
