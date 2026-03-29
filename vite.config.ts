import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';
import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const tlsAgent = new https.Agent({ rejectUnauthorized: false });

// Start a small proxy server alongside Vite
function startProxyServer(port: number) {
	const server = http.createServer(async (req, res) => {
		res.setHeader('Access-Control-Allow-Origin', '*');
		res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
		res.setHeader('Access-Control-Allow-Headers', '*');

		if (req.method === 'OPTIONS') {
			res.writeHead(204);
			res.end();
			return;
		}

		const parsed = new URL(req.url ?? '', `http://localhost:${port}`);
		const target = parsed.searchParams.get('url');
		if (!target) {
			res.writeHead(400);
			res.end('Missing url parameter');
			return;
		}

		try {
			const targetUrl = new URL(target);
			const client = targetUrl.protocol === 'https:' ? https : http;

			const proxyReq = client.request(
				target,
				{
					method: 'GET',
					headers: {
						'User-Agent': 'P-Cast/1.0',
						Accept: 'application/rss+xml, application/xml, text/xml, */*',
					},
					timeout: 30000,
					agent: targetUrl.protocol === 'https:' ? tlsAgent : undefined,
				},
				(proxyRes) => {
					// Follow redirects
					if (proxyRes.statusCode && proxyRes.statusCode >= 300 && proxyRes.statusCode < 400 && proxyRes.headers.location) {
						const redirectUrl = new URL(proxyRes.headers.location, target).toString();
						const redirectParsed = new URL(redirectUrl);
						const redirectClient = redirectParsed.protocol === 'https:' ? https : http;
						const redirectReq = redirectClient.request(
							redirectUrl,
							{
								method: 'GET',
								headers: {
									'User-Agent': 'P-Cast/1.0',
									Accept: 'application/rss+xml, application/xml, text/xml, */*',
								},
								timeout: 30000,
								agent: redirectParsed.protocol === 'https:' ? tlsAgent : undefined,
							},
							(redirectRes) => {
								res.writeHead(redirectRes.statusCode ?? 200, {
									'Content-Type': redirectRes.headers['content-type'] ?? 'application/xml',
									'Access-Control-Allow-Origin': '*',
								});
								redirectRes.pipe(res);
							},
						);
						redirectReq.on('error', (e) => {
							res.writeHead(502);
							res.end(`Redirect proxy error: ${e.message}`);
						});
						redirectReq.end();
						return;
					}

					res.writeHead(proxyRes.statusCode ?? 200, {
						'Content-Type': proxyRes.headers['content-type'] ?? 'application/xml',
						'Access-Control-Allow-Origin': '*',
					});
					proxyRes.pipe(res);
				},
			);
			proxyReq.on('error', (e) => {
				res.writeHead(502);
				res.end(`Proxy error: ${e.message}`);
			});
			proxyReq.end();
		} catch (e) {
			res.writeHead(502);
			res.end(`Proxy error: ${e}`);
		}
	});

	server.listen(port, '0.0.0.0', () => {
		console.log(`  ➜  Proxy:   http://localhost:${port}/`);
	});

	return server;
}

let proxyServer: http.Server | null = null;
const PROXY_PORT = 5174;

export default defineConfig({
	plugins: [
		tailwindcss(),
		{
			name: 'cors-proxy-server',
			configureServer() {
				if (!proxyServer) {
					proxyServer = startProxyServer(PROXY_PORT);
				}
			},
			configurePreviewServer() {
				if (!proxyServer) {
					proxyServer = startProxyServer(PROXY_PORT);
				}
			},
		},
		sveltekit(),
		SvelteKitPWA({
			registerType: 'autoUpdate',
			manifest: {
				name: 'P-Cast',
				short_name: 'P-Cast',
				description: 'A simple, ad-free podcast player',
				theme_color: '#1e1b4b',
				background_color: '#0f0e1a',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/itunes\.apple\.com\/.*/i,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'itunes-api-cache',
							expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 }
						}
					}
				]
			}
		})
	]
});
