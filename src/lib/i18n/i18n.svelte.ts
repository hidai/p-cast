import type { TranslationKey, TranslationKeys } from "./keys";
import { en } from "./translations/en";
import { ja } from "./translations/ja";

export type Locale = "ja" | "en";

const translations: Record<Locale, TranslationKeys> = { ja, en };

const STORAGE_KEY = "p-cast:locale";

function detectLocale(): Locale {
	if (typeof window === "undefined") return "ja";
	const saved = localStorage.getItem(STORAGE_KEY);
	if (saved === "ja" || saved === "en") return saved;
	return navigator.language.startsWith("ja") ? "ja" : "en";
}

class I18nManager {
	locale: Locale = $state(detectLocale());

	t(key: TranslationKey): string {
		return translations[this.locale][key] ?? translations.ja[key] ?? key;
	}

	formatDate(ts: number, options?: Intl.DateTimeFormatOptions): string {
		if (!ts) return "";
		return new Date(ts).toLocaleDateString(this.locale === "ja" ? "ja-JP" : "en-US", options);
	}

	setLocale(locale: Locale) {
		this.locale = locale;
		localStorage.setItem(STORAGE_KEY, locale);
	}
}

export const i18n = new I18nManager();
