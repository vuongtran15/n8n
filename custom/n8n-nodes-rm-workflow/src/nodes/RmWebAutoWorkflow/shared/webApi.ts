/** Response chuẩn từ HTTP API Web Automation (RMIV.WF.CLIENT). */
export interface WebAutoApiResponse {
	Success?: boolean;
	Message?: string;
	Result?: unknown;
}

export function normalizeBaseUrl(url: string): string {
	return url.trim().replace(/\/+$/, '');
}

const LOOPBACK_HOST = /^(localhost|127\.0\.0\.1|\[::1\])$/i;

/** URL đích: thêm scheme nếu thiếu; chỉ http loopback → 127.0.0.1. */
export function normalizeRequestUrl(url: string): string {
	let raw = url.trim();
	if (!raw) {
		throw new Error('URL không được rỗng.');
	}
	if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw)) {
		const hostPart = raw.split(/[/?#]/, 1)[0] ?? raw;
		const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(?=:|\/)?/i.test(hostPart);
		raw = `${isLocal ? 'http' : 'https'}://${raw}`;
	}
	let parsed: URL;
	try {
		parsed = new URL(raw);
	} catch {
		throw new Error(`URL không hợp lệ: ${url}`);
	}
	if (parsed.protocol === 'http:' && LOOPBACK_HOST.test(parsed.hostname)) {
		parsed.hostname = '127.0.0.1';
	}
	return parsed.toString().replace(/\/+$/, '');
}
