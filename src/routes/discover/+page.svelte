<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import { overlay } from "$lib/overlay.svelte";
import { type SearchResult, searchPodcasts } from "$lib/podcast-service";

let query = $state("");
let results: SearchResult[] = $state([]);
let isSearching = $state(false);

const urlQuery = $derived($page.url.searchParams.get("q") ?? "");

$effect(() => {
	const q = urlQuery;
	if (q && q !== query) {
		query = q;
		doSearch(q);
	}
});

async function doSearch(q: string) {
	isSearching = true;
	try {
		results = await searchPodcasts(q);
	} catch {
		results = [];
	}
	isSearching = false;
}

async function handleSearch() {
	const q = query.trim();
	if (!q) return;
	goto(`/discover?q=${encodeURIComponent(q)}`, { replaceState: true, keepFocus: true });
	await doSearch(q);
}

function handleKeydown(e: KeyboardEvent) {
	if (e.key === "Enter") handleSearch();
}

function openPodcast(result: SearchResult) {
	overlay.openPodcastDetail(result.feedUrl, {
		title: result.trackName,
		author: result.artistName,
		coverUrl: result.artworkUrl600 || result.artworkUrl100,
	});
}
</script>

<div class="px-4 pt-4">
	<h1 class="text-xl font-bold mb-4">Discover</h1>

	<div class="flex gap-2 mb-4">
		<input
			type="search"
			placeholder="Search podcasts..."
			bind:value={query}
			onkeydown={handleKeydown}
			class="flex-1 bg-bg-card border border-border rounded-lg px-4 py-2.5 text-sm text-text-primary placeholder-text-secondary focus:outline-none focus:border-accent"
		/>
		<button
			class="px-4 py-2.5 bg-accent text-white rounded-lg text-sm font-medium disabled:opacity-50"
			onclick={handleSearch}
			disabled={isSearching}
		>
			{#if isSearching}
					<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
				{:else}
					Search
				{/if}
		</button>
	</div>

	<div class="space-y-2">
		{#each results as result (result.feedUrl)}
			<button
				class="flex items-center gap-3 p-3 rounded-lg bg-bg-card/50 hover:bg-bg-card transition w-full text-left"
				onclick={() => openPodcast(result)}
			>
				<img
					src={result.artworkUrl100}
					alt=""
					class="w-14 h-14 rounded-lg object-cover shrink-0"
				/>
				<div class="min-w-0">
					<p class="text-sm font-medium truncate">{result.trackName}</p>
					<p class="text-xs text-text-secondary truncate">{result.artistName}</p>
				</div>
			</button>
		{/each}
	</div>
</div>
