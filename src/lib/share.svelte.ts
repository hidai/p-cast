let _pendingFeedUrl = $state<string | null>(null);

export const pendingShare = {
	get feedUrl() {
		return _pendingFeedUrl;
	},
	set(url: string) {
		_pendingFeedUrl = url;
	},
	consume(): string | null {
		const url = _pendingFeedUrl;
		_pendingFeedUrl = null;
		return url;
	},
};
