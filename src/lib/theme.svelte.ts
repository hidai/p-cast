type ThemeMode = "system" | "light" | "dark";

const STORAGE_KEY = "p-cast:theme";

class ThemeManager {
	mode: ThemeMode = $state("system");
	resolvedDark: boolean = $state(false);

	constructor() {
		const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
		if (saved === "light" || saved === "dark") {
			this.mode = saved;
		}
		this.apply();

		window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
			if (this.mode === "system") this.apply();
		});
	}

	toggle() {
		this.setMode(this.resolvedDark ? "light" : "dark");
	}

	setMode(mode: ThemeMode) {
		this.mode = mode;
		localStorage.setItem(STORAGE_KEY, mode);
		this.apply();
	}

	private apply() {
		const isDark =
			this.mode === "dark" ||
			(this.mode === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

		this.resolvedDark = isDark;
		document.documentElement.classList.toggle("dark", isDark);
		document.documentElement.classList.toggle("light", !isDark);

		const meta = document.querySelector('meta[name="theme-color"]');
		if (meta) {
			meta.setAttribute("content", isDark ? "#09090b" : "#fafafa");
		}
	}
}

export const theme = new ThemeManager();
