class NetworkState {
	online: boolean = $state(typeof navigator !== "undefined" ? navigator.onLine : true);

	constructor() {
		if (typeof window === "undefined") return;
		window.addEventListener("online", () => {
			this.online = true;
		});
		window.addEventListener("offline", () => {
			this.online = false;
		});
	}
}

export const network = new NetworkState();
