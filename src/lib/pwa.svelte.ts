import { registerSW } from "virtual:pwa-register";

class PwaState {
	updateAvailable = $state(false);
	private _updateSW: ((reloadPage?: boolean) => Promise<void>) | null = null;

	constructor() {
		if (typeof window === "undefined") return;
		this._updateSW = registerSW({
			onNeedRefresh: () => {
				this.updateAvailable = true;
			},
		});
	}

	async applyUpdate() {
		await this._updateSW?.(true);
	}

	dismissUpdate() {
		// Hide the banner; the waiting SW remains installed and
		// onNeedRefresh will re-fire on next app launch.
		this.updateAvailable = false;
	}
}

export const pwa = new PwaState();
