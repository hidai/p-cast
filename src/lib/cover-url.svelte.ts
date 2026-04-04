import type { Episode } from "$lib/db";
import { resolveCoverUrl } from "$lib/utils";

export function createCoverUrlState(getEpisode: () => Episode | null): { readonly url: string } {
	let url = $state("");
	$effect(() => {
		const episode = getEpisode();
		url = "";
		if (!episode) return;
		resolveCoverUrl(episode).then((resolved) => {
			url = resolved;
		});
	});
	return {
		get url() {
			return url;
		},
	};
}
