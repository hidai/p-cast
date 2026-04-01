<script lang="ts">
import Pause from "phosphor-svelte/lib/Pause";
import Play from "phosphor-svelte/lib/Play";
import { overlay } from "$lib/overlay.svelte";
import { player } from "$lib/player.svelte";
import { formatDuration } from "$lib/podcast-service";
import { resolveCoverUrl } from "$lib/utils";

let coverUrl = $state("");

$effect(() => {
	const episode = player.currentEpisode;
	coverUrl = "";
	if (!episode) return;
	resolveCoverUrl(episode).then((url) => {
		coverUrl = url;
	});
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
		{#if coverUrl}
			<img
				src={coverUrl}
				alt=""
				class="shrink-0 w-10 h-10 rounded-lg object-cover ring-1 ring-border-subtle"
			/>
		{/if}
		<div class="flex-1 min-w-0">
			<p class="text-sm font-medium truncate">{player.currentEpisode?.title}</p>
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
