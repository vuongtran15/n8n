import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import {
	DEFAULT_WECOM_BASE_URL,
	DEFAULT_WECOM_TIMEOUT_SECONDS,
	normalizeWecomBaseUrl,
} from './wecomApi';
import { coalesceNumber, preferFormThenJson, preferStr, valueFromItemJson } from './wecomItemJson';

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

	// Portal WeCom cố định — KHÔNG lấy `baseUrl` từ RM Init/SAP/Web (đó là tool API
	// bắt buộc api-key). Chỉ override bằng wecomBaseUrl / wecomUrl nếu cần.
	const baseUrl = normalizeWecomBaseUrl(
		preferStr(itemJson, 'wecomBaseUrl', DEFAULT_WECOM_BASE_URL, ['wecomUrl']),
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

/** Bot key: ô Webhook trên form thắng. JSON chỉ dùng field WeCom, không lấy `key`/`id`/`sessionId` của node trước. */
export function resolveWecomWebhook(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
): string {
	const formVal = (ctx.getNodeParameter('webhook', itemIndex, '') as string).trim();
	const webhook = preferFormThenJson(itemJson, formVal, [
		'webhook',
		'wecomWebhook',
		'wecomKey',
		'botid',
		'botId',
	]);
	if (!webhook) {
		throw new Error(
			'Thiếu webhook — dán bot key UUID trên form, hoặc JSON wecomWebhook / webhook / botid.',
		);
	}
	return webhook;
}
