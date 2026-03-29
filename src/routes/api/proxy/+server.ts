import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, fetch }) => {
	const target = url.searchParams.get("url");
	if (!target) {
		return new Response("Missing url parameter", { status: 400 });
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
