<script lang="ts">
</script>

<nav
	class="flex items-center justify-around bg-bg-secondary border-t border-border py-2 pb-[env(safe-area-inset-bottom)]"
>
	<a
		href="/"
		class="flex flex-col items-center gap-0.5 text-xs {page.url.pathname === '/'
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1"
			/>
		</svg>
		<span>Home</span>
	</a>
	<a
		href="/discover"
		class="flex flex-col items-center gap-0.5 text-xs {page.url.pathname === '/discover'
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<span>Discover</span>
	</a>
	<a
		href="/library"
		class="flex flex-col items-center gap-0.5 text-xs {page.url.pathname.startsWith('/library')
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				stroke-width="2"
				d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
			/>
		</svg>
		<span>Library</span>
	</a>
</nav>
