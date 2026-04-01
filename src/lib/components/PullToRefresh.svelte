<script lang="ts">
import ArrowDown from "phosphor-svelte/lib/ArrowDown";
import type { Snippet } from "svelte";
import Spinner from "./Spinner.svelte";

let {
	onrefresh,
	children,
}: {
	onrefresh: () => Promise<void>;
	children: Snippet;
} = $props();

const THRESHOLD = 60;
const MAX_PULL = 100;

let pullDistance = $state(0);
let isRefreshing = $state(false);
let startY = 0;
let pulling = $state(false);

function getScrollParent(el: HTMLElement): HTMLElement {
	let node: HTMLElement | null = el.parentElement;
	while (node) {
		const style = getComputedStyle(node);
		if (/(auto|scroll)/.test(style.overflowY)) return node;
		node = node.parentElement;
	}
	return document.documentElement;
}

let container: HTMLElement | undefined = $state();
let scrollParent: HTMLElement | undefined;

$effect(() => {
	if (container) {
		scrollParent = getScrollParent(container);
	}
});

function handleTouchStart(e: TouchEvent) {
	if (isRefreshing) return;
	if (scrollParent && scrollParent.scrollTop > 0) return;
	startY = e.touches[0].clientY;
	pulling = true;
}

function handleTouchMove(e: TouchEvent) {
	if (!pulling || isRefreshing) return;
	if (scrollParent && scrollParent.scrollTop > 0) {
		pulling = false;
		pullDistance = 0;
		return;
	}
	const deltaY = e.touches[0].clientY - startY;
	if (deltaY > 0) {
		pullDistance = Math.min(deltaY * 0.5, MAX_PULL);
		if (pullDistance > 10) {
			e.preventDefault();
		}
	} else {
		pullDistance = 0;
	}
}

async function handleTouchEnd() {
	if (!pulling) return;
	pulling = false;
	if (pullDistance >= THRESHOLD && !isRefreshing) {
		isRefreshing = true;
		pullDistance = THRESHOLD * 0.6;
		try {
			await onrefresh();
		} finally {
			isRefreshing = false;
			pullDistance = 0;
		}
	} else {
		pullDistance = 0;
	}
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	bind:this={container}
	ontouchstart={handleTouchStart}
	ontouchmove={handleTouchMove}
	ontouchend={handleTouchEnd}
>
	<div
		class="flex items-center justify-center overflow-hidden transition-height"
		style="height: {pullDistance}px; transition: {pulling ? 'none' : 'height 0.2s ease-out'}"
	>
		{#if isRefreshing}
			<Spinner class="w-5 h-5 text-accent" />
		{:else if pullDistance > 0}
			<span
				class="text-text-secondary transition-transform"
				style="display:inline-flex; transform: rotate({Math.min((pullDistance / THRESHOLD) * 180, 180)}deg); opacity: {Math.min(pullDistance / THRESHOLD, 1)}"
			>
				<ArrowDown size={20} />
			</span>
		{/if}
	</div>
	{@render children()}
</div>
