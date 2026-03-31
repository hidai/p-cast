<script lang="ts">
import "../app.css";
import { afterNavigate } from "$app/navigation";
import BottomNav from "$lib/components/BottomNav.svelte";
import EpisodeDetailSheet from "$lib/components/EpisodeDetailSheet.svelte";
import FullPlayer from "$lib/components/FullPlayer.svelte";
import MiniPlayer from "$lib/components/MiniPlayer.svelte";
import { db } from "$lib/db";
import { episodeDetail } from "$lib/episode-detail.svelte";
import { player } from "$lib/player.svelte";

let { children } = $props();

let sheetClosedByPopState = false;
let sheetClosedByNavigation = false;
let playerClosedByPopState = false;

afterNavigate(() => {
	if (episodeDetail.episode) {
		sheetClosedByNavigation = true;
		episodeDetail.close();
	}
});

function handlePopState(e: PopStateEvent) {
	if (e.state?.episodeGuid && !episodeDetail.episode) {
		// Navigated back to a sheet entry — restore it from DB
		db.episodes.get(e.state.episodeGuid).then((ep) => {
			if (ep) episodeDetail.open(ep);
		});
		return;
	}
	if (episodeDetail.episode) {
		sheetClosedByPopState = true;
		episodeDetail.close();
	} else if (player.isFullPlayer) {
		playerClosedByPopState = true;
		player.isFullPlayer = false;
	}
}

$effect(() => {
	if (player.isFullPlayer) {
		history.pushState({ fullPlayer: true }, "");
	} else {
		if (!playerClosedByPopState) {
			if (history.state?.fullPlayer) {
				history.back();
			}
		}
		playerClosedByPopState = false;
	}
});

$effect(() => {
	if (episodeDetail.episode) {
		// Only push if current state doesn't already have this entry (avoids double-push on restore)
		if (!history.state?.episodeDetail) {
			history.pushState({ episodeDetail: true, episodeGuid: episodeDetail.episode.guid }, "");
		}
	} else {
		if (!sheetClosedByPopState && !sheetClosedByNavigation) {
			if (history.state?.episodeDetail) {
				history.back();
			}
		}
		sheetClosedByPopState = false;
		sheetClosedByNavigation = false;
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
