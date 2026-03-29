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

	const headers = new Headers();
	const contentType = res.headers.get("Content-Type");
	if (contentType) headers.set("Content-Type", contentType);
	const contentLength = res.headers.get("Content-Length");
	if (contentLength) headers.set("Content-Length", contentLength);
	const acceptRanges = res.headers.get("Accept-Ranges");
	if (acceptRanges) headers.set("Accept-Ranges", acceptRanges);

	return new Response(res.body, {
		status: res.status,
		headers,
	});
};
