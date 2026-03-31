<script lang="ts">
import "../app.css";
import BottomNav from "$lib/components/BottomNav.svelte";
import EpisodeDetailSheet from "$lib/components/EpisodeDetailSheet.svelte";
import FullPlayer from "$lib/components/FullPlayer.svelte";
import MiniPlayer from "$lib/components/MiniPlayer.svelte";
import { episodeDetail } from "$lib/episode-detail.svelte";
import { player } from "$lib/player.svelte";

let { children } = $props();

let closedByPopState = false;

function handlePopState(_e: PopStateEvent) {
	if (player.isFullPlayer) {
		closedByPopState = true;
		player.isFullPlayer = false;
	}
}

$effect(() => {
	if (player.isFullPlayer) {
		history.pushState({ fullPlayer: true }, "");
	} else {
		if (!closedByPopState) {
			if (history.state?.fullPlayer) {
				history.back();
			}
		}
		closedByPopState = false;
	}
});

function handleKeydown(e: KeyboardEvent) {
	if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
	if (e.code === "Space") {
		e.preventDefault();
		player.togglePlay();
	} else if (e.key === "j" || e.key === "J") {
		player.skip(-10);
	} else if (e.key === "l" || e.key === "L") {
		player.skip(10);
	}
}
</script>

<svelte:window onkeydown={handleKeydown} onpopstate={handlePopState} />

<div class="flex flex-col h-full">
	<main class="flex-1 overflow-y-auto pb-2">
		{@render children()}
	</main>
	{#if player.currentEpisode}
		<MiniPlayer />
	{/if}
	<BottomNav />
</div>

{#if player.isFullPlayer}
	<FullPlayer />
{/if}

{#if episodeDetail.episode}
	<EpisodeDetailSheet episode={episodeDetail.episode} onclose={() => episodeDetail.close()} />
{/if}
