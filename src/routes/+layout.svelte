<script lang="ts">
import "../app.css";
import { afterNavigate } from "$app/navigation";
import BottomNav from "$lib/components/BottomNav.svelte";
import EpisodeDetailSheet from "$lib/components/EpisodeDetailSheet.svelte";
import FullPlayer from "$lib/components/FullPlayer.svelte";
import MiniPlayer from "$lib/components/MiniPlayer.svelte";
import PodcastDetailSheet from "$lib/components/PodcastDetailSheet.svelte";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import "$lib/theme.svelte";

let { children } = $props();

afterNavigate((nav) => overlay.handleNavigation(nav.type));

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

<svelte:window onkeydown={handleKeydown} onpopstate={(e) => overlay.handlePopState(e)} />

<div class="flex flex-col h-full">
	<main class="flex-1 overflow-y-auto {player.currentEpisode ? 'pb-28' : 'pb-16'}">
		{@render children()}
	</main>
</div>

<!-- Fixed bottom bar: MiniPlayer + BottomNav -->
<div class="fixed bottom-0 left-0 right-0 z-40">
	{#if player.currentEpisode}
		<MiniPlayer />
	{/if}
	<BottomNav />
</div>

{#if overlay.activeOverlay === "fullPlayer"}
	<FullPlayer />
{/if}

{#if overlay.activeOverlay === "episodeDetail" && overlay.detailEpisode}
	<EpisodeDetailSheet episode={overlay.detailEpisode} />
{/if}

{#if overlay.activeOverlay === "podcastDetail" && overlay.detailPodcastFeedUrl}
	<PodcastDetailSheet feedUrl={overlay.detailPodcastFeedUrl} meta={overlay.detailPodcastMeta} />
{/if}
