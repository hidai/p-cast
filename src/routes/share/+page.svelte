<script lang="ts">
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import { page } from "$app/state";
import Spinner from "$lib/components/Spinner.svelte";
import { i18n } from "$lib/i18n";
import { lookupPodcastById } from "$lib/podcast-service";
import { pendingShare } from "$lib/share.svelte";

const APPLE_PODCASTS_RE = /\/id(\d+)/;

function extractUrl(params: URLSearchParams): string {
	return params.get("url") ?? params.get("text") ?? "";
}

function extractApplePodcastId(url: string): string | null {
	if (!url.includes("podcasts.apple.com") && !url.includes("itunes.apple.com")) return null;
	const match = APPLE_PODCASTS_RE.exec(url);
	return match ? match[1] : null;
}

onMount(async () => {
	const rawUrl = extractUrl(page.url.searchParams).trim();

	if (!rawUrl) {
		goto("/discover", { replaceState: true });
		return;
	}

	const appleId = extractApplePodcastId(rawUrl);
	if (appleId) {
		try {
			const result = await lookupPodcastById(appleId);
			if (result) {
				pendingShare.set(result.feedUrl);
			}
		} catch {
			// Ignore lookup errors — fall through to discover
		}
	} else {
		// Treat as a direct RSS feed URL
		pendingShare.set(rawUrl);
	}

	goto("/", { replaceState: true });
});
</script>

<div class="flex items-center justify-center h-full min-h-64 gap-3 text-text-secondary">
	<Spinner class="w-5 h-5 text-accent" />
	<span class="text-sm">{i18n.t("share.loading")}</span>
</div>
