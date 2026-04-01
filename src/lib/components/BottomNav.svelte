<script lang="ts">
import { page } from "$app/state";
import { i18n } from "$lib/i18n";
</script>

<nav
	class="flex items-center justify-around bg-surface-glass backdrop-blur-xl border-t border-border-subtle py-2.5 pb-[env(safe-area-inset-bottom)]"
>
	<a
		href="/"
		class="flex flex-1 flex-col items-center gap-1 text-xs relative py-1 {page.url.pathname === '/'
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
			/>
		</svg>
		<span>{i18n.t("nav.home")}</span>
		{#if page.url.pathname === "/"}
			<div class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent"></div>
		{/if}
	</a>
	<a
		href="/discover"
		class="flex flex-1 flex-col items-center gap-1 text-xs relative py-1 {page.url.pathname === '/discover'
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<span>{i18n.t("nav.discover")}</span>
		{#if page.url.pathname === "/discover"}
			<div class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent"></div>
		{/if}
	</a>
	<a
		href="/library"
		class="flex flex-1 flex-col items-center gap-1 text-xs relative py-1 {page.url.pathname.startsWith('/library')
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
			/>
		</svg>
		<span>{i18n.t("nav.library")}</span>
		{#if page.url.pathname.startsWith("/library")}
			<div class="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent"></div>
		{/if}
	</a>
</nav>
