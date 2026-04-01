<script lang="ts">
import { liveQuery } from "dexie";
import Microphone from "phosphor-svelte/lib/Microphone";
import MusicNote from "phosphor-svelte/lib/MusicNote";
import { goto } from "$app/navigation";
import EpisodeItem from "$lib/components/EpisodeItem.svelte";
import PullToRefresh from "$lib/components/PullToRefresh.svelte";
import { db, type Episode, type Podcast } from "$lib/db";
import { createDownloadState } from "$lib/download.svelte";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, formatDuration, refreshPodcast } from "$lib/podcast-service";

// Redirect to Discover once if user has never used the app
const redirectKey = "p-cast:discoveredOnce";
$effect(() => {
	if (sessionStorage.getItem(redirectKey)) return;
	Promise.all([db.podcasts.count(), db.episodes.count(), db.audioFiles.count()]).then(
		([podcasts, episodes, audioFiles]) => {
			if (podcasts === 0 && episodes === 0 && audioFiles === 0) {
				sessionStorage.setItem(redirectKey, "1");
				goto("/discover", { replaceState: true });
			}
		},
	);
});

type EpisodeWithPodcast = Episode & { podcast?: Podcast };

function buildContinueList(
	allEpisodes: Episode[],
	podcastMap: Map<string, Podcast>,
): { list: EpisodeWithPodcast[]; guids: Set<string> } {
	const guids = new Set<string>();
	const list = allEpisodes
		.filter((e) => !e.isCompleted && e.currentTime > 0)
		.map((e) => {
			guids.add(e.guid);
			return { ...e, podcast: podcastMap.get(e.podcastFeedUrl) };
		});
	return { list, guids };
}

function groupByPodcast(
	allEpisodes: Episode[],
	podcastMap: Map<string, Podcast>,
): Map<string, Episode[]> {
	const map = new Map<string, Episode[]>();
	for (const e of allEpisodes) {
		if (!podcastMap.has(e.podcastFeedUrl)) continue;
		let list = map.get(e.podcastFeedUrl);
		if (!list) {
			list = [];
			map.set(e.podcastFeedUrl, list);
		}
		list.push(e);
	}
	return map;
}

function buildNextUpList(
	episodesByPodcast: Map<string, Episode[]>,
	podcastMap: Map<string, Podcast>,
	excludeGuids: Set<string>,
): { list: EpisodeWithPodcast[]; guids: Set<string> } {
	const guids = new Set<string>();
	const list: EpisodeWithPodcast[] = [];
	for (const [feedUrl, episodes] of episodesByPodcast) {
		let lastPlayed: Episode | null = null;
		for (const e of episodes) {
			if (e.lastPlayedAt && (!lastPlayed || e.lastPlayedAt > (lastPlayed.lastPlayedAt ?? 0))) {
				lastPlayed = e;
			}
		}
		if (!lastPlayed) continue;

		let nextEp: Episode | null = null;
		for (const e of episodes) {
			if (e.pubDate > lastPlayed.pubDate) {
				if (!nextEp || e.pubDate < nextEp.pubDate) {
					nextEp = e;
				}
			}
		}
		if (nextEp && !excludeGuids.has(nextEp.guid)) {
			guids.add(nextEp.guid);
			list.push({ ...nextEp, podcast: podcastMap.get(feedUrl) });
		}
	}
	list.sort((a, b) => b.pubDate - a.pubDate);
	return { list, guids };
}

function buildLatestList(
	episodesByPodcast: Map<string, Episode[]>,
	podcastMap: Map<string, Podcast>,
	excludeGuids: Set<string>,
): EpisodeWithPodcast[] {
	const list: EpisodeWithPodcast[] = [];
	for (const [feedUrl, episodes] of episodesByPodcast) {
		const newest = episodes.find((e) => !e.isCompleted && !excludeGuids.has(e.guid));
		if (newest) {
			list.push({ ...newest, podcast: podcastMap.get(feedUrl) });
		}
	}
	list.sort((a, b) => b.pubDate - a.pubDate);
	return list;
}

let continueEpisodes: EpisodeWithPodcast[] = $state([]);
let nextUpEpisodes: EpisodeWithPodcast[] = $state([]);
let latestEpisodes: EpisodeWithPodcast[] = $state([]);
const downloading = createDownloadState();

$effect(() => {
	const sub = liveQuery(async () => {
		const podcasts = await db.podcasts.toArray();
		const podcastMap = new Map(podcasts.map((p) => [p.feedUrl, p]));
		const allEpisodes = await db.episodes.orderBy("pubDate").reverse().toArray();
		const episodesByPodcast = groupByPodcast(allEpisodes, podcastMap);

		const { list: continueList, guids: continueGuids } = buildContinueList(allEpisodes, podcastMap);
		const { list: nextUpList, guids: nextUpGuids } = buildNextUpList(
			episodesByPodcast,
			podcastMap,
			continueGuids,
		);
		const latestList = buildLatestList(
			episodesByPodcast,
			podcastMap,
			new Set([...continueGuids, ...nextUpGuids]),
		);

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
	const podcasts = await db.podcasts.toArray();
	await Promise.all(podcasts.map((p) => refreshPodcast(p.feedUrl).catch(() => {})));
}

function handleDownload(episode: Episode) {
	downloading.download(episode);
}
</script>

<PullToRefresh onrefresh={handleRefresh}>
<div class="px-4 pt-4">
	<div class="mb-4">
		<h1 class="text-xl font-bold">{i18n.t("home.title")}</h1>
	</div>

	<!-- Continue Listening -->
	{#if continueEpisodes.length > 0}
		<section class="mb-6">
			<h2 class="text-sm font-semibold text-text-secondary tracking-wide mb-3">
				{i18n.t("home.continueListening")}
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
									class="w-36 h-36 rounded-2xl object-cover ring-1 ring-border-subtle"
								/>
							{:else}
								<div
									class="w-36 h-36 rounded-2xl bg-bg-card flex items-center justify-center ring-1 ring-border-subtle"
								>
									<MusicNote size={40} weight="light" class="text-text-secondary" />
								</div>
							{/if}
							<!-- Progress bar overlay -->
							<div class="absolute bottom-0 left-0 right-0 h-0.5 bg-black/40 rounded-b-2xl overflow-hidden">
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
			<h2 class="text-sm font-semibold text-text-secondary tracking-wide mb-3">
				{i18n.t("home.nextUp")}
			</h2>
			<div class="space-y-1">
				{#each nextUpEpisodes as episode (episode.guid)}
					<EpisodeItem
						{episode}
						podcast={episode.podcast}
						downloadingProgress={downloading.getProgress(episode.guid)}
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
			<h2 class="text-sm font-semibold text-text-secondary tracking-wide mb-3">
				{i18n.t("home.latestEpisodes")}
			</h2>
			<div class="space-y-1">
				{#each latestEpisodes as episode (episode.guid)}
					<EpisodeItem
						{episode}
						podcast={episode.podcast}
						downloadingProgress={downloading.getProgress(episode.guid)}
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
			<div class="flex justify-center mb-4">
				<Microphone size={64} weight="light" />
			</div>
			<p>{i18n.t("home.emptyTitle")}</p>
			<p class="text-sm mt-1">{i18n.t("home.emptySubtitle")}</p>
		</div>
	{/if}
</div>
</PullToRefresh>
