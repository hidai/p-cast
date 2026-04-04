<script lang="ts">
import MusicNote from "phosphor-svelte/lib/MusicNote";

let {
	src,
	alt = "",
	class: className = "",
}: {
	src: string | undefined;
	alt?: string;
	class?: string;
} = $props();

// Track which src failed so we can reset when src changes
let errorSrc = $state<string | undefined>(undefined);
const showFallback = $derived(!src || errorSrc === src);
</script>

{#if !showFallback}
	<img {src} {alt} class={className} onerror={() => (errorSrc = src)} />
{:else}
	<div class="{className} bg-bg-card flex items-center justify-center">
		<MusicNote size={24} weight="light" class="text-text-secondary" />
	</div>
{/if}
