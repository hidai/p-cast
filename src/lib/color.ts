const cache = new Map<string, string>();

const FALLBACK = "99, 102, 241"; // indigo-500 RGB

/**
 * Extract the dominant color from an image URL.
 * Returns an RGB string like "120, 80, 200" for use in rgba().
 * Falls back to accent color on CORS error or colorless images.
 */
export async function extractDominantColor(url: string): Promise<string> {
	if (!url) return FALLBACK;

	const cached = cache.get(url);
	if (cached) return cached;

	try {
		const color = await new Promise<string>((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = "anonymous";
			img.onload = () => {
				try {
					const size = 50;
					const canvas = document.createElement("canvas");
					canvas.width = size;
					canvas.height = size;
					const ctx = canvas.getContext("2d");
					if (!ctx) {
						resolve(FALLBACK);
						return;
					}
					ctx.drawImage(img, 0, 0, size, size);
					const data = ctx.getImageData(0, 0, size, size).data;

					let r = 0;
					let g = 0;
					let b = 0;
					let count = 0;

					for (let i = 0; i < data.length; i += 4) {
						const pr = data[i];
						const pg = data[i + 1];
						const pb = data[i + 2];

						// Skip near-white, near-black, and very grey pixels
						const max = Math.max(pr, pg, pb);
						const min = Math.min(pr, pg, pb);
						const lightness = (max + min) / 2;
						const saturation = max === 0 ? 0 : (max - min) / max;

						if (lightness < 20 || lightness > 235) continue;
						if (saturation < 0.1) continue;

						r += pr;
						g += pg;
						b += pb;
						count++;
					}

					if (count === 0) {
						resolve(FALLBACK);
						return;
					}

					resolve(`${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)}`);
				} catch {
					resolve(FALLBACK);
				}
			};
			img.onerror = () => reject(new Error("Failed to load image"));
			img.src = url;
		});

		cache.set(url, color);
		return color;
	} catch {
		cache.set(url, FALLBACK);
		return FALLBACK;
	}
}
