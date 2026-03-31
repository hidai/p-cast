import type { RequestHandler } from "./$types";

function isAllowedUrl(target: string): boolean {
	let parsed: URL;
	try {
		parsed = new URL(target);
	} catch {
		return false;
	}

	if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
		return false;
	}

	const hostname = parsed.hostname;
	// Block private/internal IPs and cloud metadata endpoints
	if (
		hostname === "localhost" ||
		hostname === "127.0.0.1" ||
		hostname === "[::1]" ||
		hostname.startsWith("10.") ||
		hostname.startsWith("192.168.") ||
		hostname.startsWith("169.254.") ||
		hostname.startsWith("0.") ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
		hostname.startsWith("fc00:") ||
		hostname.startsWith("fd") ||
		hostname.startsWith("fe80:") ||
		hostname.endsWith(".local") ||
		hostname.endsWith(".internal")
	) {
		return false;
	}

	return true;
}

export const GET: RequestHandler = async ({ url, fetch }) => {
	const target = url.searchParams.get("url");
	if (!target) {
		return new Response("Missing url parameter", { status: 400 });
	}

	if (!isAllowedUrl(target)) {
		return new Response("URL not allowed", { status: 400 });
	}

	const res = await fetch(target, {
		headers: {
			"User-Agent": "P-Cast/1.0",
		},
	});

	// Read the full response body to avoid streaming truncation on serverless platforms
	const body = await res.arrayBuffer();

	const headers = new Headers();
	const contentType = res.headers.get("Content-Type");
	if (contentType) headers.set("Content-Type", contentType);
	headers.set("Content-Length", String(body.byteLength));

	return new Response(body, {
		status: res.status,
		headers,
	});
};
