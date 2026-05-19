<script lang="ts">
import Pause from "phosphor-svelte/lib/Pause";
import Play from "phosphor-svelte/lib/Play";
import { createCoverUrlState } from "$lib/cover-url.svelte";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { formatDuration } from "$lib/podcast-service";
import { resizeMzstatic } from "$lib/utils";

const cover = createCoverUrlState(() => player.currentEpisode);

let titleEl: HTMLElement;
let isOverflowing = $state(false);

$effect(() => {
	const _title = player.currentEpisode?.title;
	isOverflowing = false;

	const rafId = requestAnimationFrame(() => {
		if (titleEl) {
			isOverflowing = titleEl.scrollWidth > titleEl.clientWidth;
		}
	});

	return () => cancelAnimationFrame(rafId);
});
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div>
	<!-- Progress bar on top -->
	<div class="h-1 bg-accent/20">
		<div
			class="h-full bg-accent transition-all {player.isPlaying ? 'shadow-[0_0_8px_var(--color-accent)]' : ''}"
			style="width: {player.progress * 100}%"
		></div>
	</div>
	<div
		class="flex items-center gap-3 bg-mini-player-bg border-b border-border-subtle px-4 py-2.5 cursor-pointer"
		onclick={() => overlay.openFullPlayer()}
	>
		{#if cover.url}
			<img
				src={resizeMzstatic(cover.url, 80)}
				alt=""
				class="shrink-0 w-10 h-10 rounded-lg object-cover ring-1 ring-border-subtle"
			/>
		{/if}
		<div class="flex-1 min-w-0 overflow-hidden">
			<p bind:this={titleEl} class="text-sm font-medium whitespace-nowrap {isOverflowing ? 'title-marquee' : ''}">
				{player.currentEpisode?.title}{#if isOverflowing}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;{player.currentEpisode?.title}{/if}
			</p>
			<p class="text-xs text-text-secondary">{formatDuration(player.currentTime)}</p>
		</div>
		<button
			class="shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-accent text-white active:scale-95 transition-all {player.isPlaying ? 'shadow-[0_0_12px_var(--color-accent)]' : 'shadow-md'}"
			onclick={(e: MouseEvent) => { e.stopPropagation(); player.togglePlay(); }}
		>
			{#if player.isPlaying}
				<Pause size={20} weight="fill" />
			{:else}
				<Play size={20} weight="fill" />
			{/if}
		</button>
	</div>
</div>

<style>
	.title-marquee {
		animation: title-marquee 14s linear infinite;
	}

	@keyframes title-marquee {
		0%, 12% { transform: translateX(0); }
		88%, 100% { transform: translateX(-50%); }
	}
</style>
