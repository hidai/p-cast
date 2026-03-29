<script lang="ts">
	import { player } from '$lib/player.svelte';
	import { formatDuration, downloadEpisode, deleteDownload } from '$lib/podcast-service';
	import { db } from '$lib/db';

	const rates = [0.5, 0.75, 1.0, 1.2, 1.5, 2.0];

	let touchStartY = 0;

	function handleTouchStart(e: TouchEvent) {
		touchStartY = e.touches[0].clientY;
	}

	function handleTouchEnd(e: TouchEvent) {
		const diff = e.changedTouches[0].clientY - touchStartY;
		if (diff > 100) {
			player.isFullPlayer = false;
		}
	}

	function handleSeek(e: Event) {
		const input = e.target as HTMLInputElement;
		player.seek(Number(input.value));
	}

	async function toggleDownload() {
		if (!player.currentEpisode) return;
		if (player.currentEpisode.isDownloaded) {
			await deleteDownload(player.currentEpisode.guid);
			player.currentEpisode = { ...player.currentEpisode, isDownloaded: false };
		} else {
			await downloadEpisode(player.currentEpisode);
			player.currentEpisode = { ...player.currentEpisode, isDownloaded: true };
		}
	}

	let coverUrl = $derived.by(async () => {
		if (!player.currentEpisode) return '';
		if (player.currentEpisode.coverUrl) return player.currentEpisode.coverUrl;
		const podcast = await db.podcasts.get(player.currentEpisode.podcastFeedUrl);
		return podcast?.coverUrl ?? '';
	});
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="fixed inset-0 z-50 bg-bg-primary flex flex-col"
	ontouchstart={handleTouchStart}
	ontouchend={handleTouchEnd}
>
	<!-- Header -->
	<div class="flex items-center justify-between px-4 py-3">
		<button class="text-text-secondary" onclick={() => (player.isFullPlayer = false)} aria-label="Close player">
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
			</svg>
		</button>
		<span class="text-sm text-text-secondary">Now Playing</span>
		<div class="w-6"></div>
	</div>

	<!-- Artwork -->
	<div class="flex-1 flex items-center justify-center px-8">
		{#await coverUrl then url}
			{#if url}
				<img src={url} alt="Cover" class="w-full max-w-80 rounded-2xl shadow-2xl aspect-square object-cover" />
			{:else}
				<div class="w-full max-w-80 rounded-2xl bg-bg-card aspect-square flex items-center justify-center">
					<svg class="w-24 h-24 text-text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
					</svg>
				</div>
			{/if}
		{/await}
	</div>

	<!-- Info & Controls -->
	<div class="px-6 pb-8 pt-4">
		<h2 class="text-lg font-semibold truncate">{player.currentEpisode?.title}</h2>

		<!-- Seek bar -->
		<div class="mt-4">
			<input
				type="range"
				min="0"
				max={player.duration || 0}
				value={player.currentTime}
				oninput={handleSeek}
				class="w-full h-1 appearance-none bg-border rounded-full accent-accent"
			/>
			<div class="flex justify-between text-xs text-text-secondary mt-1">
				<span>{formatDuration(player.currentTime)}</span>
				<span>-{formatDuration(Math.max(0, player.duration - player.currentTime))}</span>
			</div>
		</div>

		<!-- Controls -->
		<div class="flex items-center justify-center gap-8 mt-4">
			<button class="text-text-secondary" onclick={() => player.skip(-10)}>
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
				</svg>
				<span class="text-xs block">10s</span>
			</button>
			<button
				class="w-16 h-16 flex items-center justify-center rounded-full bg-accent text-white"
				onclick={() => player.togglePlay()}
			>
				{#if player.isPlaying}
					<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
					</svg>
				{:else}
					<svg class="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
						<path d="M8 5v14l11-7z" />
					</svg>
				{/if}
			</button>
			<button class="text-text-secondary" onclick={() => player.skip(10)}>
				<svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
				</svg>
				<span class="text-xs block">10s</span>
			</button>
		</div>

		<!-- Rate & Download -->
		<div class="flex items-center justify-between mt-6">
			<div class="flex gap-1">
				{#each rates as rate}
					<button
						class="px-2 py-1 text-xs rounded {player.playbackRate === rate ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'}"
						onclick={() => player.setRate(rate)}
					>
						{rate}x
					</button>
				{/each}
			</div>
			<button
				class="p-2 rounded-full {player.currentEpisode?.isDownloaded ? 'text-accent' : 'text-text-secondary'}"
				onclick={toggleDownload}
				aria-label="Toggle download"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
				</svg>
			</button>
		</div>
	</div>
</div>
