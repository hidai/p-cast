import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { SvelteKitPWA } from "@vite-pwa/sveltekit";
import { defineConfig } from "vite";

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
			registerType: "autoUpdate",
			manifest: {
				name: "P-Cast",
				short_name: "P-Cast",
				description: "A simple, ad-free podcast player",
				theme_color: "#09090b",
				background_color: "#09090b",
				display: "standalone",
				scope: "/",
				start_url: "/",
				icons: [
					{
						src: "/icon-192.png",
						sizes: "192x192",
						type: "image/png",
					},
					{
						src: "/icon-512.png",
						sizes: "512x512",
						type: "image/png",
					},
				],
			},
			workbox: {
				globPatterns: ["**/*.{js,css,html,svg,png,woff2,json}"],
				navigateFallback: "/",
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/itunes\.apple\.com\/.*/i,
						handler: "NetworkFirst",
						options: {
							cacheName: "itunes-api-cache",
							expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 },
						},
					},
				],
			},
		}),
	],
});
