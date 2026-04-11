export class HttpError extends Error {
	readonly status: number;

	constructor(status: number, message?: string) {
		super(message ?? `HTTP error ${status}`);
		this.name = "HttpError";
		this.status = status;
	}
}

export async function fetchJson<T>(url: string): Promise<T> {
	const res = await fetch(url);
	if (!res.ok) throw new HttpError(res.status);
	return res.json() as Promise<T>;
}

export async function fetchXml(url: string): Promise<Document> {
	const res = await fetch(url);
	if (!res.ok) throw new HttpError(res.status);
	const text = await res.text();
	const doc = new DOMParser().parseFromString(text, "text/xml");
	const parseError = doc.querySelector("parsererror");
	if (parseError) throw new Error(`XML parse error: ${parseError.textContent?.slice(0, 100)}`);
	return doc;
}
