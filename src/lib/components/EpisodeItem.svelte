<script lang="ts">
import type { Episode, Podcast } from "$lib/db";
import { player } from "$lib/player.svelte";
import { formatDuration } from "$lib/podcast-service";

let {
	episode,
	podcast,
	downloadingProgress = null,
	ondownload,
	onplay,
}: {
	episode: Episode;
	podcast?: Podcast;
	downloadingProgress?: number | null;
	ondownload?: (episode: Episode) => void;
	onplay?: (episode: Episode) => void;
} = $props();

function formatDate(ts: number): string {
	if (!ts) return "";
	return new Date(ts).toLocaleDateString("ja-JP", { month: "short", day: "numeric" });
}

const imgUrl = $derived(episode.coverUrl || podcast?.coverUrl);

function handlePlay() {
	if (onplay) {
		onplay(episode);
	} else {
		player.play(episode);
	}
}
</script>

<div class="flex items-center gap-3 p-3 rounded-lg bg-bg-card/50 hover:bg-bg-card transition">
	{#if imgUrl}
		<img src={imgUrl} alt="" class="w-12 h-12 rounded-lg object-cover shrink-0" />
	{/if}
	<div class="flex-1 min-w-0">
		<p class="text-sm font-medium truncate {episode.isCompleted ? 'text-text-secondary' : ''}">
			{episode.title}
		</p>
		<p class="text-xs text-text-secondary">
			{formatDate(episode.pubDate)}
			{#if episode.duration > 0} · {formatDuration(episode.duration)}{/if}
			{#if episode.isDownloaded}<span class="text-accent"> · Downloaded</span>{/if}
			{#if episode.currentTime > 0 && !episode.isCompleted}
				<span class="text-accent"> · {formatDuration(episode.currentTime)} played</span>
			{/if}
		</p>
	</div>
	<div class="flex gap-1 shrink-0">
		{#if !episode.isDownloaded && ondownload}
			<button
				class="p-2 text-text-secondary hover:text-accent disabled:opacity-50"
				onclick={() => ondownload?.(episode)}
				disabled={downloadingProgress != null}
				title="Download"
			>
				{#if downloadingProgress != null}
					{@const pct = Math.round(downloadingProgress * 100)}
					<svg class="w-5 h-5" viewBox="0 0 24 24">
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							class="opacity-25"
						/>
						<circle
							cx="12"
							cy="12"
							r="10"
							fill="none"
							stroke="currentColor"
							stroke-width="2.5"
							stroke-dasharray={2 * Math.PI * 10}
							stroke-dashoffset={2 * Math.PI * 10 * (1 - downloadingProgress)}
							stroke-linecap="round"
							transform="rotate(-90 12 12)"
							class="text-accent transition-[stroke-dashoffset] duration-300"
						/>
						<text
							x="12"
							y="12"
							text-anchor="middle"
							dominant-baseline="central"
							fill="currentColor"
							font-size="7"
							class="text-accent">{pct}</text
						>
					</svg>
				{:else}
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
						/>
					</svg>
				{/if}
			</button>
		{/if}
		<button class="p-2 text-text-secondary hover:text-accent" onclick={handlePlay} title="Play">
			<svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
				<path d="M8 5v14l11-7z" />
			</svg>
		</button>
	</div>
</div>
