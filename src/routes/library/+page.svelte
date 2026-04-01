<script lang="ts">
import { liveQuery } from "dexie";
import MusicNote from "phosphor-svelte/lib/MusicNote";
import EpisodeItem from "$lib/components/EpisodeItem.svelte";
import { db, type Episode, type Podcast } from "$lib/db";
import { createDownloadState } from "$lib/download.svelte";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import { deleteDownload } from "$lib/podcast-service";

type Tab = "subscribed" | "downloaded" | "history";

let activeTab: Tab = $state("subscribed");
let podcasts: Podcast[] = $state([]);
let downloadedEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
let historyEpisodes: (Episode & { podcast?: Podcast })[] = $state([]);
const downloading = createDownloadState();

$effect(() => {
	const sub = liveQuery(async () => {
		const [allPodcasts, allEpisodes] = await Promise.all([
			db.podcasts.orderBy("subscribedAt").reverse().toArray(),
			db.episodes.orderBy("pubDate").reverse().toArray(),
		]);
		const podcastMap = new Map(allPodcasts.map((p) => [p.feedUrl, p]));
		return {
			podcasts: allPodcasts,
			downloaded: allEpisodes
				.filter((e) => e.isDownloaded)
				.map((e) => ({ ...e, podcast: podcastMap.get(e.podcastFeedUrl) })),
			history: allEpisodes
				.filter((e) => e.isCompleted)
				.map((e) => ({ ...e, podcast: podcastMap.get(e.podcastFeedUrl) })),
		};
	}).subscribe((val) => {
		if (!val) return;
		podcasts = val.podcasts;
		downloadedEpisodes = val.downloaded;
		historyEpisodes = val.history;
	});
	return () => sub.unsubscribe();
});

function handleDownload(episode: Episode) {
	downloading.download(episode);
}
</script>

<div class="px-4 pt-4">
	<h1 class="text-xl font-bold mb-4">{i18n.t("library.title")}</h1>

	<!-- Tab bar -->
	<div class="flex gap-2 mb-4">
		{#each [
			{ key: "subscribed", label: i18n.t("library.subscribed") },
			{ key: "downloaded", label: i18n.t("library.downloaded") },
			{ key: "history", label: i18n.t("library.history") },
		] as tab (tab.key)}
			<button
				class="px-3 py-1.5 text-sm rounded-full transition-colors {activeTab === tab.key
					? 'bg-accent text-white shadow-sm'
					: 'bg-bg-card text-text-secondary hover:bg-bg-elevated/50'}"
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
				<p>{i18n.t("library.noSubscriptions")}</p>
				<p class="text-sm mt-1">{i18n.t("library.noSubscriptionsSub")}</p>
			</div>
		{:else}
			<div class="grid grid-cols-3 gap-3">
				{#each podcasts as podcast (podcast.feedUrl)}
					<button
						class="block text-left w-full"
						onclick={() => overlay.openPodcastDetail(podcast.feedUrl)}
					>
						{#if podcast.coverUrl}
							<img
								src={podcast.coverUrl}
								alt={podcast.title}
								class="w-full aspect-square rounded-2xl object-cover ring-1 ring-border-subtle"
							/>
						{:else}
							<div
								class="w-full aspect-square rounded-2xl bg-bg-card flex items-center justify-center ring-1 ring-border-subtle"
							>
								<MusicNote size={40} weight="light" class="text-text-secondary" />
							</div>
						{/if}
						<p class="text-xs font-medium mt-1.5 line-clamp-2 leading-tight">
							{podcast.title}
						</p>
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Downloaded tab: episode list -->
	{#if activeTab === "downloaded"}
		{#if downloadedEpisodes.length === 0}
			<div class="text-center text-text-secondary mt-16">
				<p>{i18n.t("library.noDownloads")}</p>
				<p class="text-sm mt-1">{i18n.t("library.noDownloadsSub")}</p>
			</div>
		{:else}
			<div class="space-y-1">
				{#each downloadedEpisodes as episode (episode.guid)}
					<EpisodeItem {episode} podcast={episode.podcast} ondelete={(e) => deleteDownload(e.guid)} ondetail={(e) => overlay.openEpisodeDetail(e)} />
				{/each}
			</div>
		{/if}
	{/if}

	<!-- History tab: completed episodes -->
	{#if activeTab === "history"}
		{#if historyEpisodes.length === 0}
			<div class="text-center text-text-secondary mt-16">
				<p>{i18n.t("library.noHistory")}</p>
				<p class="text-sm mt-1">{i18n.t("library.noHistorySub")}</p>
			</div>
		{:else}
			<div class="space-y-1">
				{#each historyEpisodes as episode (episode.guid)}
					<EpisodeItem
						{episode}
						podcast={episode.podcast}
						downloadingProgress={downloading.getProgress(episode.guid)}
						ondownload={handleDownload}
						ondetail={(e) => overlay.openEpisodeDetail(e)}
					/>
				{/each}
			</div>
		{/if}
	{/if}
</div>
