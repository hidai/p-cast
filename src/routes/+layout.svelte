<script lang="ts">
import "../app.css";
import { afterNavigate } from "$app/navigation";
import BottomNav from "$lib/components/BottomNav.svelte";
import EpisodeDetailSheet from "$lib/components/EpisodeDetailSheet.svelte";
import FullPlayer from "$lib/components/FullPlayer.svelte";
import MiniPlayer from "$lib/components/MiniPlayer.svelte";
import PodcastDetailSheet from "$lib/components/PodcastDetailSheet.svelte";
import { i18n } from "$lib/i18n";
import { network } from "$lib/network.svelte";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { pwa } from "$lib/pwa.svelte";
import { cleanupExpiredDownloads } from "$lib/podcast-service";
import "$lib/theme.svelte";

let { children } = $props();

const bannerCount = $derived(
	(network.online ? 0 : 1) + (pwa.updateAvailable ? 1 : 0),
);

afterNavigate((nav) => overlay.handleNavigation(nav.type));

cleanupExpiredDownloads();

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

<svelte:head>
	<meta name="description" content={i18n.t("app.description")} />
</svelte:head>

<svelte:window onkeydown={handleKeydown} onpopstate={(e) => overlay.handlePopState(e)} />

{#if !network.online}
	<div
		class="fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-1.5 bg-bg-elevated text-text-secondary text-xs py-1.5 border-b border-border"
		role="status"
		aria-live="polite"
	>
		<span class="w-1.5 h-1.5 rounded-full bg-text-tertiary" aria-hidden="true"></span>
		{i18n.t("offline.banner")}
	</div>
{/if}

{#if pwa.updateAvailable}
	<div
		class="fixed left-0 right-0 z-50 flex items-center justify-between gap-2 bg-accent text-white text-xs py-1.5 px-3 border-b border-white/20"
		style="top: {network.online ? 0 : 1.75}rem"
		role="status"
		aria-live="polite"
	>
		<span class="flex items-center gap-1.5">
			<span class="w-1.5 h-1.5 rounded-full bg-white/60" aria-hidden="true"></span>
			{i18n.t("pwa.updateAvailable")}
		</span>
		<span class="flex items-center gap-2">
			<button class="font-medium underline underline-offset-2" onclick={() => pwa.applyUpdate()}>
				{i18n.t("pwa.updateNow")}
			</button>
			<button class="opacity-60 hover:opacity-100 px-1" aria-label={i18n.t("pwa.dismiss")} onclick={() => pwa.dismissUpdate()}>
				✕
			</button>
		</span>
	</div>
{/if}

<div class="flex flex-col h-full">
	<main class="flex-1 overflow-y-auto {player.currentEpisode ? 'pb-28' : 'pb-16'} {bannerCount === 2 ? 'pt-14' : bannerCount === 1 ? 'pt-7' : ''}">
		{@render children()}
	</main>
</div>

<!-- Fixed bottom bar: MiniPlayer + BottomNav -->
<div class="fixed bottom-0 left-0 right-0 z-40 border-t border-border bottom-bar-shadow">
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
