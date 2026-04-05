<script lang="ts">
import { i18n } from "$lib/i18n";

let { playing = false }: { playing?: boolean } = $props();
</script>

<span
	class="inline-flex items-end gap-[1.5px] shrink-0 w-[14px] h-[14px] {playing ? 'text-accent' : 'text-accent/40'}"
	aria-label={playing ? i18n.t("episode.nowPlaying") : i18n.t("episode.paused")}
	role="img"
>
	<span class="w-[2.5px] h-[40%] bg-current rounded-full {playing ? 'bar bar-1' : ''}"></span>
	<span class="w-[2.5px] h-[80%] bg-current rounded-full {playing ? 'bar bar-2' : ''}"></span>
	<span class="w-[2.5px] h-[55%] bg-current rounded-full {playing ? 'bar bar-3' : ''}"></span>
	<span class="w-[2.5px] h-[30%] bg-current rounded-full {playing ? 'bar bar-4' : ''}"></span>
</span>

<style>
	@keyframes playing-bar-bounce {
		0%, 100% { transform: scaleY(1); }
		50% { transform: scaleY(0.3); }
	}

	.bar {
		transform-origin: bottom;
		animation: playing-bar-bounce 0.9s ease-in-out infinite;
	}

	.bar-1 { animation-delay: 0s; }
	.bar-2 { animation-delay: 0.2s; }
	.bar-3 { animation-delay: 0.1s; }
	.bar-4 { animation-delay: 0.3s; }
</style>
