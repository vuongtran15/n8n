import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	DEFAULT_WECOM_BASE_URL,
	DEFAULT_WECOM_TIMEOUT_SECONDS,
	normalizeWecomBaseUrl,
} from './wecomApi';
import { coalesceNumber, preferStr, valueFromItemJson } from './wecomItemJson';

export interface WecomExecutionContext {
	itemJson: IDataObject;
	baseUrl: string;
	timeoutMs: number;
}

export function resolveWecomExecutionContext(
	ctx: IExecuteFunctions,
	itemIndex: number,
): WecomExecutionContext {
	const items = ctx.getInputData();
	const itemJson = items[itemIndex]?.json ?? {};

	// Base URL ẩn trên UI — mặc định portal cố định; chỉ override qua JSON input nếu cần.
	const baseUrl = normalizeWecomBaseUrl(
		preferStr(itemJson, 'baseUrl', DEFAULT_WECOM_BASE_URL, ['wecomBaseUrl', 'wecomUrl']),
	);

	const formTimeout = ctx.getNodeParameter(
		'requestTimeoutSeconds',
		itemIndex,
		DEFAULT_WECOM_TIMEOUT_SECONDS,
	) as number;
	const timeoutRaw = valueFromItemJson(itemJson, 'requestTimeoutSeconds');
	let timeoutSeconds = DEFAULT_WECOM_TIMEOUT_SECONDS;
	if (timeoutRaw !== undefined && timeoutRaw !== null && String(timeoutRaw).trim() !== '') {
		const n = coalesceNumber(timeoutRaw, Number.NaN);
		if (!Number.isFinite(n) || n <= 0) {
			throw new Error('"requestTimeoutSeconds" trong JSON input item phải là số > 0.');
		}
		timeoutSeconds = n;
	} else if (typeof formTimeout === 'number' && formTimeout > 0) {
		timeoutSeconds = formTimeout;
	}

	return {
		itemJson,
		baseUrl,
		timeoutMs: timeoutSeconds * 1000,
	};
}

/** webhook / key / id — 1 trong 3 theo API. */
export function resolveWecomWebhook(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
): string {
	const formVal = (ctx.getNodeParameter('webhook', itemIndex, '') as string).trim();
	const webhook = preferStr(itemJson, 'webhook', formVal, ['key', 'id', 'botid', 'botId']);
	if (!webhook) {
		throw new Error('Thiếu webhook (hoặc key / id) — bot key UUID hoặc full URL webhook WeCom.');
	}
	return webhook;
}
