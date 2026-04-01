<script lang="ts">
const CIRCUMFERENCE = 2 * Math.PI * 10;

let { progress, class: className = "w-5 h-5" }: { progress: number; class?: string } = $props();

const pct = $derived(Math.round(progress * 100));
</script>

<svg class={className} viewBox="0 0 24 24">
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
		stroke-dasharray={CIRCUMFERENCE}
		stroke-dashoffset={CIRCUMFERENCE * (1 - progress)}
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
