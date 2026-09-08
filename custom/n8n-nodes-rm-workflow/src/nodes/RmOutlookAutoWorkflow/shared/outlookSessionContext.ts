import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { requireSessionIdOrThrow } from './sessionId';
import { coalesceNumber, valueFromItemJson, valueFromItemJsonAliases } from './outlookItemJson';
import { normalizeBaseUrl, normalizeRequestUrl } from './outlookApi';

const LOG_URL_KEYS = ['logUrl', 'logCallbackUrl', 'log_callback_url'] as const;

function logUrlCandidateScore(raw: string): number {
	const candidate = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `http://${raw}`;
	try {
		const parsed = new URL(candidate);
		let score = 0;
		if (parsed.protocol === 'https:') score += 4;
		const host = parsed.hostname.toLowerCase();
		if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') score += 2;
		return score;
	} catch {
		return 0;
	}
}

function resolveOptionalLogUrl(itemJson: IDataObject): string | undefined {
	const candidates: { key: (typeof LOG_URL_KEYS)[number]; raw: string }[] = [];
	for (const key of LOG_URL_KEYS) {
		const v = valueFromItemJson(itemJson, key);
		if (v === undefined || v === null) continue;
		const raw = String(v).trim();
		if (raw !== '') candidates.push({ key, raw });
	}
	if (candidates.length === 0) return undefined;
	if (candidates.length === 1) return normalizeRequestUrl(candidates[0].raw);

	candidates.sort((a, b) => {
		const scoreDiff = logUrlCandidateScore(b.raw) - logUrlCandidateScore(a.raw);
		if (scoreDiff !== 0) return scoreDiff;
		return LOG_URL_KEYS.indexOf(a.key) - LOG_URL_KEYS.indexOf(b.key);
	});
	return normalizeRequestUrl(candidates[0].raw);
}

/** Axios timeout khi gọi Outlook API — dùng nếu JSON input không có requestTimeoutSeconds. */
export const DEFAULT_OUTLOOK_REQUEST_TIMEOUT_SECONDS = 10 * 60;

export interface OutlookApiConnectionContext {
	itemJson: IDataObject;
	useInputJsonFields: boolean;
	baseUrl: string;
	apiKey: string;
	logUrl?: string;
	timeoutSeconds: number;
	timeoutMs: number;
}

export interface OutlookSessionConnectionContext extends OutlookApiConnectionContext {
	sessionId: string;
}

function resolveOutlookBaseConnectionFields(
	ctx: IExecuteFunctions,
	itemIndex: number,
): OutlookApiConnectionContext {
	const items = ctx.getInputData();
	const itemJson = items[itemIndex]?.json ?? {};
	const useInputJsonFields = true;
	const requiredInputStringAlias = (label: string, keys: string[]): string => {
		const v = valueFromItemJsonAliases(itemJson, keys);
		if (v === undefined || v === null) {
			throw new Error(`Thiếu "${label}" trong JSON input item (nhận: ${keys.join(', ')}).`);
		}
		const s = String(v).trim();
		if (!s) {
			throw new Error(`"${label}" trong JSON input item không được rỗng.`);
		}
		return s;
	};
	const optionalInputNumber = (key: string, defaultValue: number): number => {
		const v = valueFromItemJson(itemJson, key);
		if (v === undefined || v === null || String(v).trim() === '') {
			return defaultValue;
		}
		const n = coalesceNumber(v, Number.NaN);
		if (!Number.isFinite(n) || n <= 0) {
			throw new Error(`"${key}" trong JSON input item phải là số > 0.`);
		}
		return n;
	};

	const baseUrlRaw = requiredInputStringAlias('baseUrl', ['baseUrl', 'host', 'baseURL']);
	const apiKey = requiredInputStringAlias('apiKey', ['apiKey', 'api-key', 'api_key', 'ApiKey']);
	const logUrl = resolveOptionalLogUrl(itemJson);
	const timeoutSeconds = optionalInputNumber(
		'requestTimeoutSeconds',
		DEFAULT_OUTLOOK_REQUEST_TIMEOUT_SECONDS,
	);
	const timeoutMs = timeoutSeconds * 1000;
	const baseUrl = normalizeBaseUrl(baseUrlRaw);

	return {
		itemJson,
		useInputJsonFields,
		baseUrl,
		apiKey,
		logUrl,
		timeoutSeconds,
		timeoutMs,
	};
}

/**
 * Base URL, API key — bắt buộc từ input JSON. Không cần sessionId (admin routes).
 */
export function resolveOutlookApiConnectionFields(
	ctx: IExecuteFunctions,
	itemIndex: number,
): OutlookApiConnectionContext {
	return resolveOutlookBaseConnectionFields(ctx, itemIndex);
}

/**
 * Base URL, API key, sessionId — bắt buộc từ input JSON (output node trước).
 * requestTimeoutSeconds tùy chọn (mặc định 10 phút).
 */
export function resolveOutlookSessionConnectionFields(
	ctx: IExecuteFunctions,
	itemIndex: number,
): OutlookSessionConnectionContext {
	const base = resolveOutlookBaseConnectionFields(ctx, itemIndex);
	const requiredInputString = (key: string): string => {
		const v = valueFromItemJson(base.itemJson, key);
		if (v === undefined || v === null) {
			throw new Error(`Thiếu "${key}" trong JSON input item.`);
		}
		const s = String(v).trim();
		if (!s) {
			throw new Error(`"${key}" trong JSON input item không được rỗng.`);
		}
		return s;
	};
	const sessionId = requireSessionIdOrThrow(requiredInputString('sessionId'));

	return {
		...base,
		sessionId,
	};
}

/** Pass-through cho admin route (không có sessionId). */
export function apiConnectionPassThrough(conn: OutlookApiConnectionContext): IDataObject {
	const out: IDataObject = {
		baseUrl: conn.baseUrl,
		apiKey: conn.apiKey,
		requestTimeoutSeconds: conn.timeoutSeconds,
	};
	if (conn.logUrl !== undefined && conn.logUrl !== '') {
		out.logUrl = conn.logUrl;
	}
	return out;
}

/** Chỉ các field kết nối được đưa sang node tiếp theo (không pass toàn bộ input JSON). */
export function connectionPassThrough(conn: OutlookSessionConnectionContext): IDataObject {
	const out: IDataObject = {
		baseUrl: conn.baseUrl,
		apiKey: conn.apiKey,
		sessionId: conn.sessionId,
		requestTimeoutSeconds: conn.timeoutSeconds,
	};
	if (conn.logUrl !== undefined && conn.logUrl !== '') {
		out.logUrl = conn.logUrl;
	}
	return out;
}
