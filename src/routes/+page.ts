import { redirect } from "@sveltejs/kit";
import { db } from "$lib/db";

const redirectKey = "p-cast:discoveredOnce";

export async function load() {
	if (sessionStorage.getItem(redirectKey)) return {};

	let isEmpty = false;
	try {
		const [podcasts, episodes, audioFiles] = await Promise.all([
			db.podcasts.count(),
			db.episodes.count(),
			db.audioFiles.count(),
		]);
		isEmpty = podcasts === 0 && episodes === 0 && audioFiles === 0;
	} catch {
		return {};
	}

	if (isEmpty) {
		sessionStorage.setItem(redirectKey, "1");
		redirect(307, "/discover");
	}

	return {};
}
