import type { Episode } from "$lib/db";
import { resolveCoverUrl } from "$lib/utils";

export function createCoverUrlState(getEpisode: () => Episode | null): { readonly url: string } {
	let url = $state("");
	$effect(() => {
		const episode = getEpisode();
		if (!episode) {
			url = "";
			return;
		}
		// Keep the previous URL visible until the new one resolves — avoids a
		// flash of the placeholder fallback during episode switches.
		let cancelled = false;
		resolveCoverUrl(episode).then((resolved) => {
			if (!cancelled) url = resolved;
		});
		return () => {
			cancelled = true;
		};
	});
	return {
		get url() {
			return url;
		},
	};
}
