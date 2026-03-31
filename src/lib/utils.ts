/** Strip <script> tags for safety, keep other HTML */
export function sanitizeHtml(html: string): string {
	return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}
