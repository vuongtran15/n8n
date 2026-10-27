/** Default portal base — không auth (xem docs/HUONG-DAN-API-WECOM.md). */
export const DEFAULT_WECOM_BASE_URL = 'https://ros.reginamiracle.com:200/api/n8n/wecom';

export const DEFAULT_WECOM_TIMEOUT_SECONDS = 60;

export interface WecomApiResponse {
	success?: boolean;
	Success?: boolean;
	errCode?: number;
	message?: string;
	Message?: string;
	mediaId?: string;
	[key: string]: unknown;
}

export function normalizeWecomBaseUrl(raw: string): string {
	return raw.trim().replace(/\/+$/, '');
}

/** Chuẩn hoá response portal → Success/Message dùng chung branchOnSuccess với các node RM khác. */
export function normalizeWecomResponse(data: unknown): Record<string, unknown> {
	if (typeof data !== 'object' || data === null) {
		return { result: data, Success: false };
	}
	const obj = data as WecomApiResponse;
	const success =
		obj.success === true ||
		obj.Success === true ||
		(typeof obj.errCode === 'number' && obj.errCode === 0);
	const message =
		(typeof obj.message === 'string' && obj.message) ||
		(typeof obj.Message === 'string' && obj.Message) ||
		undefined;
	return {
		...obj,
		Success: success,
		...(message !== undefined ? { Message: message } : {}),
	};
}
