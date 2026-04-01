<script lang="ts">
import { i18n } from "$lib/i18n";
import type { Locale } from "$lib/i18n/i18n.svelte";
import { theme } from "$lib/theme.svelte";

const themeOptions: { value: "system" | "light" | "dark"; label: () => string }[] = [
	{ value: "system", label: () => i18n.t("settings.themeSystem") },
	{ value: "light", label: () => i18n.t("settings.themeLight") },
	{ value: "dark", label: () => i18n.t("settings.themeDark") },
];

const languageOptions: { value: Locale; label: string }[] = [
	{ value: "ja", label: "日本語" },
	{ value: "en", label: "English" },
];
</script>

<div class="px-4 pt-4">
	<h1 class="text-xl font-bold mb-6">{i18n.t("settings.title")}</h1>

	<!-- Theme -->
	<section class="mb-6">
		<h2 class="text-sm font-semibold text-text-secondary tracking-wide mb-3">
			{i18n.t("settings.theme")}
		</h2>
		<div class="flex rounded-xl bg-bg-card p-1 gap-1">
			{#each themeOptions as opt (opt.value)}
				<button
					class="flex-1 py-2 text-sm font-medium rounded-lg transition-all {theme.mode ===
					opt.value
						? 'bg-accent text-white'
						: 'text-text-secondary hover:text-text-primary'}"
					onclick={() => theme.setMode(opt.value)}
				>
					{opt.label()}
				</button>
			{/each}
		</div>
	</section>

	<!-- Language -->
	<section class="mb-6">
		<h2 class="text-sm font-semibold text-text-secondary tracking-wide mb-3">
			{i18n.t("settings.language")}
		</h2>
		<div class="flex rounded-xl bg-bg-card p-1 gap-1">
			{#each languageOptions as opt (opt.value)}
				<button
					class="flex-1 py-2 text-sm font-medium rounded-lg transition-all {i18n.locale ===
					opt.value
						? 'bg-accent text-white'
						: 'text-text-secondary hover:text-text-primary'}"
					onclick={() => i18n.setLocale(opt.value)}
				>
					{opt.label}
				</button>
			{/each}
		</div>
	</section>
</div>
