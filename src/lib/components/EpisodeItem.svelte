<script lang="ts">
import DownloadSimple from "phosphor-svelte/lib/DownloadSimple";
import Pause from "phosphor-svelte/lib/Pause";
import Play from "phosphor-svelte/lib/Play";
import Trash from "phosphor-svelte/lib/Trash";
import CoverImage from "$lib/components/CoverImage.svelte";
import DownloadProgress from "$lib/components/DownloadProgress.svelte";
import PlayingIndicator from "$lib/components/PlayingIndicator.svelte";
import type { Episode, Podcast } from "$lib/db";
import { i18n } from "$lib/i18n";
import { player } from "$lib/player.svelte";
import { formatDuration } from "$lib/podcast-service";

let {
	episode,
	podcast,
	downloadingProgress = null,
	ondownload,
	ondelete,
	ondetail,
}: {
	episode: Episode;
	podcast?: Podcast;
	downloadingProgress?: number | null;
	ondownload?: (episode: Episode) => void;
	ondelete?: (episode: Episode) => void;
	ondetail?: (episode: Episode) => void;
} = $props();

function formatDate(ts: number): string {
	return i18n.formatDate(ts, { month: "short", day: "numeric" });
}

const imgUrl = $derived(episode.coverUrl || podcast?.coverUrl);
const isCurrentEpisode = $derived(player.currentEpisode?.guid === episode.guid);
const isActivePlaying = $derived(isCurrentEpisode && player.isPlaying);

function handlePlay() {
	if (isCurrentEpisode) {
		player.togglePlay();
	} else {
		player.play(episode);
	}
}
</script>

<div class="flex items-center gap-3 p-3.5 rounded-xl bg-bg-card hover:bg-bg-elevated/50 transition">
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="flex items-center gap-3 flex-1 min-w-0"
		onclick={() => ondetail?.(episode)}
	>
		<CoverImage src={imgUrl} class="w-12 h-12 rounded-lg object-cover shrink-0 ring-1 ring-border-subtle" />
		<div class="flex-1 min-w-0">
			<p class="flex items-center gap-1.5 text-sm font-medium {episode.isCompleted ? 'text-text-secondary' : ''}">
				{#if isCurrentEpisode}
					<PlayingIndicator playing={isActivePlaying} />
				{/if}
				<span class="truncate">{episode.title}</span>
			</p>
			<p class="text-xs text-text-secondary">
				{formatDate(episode.pubDate)}
				{#if episode.duration > 0} · {formatDuration(episode.duration)}{/if}
				{#if episode.isDownloaded}<span class="text-accent"> · {i18n.t("episode.downloaded")}</span>{/if}
				{#if episode.currentTime > 0 && !episode.isCompleted}
					<span class="text-accent"> · {formatDuration(episode.currentTime)} {i18n.t("episode.played")}</span>
				{/if}
			</p>
		</div>
	</div>
	<div class="flex gap-1 shrink-0">
		{#if episode.isDownloaded && ondelete}
			<button
				class="p-2 text-text-secondary hover:text-danger"
				onclick={() => ondelete?.(episode)}
				title="Delete download"
			>
				<Trash size={20} />
			</button>
		{/if}
		{#if !episode.isDownloaded && ondownload}
			<button
				class="p-2 text-text-secondary hover:text-accent disabled:opacity-50"
				onclick={() => ondownload?.(episode)}
				disabled={downloadingProgress != null}
				title="Download"
			>
				{#if downloadingProgress != null}
					<DownloadProgress progress={downloadingProgress} />
				{:else}
					<DownloadSimple size={20} />
				{/if}
			</button>
		{/if}
		<button
			class="p-2 hover:text-accent {isCurrentEpisode ? 'text-accent' : 'text-text-secondary'}"
			onclick={handlePlay}
			title={isActivePlaying ? i18n.t("episode.pause") : i18n.t("episode.play")}
		>
			{#if isActivePlaying}
				<Pause size={20} weight="fill" />
			{:else}
				<Play size={20} weight="fill" />
			{/if}
		</button>
	</div>
</div>
