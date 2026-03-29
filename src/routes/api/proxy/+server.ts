import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, fetch }) => {
	const target = url.searchParams.get("url");
	if (!target) {
		return new Response("Missing url parameter", { status: 400 });
	}

	const res = await fetch(target, {
		headers: {
			"User-Agent": "P-Cast/1.0",
			Accept: "application/rss+xml, application/xml, text/xml, */*",
		},
	});

	return new Response(res.body, {
		status: res.status,
		headers: {
			"Content-Type": res.headers.get("Content-Type") ?? "application/xml",
		},
	});
};
