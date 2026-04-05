class NetworkState {
	online: boolean = $state(typeof navigator !== "undefined" ? navigator.onLine : true);

	private readonly handleOnline = () => {
		this.online = true;
	};
	private readonly handleOffline = () => {
		this.online = false;
	};

	constructor() {
		if (typeof window === "undefined") return;
		window.addEventListener("online", this.handleOnline);
		window.addEventListener("offline", this.handleOffline);
	}

	destroy() {
		if (typeof window === "undefined") return;
		window.removeEventListener("online", this.handleOnline);
		window.removeEventListener("offline", this.handleOffline);
	}
}

export const network = new NetworkState();

// Clean up event listeners on HMR to prevent duplicates
if (import.meta.hot) {
	import.meta.hot.dispose(() => network.destroy());
}
