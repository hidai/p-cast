<script lang="ts">
import type { Snippet } from "svelte";
import { cubicIn, cubicOut } from "svelte/easing";
import { fade, fly } from "svelte/transition";
import { overlay } from "$lib/overlay.svelte";

let {
	initialTop = 0.3,
	children,
	footer,
}: {
	initialTop?: number;
	children: Snippet;
	footer?: Snippet;
} = $props();

const snapTop = $derived(window.innerHeight * initialTop);
let sheetTop = $state(snapTop);
let isDragging = $state(false);
let dragStartY = 0;
let dragStartTop = 0;
let contentEl: HTMLDivElement | undefined = $state(undefined);

let isFullyExpanded = $derived(sheetTop === 0 && !isDragging);

function handleTouchStart(e: TouchEvent) {
	dragStartY = e.touches[0].clientY;
	dragStartTop = sheetTop;
	if (sheetTop === 0) {
		isDragging = false;
		return;
	}
	isDragging = true;
}

function handleTouchMove(e: TouchEvent) {
	const dy = e.touches[0].clientY - dragStartY;
	if (!isDragging) {
		if (sheetTop === 0 && contentEl && contentEl.scrollTop <= 0 && dy > 5) {
			isDragging = true;
			dragStartY = e.touches[0].clientY;
			dragStartTop = 0;
		}
		return;
	}
	e.preventDefault();
	sheetTop = Math.max(0, dragStartTop + dy);
}

function handleTouchEnd() {
	if (!isDragging) return;
	isDragging = false;
	const halfY = snapTop;
	const closeThreshold = window.innerHeight * 0.65;
	if (sheetTop > closeThreshold) {
		overlay.closeAll();
	} else if (sheetTop > halfY * 0.4) {
		sheetTop = halfY;
	} else {
		sheetTop = 0;
	}
}

let wheelTimeout: ReturnType<typeof setTimeout> | null = null;

function handleWheel(e: WheelEvent) {
	if (sheetTop === 0 && contentEl) {
		if (!(contentEl.scrollTop <= 0 && e.deltaY < 0)) {
			return;
		}
	}
	e.preventDefault();
	sheetTop = Math.max(0, sheetTop - e.deltaY);
	if (wheelTimeout) clearTimeout(wheelTimeout);
	wheelTimeout = setTimeout(() => {
		const halfY = snapTop;
		const closeThreshold = window.innerHeight * 0.65;
		if (sheetTop > closeThreshold) {
			overlay.closeAll();
		} else if (sheetTop > halfY * 0.4) {
			sheetTop = halfY;
		} else {
			sheetTop = 0;
		}
	}, 150);
}
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="fixed inset-0 z-50">
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<div
		class="absolute inset-0 backdrop-overlay"
		in:fade={{ duration: 300 }}
		out:fade={{ duration: 200 }}
		onclick={() => overlay.closeAll()}
	></div>

	<!-- Sheet -->
	<div
		class="absolute left-0 right-0 bottom-0 bg-bg-secondary rounded-t-3xl flex flex-col overflow-hidden shadow-2xl"
		in:fly={{ y: window.innerHeight * (1 - initialTop), duration: 300, easing: cubicOut }}
		out:fly={{ y: window.innerHeight * (1 - initialTop), duration: 200, easing: cubicIn }}
		style="top: {sheetTop}px; transition: {isDragging ? 'none' : 'top 0.3s cubic-bezier(0.32, 0.72, 0, 1)'};"
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		onwheel={handleWheel}
	>
		<!-- Drag handle -->
		<div class="flex justify-center pt-3 pb-2 shrink-0">
			<div class="w-8 h-1 rounded-full bg-border"></div>
		</div>

		<!-- Content -->
		<div
			class="flex-1 overflow-x-hidden {isFullyExpanded ? 'overflow-y-auto' : 'overflow-hidden'}"
			bind:this={contentEl}
		>
			{@render children()}
		</div>

		<!-- Fixed footer (outside scroll area) -->
		{#if footer}
			{@render footer()}
		{/if}
	</div>
</div>

<style>
	.backdrop-overlay {
		background: rgba(0, 0, 0, 0.3);
	}
	:global(:root.dark) .backdrop-overlay {
		background: rgba(0, 0, 0, 0.6);
	}
	@media (prefers-color-scheme: dark) {
		:global(:root:not(.light)) .backdrop-overlay {
			background: rgba(0, 0, 0, 0.6);
		}
	}
</style>
