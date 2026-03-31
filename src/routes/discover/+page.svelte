<script lang="ts">
import { goto } from "$app/navigation";
import { page } from "$app/stores";
import { i18n } from "$lib/i18n";
import { overlay } from "$lib/overlay.svelte";
import {
	fetchTopPodcasts,
	lookupPodcastById,
	type SearchResult,
	searchPodcasts,
	type TopPodcast,
} from "$lib/podcast-service";

let query = $state("");
let results: SearchResult[] = $state([]);
let isSearching = $state(false);

let topPodcasts: TopPodcast[] = $state([]);
let isLoadingTop = $state(false);
let lookingUpId: string | null = $state(null);

const urlQuery = $derived($page.url.searchParams.get("q") ?? "");
const showTopPodcasts = $derived(results.length === 0 && !isSearching && !urlQuery);

let lastSyncedUrlQuery = "";
$effect(() => {
	const q = urlQuery;
	if (q && q !== lastSyncedUrlQuery) {
		lastSyncedUrlQuery = q;
		query = q;
		doSearch(q);
	}
});

$effect(() => {
	if (topPodcasts.length === 0) {
		loadTopPodcasts();
	}
});

async function loadTopPodcasts() {
	isLoadingTop = true;
	try {
		topPodcasts = await fetchTopPodcasts();
	} catch {
		topPodcasts = [];
	}
	isLoadingTop = false;
}

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

function handleInput() {
	if (query === "") {
		results = [];
		lastSyncedUrlQuery = "";
		goto("/discover", { replaceState: true, keepFocus: true });
	}
}

function openPodcast(result: SearchResult) {
	overlay.openPodcastDetail(result.feedUrl, {
		title: result.trackName,
		author: result.artistName,
		coverUrl: result.artworkUrl600 || result.artworkUrl100,
	});
}

async function openTopPodcast(podcast: TopPodcast) {
	if (lookingUpId) return;
	lookingUpId = podcast.id;
	try {
		const result = await lookupPodcastById(podcast.id);
		if (result) {
			overlay.openPodcastDetail(result.feedUrl, {
				title: result.trackName,
				author: result.artistName,
				coverUrl: result.artworkUrl600 || result.artworkUrl100,
			});
		}
	} finally {
		lookingUpId = null;
	}
}
</script>

<div class="px-4 pt-4">
	<h1 class="text-xl font-bold mb-4">{i18n.t("discover.title")}</h1>

	<div class="flex gap-2 mb-4">
		<input
			type="search"
			placeholder={i18n.t("discover.searchPlaceholder")}
			bind:value={query}
			onkeydown={handleKeydown}
			oninput={handleInput}
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
					{i18n.t("discover.search")}
				{/if}
		</button>
	</div>

	{#if showTopPodcasts}
		<div>
			<h2 class="text-sm font-semibold uppercase tracking-wider text-text-secondary mb-3">
				{i18n.t("discover.popularPodcasts")}
			</h2>
			{#if isLoadingTop}
				<div class="flex justify-center py-8">
					<svg class="w-6 h-6 animate-spin text-accent" fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
					</svg>
				</div>
			{:else}
				<div class="space-y-2">
					{#each topPodcasts as podcast, i (podcast.id)}
						<button
							class="flex items-center gap-3 p-3 rounded-lg bg-bg-card/50 hover:bg-bg-card transition w-full text-left disabled:opacity-50"
							onclick={() => openTopPodcast(podcast)}
							disabled={lookingUpId === podcast.id}
						>
							<span class="text-sm font-bold text-text-secondary w-6 text-right shrink-0">{i + 1}</span>
							<img
								src={podcast.artworkUrl100}
								alt=""
								class="w-14 h-14 rounded-lg object-cover shrink-0"
							/>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium truncate">{podcast.name}</p>
								<p class="text-xs text-text-secondary truncate">{podcast.artistName}</p>
							</div>
							{#if lookingUpId === podcast.id}
								<svg class="w-4 h-4 animate-spin text-accent shrink-0" fill="none" viewBox="0 0 24 24">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
								</svg>
							{/if}
						</button>
					{/each}
				</div>
			{/if}
		</div>
	{:else}
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
	{/if}
</div>
