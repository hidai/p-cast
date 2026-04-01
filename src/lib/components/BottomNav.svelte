<script lang="ts">
import Archive from "phosphor-svelte/lib/Archive";
import Gear from "phosphor-svelte/lib/Gear";
import House from "phosphor-svelte/lib/House";
import MagnifyingGlass from "phosphor-svelte/lib/MagnifyingGlass";
import { page } from "$app/state";
import { i18n } from "$lib/i18n";

const isActive = $derived({
	home: page.url.pathname === "/",
	discover: page.url.pathname === "/discover",
	library: page.url.pathname.startsWith("/library"),
	settings: page.url.pathname === "/settings",
});
</script>

<nav
	class="flex items-center justify-around bg-surface-glass backdrop-blur-xl py-2.5 pb-[env(safe-area-inset-bottom)]"
>
	<a
		href="/"
		class="flex flex-1 flex-col items-center gap-1 text-xs py-1 {isActive.home
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<House size={20} weight={isActive.home ? "fill" : "regular"} />
		<span>{i18n.t("nav.home")}</span>
	</a>
	<a
		href="/discover"
		class="flex flex-1 flex-col items-center gap-1 text-xs py-1 {isActive.discover
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<MagnifyingGlass size={20} weight={isActive.discover ? "fill" : "regular"} />
		<span>{i18n.t("nav.discover")}</span>
	</a>
	<a
		href="/library"
		class="flex flex-1 flex-col items-center gap-1 text-xs py-1 {isActive.library
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<Archive size={20} weight={isActive.library ? "fill" : "regular"} />
		<span>{i18n.t("nav.library")}</span>
	</a>
	<a
		href="/settings"
		class="flex flex-1 flex-col items-center gap-1 text-xs py-1 {isActive.settings
			? 'text-accent'
			: 'text-text-secondary'}"
	>
		<Gear size={20} weight={isActive.settings ? "fill" : "regular"} />
		<span>{i18n.t("nav.settings")}</span>
	</a>
</nav>
