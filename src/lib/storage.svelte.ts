class StorageState {
	constructor() {
		if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
		this.requestPersistence();
	}

	private async requestPersistence() {
		try {
			if (navigator.storage.persisted) {
				const already = await navigator.storage.persisted();
				if (already) return;
			}
			await navigator.storage.persist();
		} catch {
			// Best-effort: failure does not affect app functionality
		}
	}
}

export const storage = new StorageState();
