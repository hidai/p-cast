<script lang="ts">
import { liveQuery } from "dexie";
import Microphone from "phosphor-svelte/lib/Microphone";
import MusicNote from "phosphor-svelte/lib/MusicNote";
import X from "phosphor-svelte/lib/X";
import { goto } from "$app/navigation";
import EpisodeItem from "$lib/components/EpisodeItem.svelte";
import PlayingIndicator from "$lib/components/PlayingIndicator.svelte";
import PullToRefresh from "$lib/components/PullToRefresh.svelte";
import { db, type Episode, type Podcast } from "$lib/db";
import { createDownloadState } from "$lib/download.svelte";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { deleteDownload, formatDuration, refreshPodcast } from "$lib/podcast-service";
import { theme } from "$lib/theme.svelte";

const logoBg = $derived(theme.resolvedDark ? "#000000" : "#ffffff");

async function markAsPlayed(guid: string) {
	await db.episodes.update(guid, {
		isCompleted: true,
		currentTime: 0,
		completedAt: Date.now(),
	});
}

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
	<div class="mb-4 flex items-end gap-0">
		<svg width="36" height="36" viewBox="0 0 1000 1008" fill="none" xmlns="http://www.w3.org/2000/svg" class="rounded-xl flex-shrink-0" role="img" aria-hidden="true">
			<rect width="1000" height="1008" rx="225" fill={logoBg}/>
			<path d="M512 183C652.833 183 767 296.944 767 437.5C767 578.056 652.833 692 512 692C371.167 692 257 578.056 257 437.5C257 296.944 371.167 183 512 183ZM512 293C431.919 293 367 357.919 367 438C367 518.081 431.919 583 512 583C592.081 583 657 518.081 657 438C657 357.919 592.081 293 512 293Z" fill="#A8B7FC"/>
			<rect x="256" y="183" width="258" height="511" fill={logoBg}/>
			<rect x="409.478" y="550.616" width="113" height="196" transform="rotate(-7 409.478 550.616)" fill={logoBg}/>
			<rect x="507.792" y="705.011" width="36" height="35" transform="rotate(-49 507.792 705.011)" fill={logoBg}/>
			<rect x="489.293" y="579.946" width="36" height="35" transform="rotate(-53 489.293 579.946)" fill={logoBg}/>
			<rect x="361" y="183" width="153" height="110" fill="#8290F5"/>
			<rect x="311" y="183" width="112" height="642" rx="10" fill="#8290F5"/>
		</svg>
		<h1 class="text-xl font-bold" aria-label="P-Cast">-Cast</h1>
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
					{@const isCardCurrentEpisode = player.currentEpisode?.guid === episode.guid}
					{@const isCardPlaying = isCardCurrentEpisode && player.isPlaying}
					<div class="snap-start shrink-0 w-36">
						<div class="relative">
							<button
								class="block text-left w-full"
								onclick={() => isCardCurrentEpisode ? player.togglePlay() : player.play(episode)}
								title={isCardPlaying ? i18n.t("episode.pause") : i18n.t("episode.play")}
							>
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
								<!-- Playing indicator overlay -->
								{#if isCardCurrentEpisode}
									<div class="absolute top-2 right-2 bg-black/50 rounded-md px-1.5 py-1 flex items-center">
										<PlayingIndicator playing={isCardPlaying} />
									</div>
								{/if}
							</button>
							<!-- Dismiss button -->
							<button
								class="absolute top-2 left-2 w-6 h-6 bg-black/50 rounded-full flex items-center justify-center"
								onclick={() => markAsPlayed(episode.guid)}
								title={i18n.t("episode.markAsPlayed")}
								aria-label={i18n.t("episode.markAsPlayed")}
							>
								<X size={12} weight="bold" class="text-white" />
							</button>
						</div>
						<p class="text-xs font-medium mt-2 line-clamp-2 leading-tight">
							{episode.title}
						</p>
						<p class="text-xs text-text-secondary mt-0.5">
							{formatDuration(episode.currentTime)} / {formatDuration(episode.duration)}
						</p>
					</div>
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
