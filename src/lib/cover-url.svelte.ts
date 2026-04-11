import type { Episode } from "$lib/db";
import { resolveCoverUrl } from "$lib/utils";

export function createCoverUrlState(getEpisode: () => Episode | null): { readonly url: string } {
	let url = $state("");
	$effect(() => {
		const episode = getEpisode();
		url = "";
		if (!episode) return;
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
