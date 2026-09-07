import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	connectionPassThrough,
	resolveWebSessionConnectionFields,
} from '../shared/webSessionContext';
import { webAutoPost } from '../shared/webAutoRequest';
import { coalesceNumber, valueFromItemJson } from '../shared/webItemJson';

function preferStr(itemJson: IDataObject, key: string, formVal: string): string {
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	const s = String(v).trim();
	return s !== '' ? s : formVal;
}

function preferNum(itemJson: IDataObject, key: string, formVal: number): number {
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	return coalesceNumber(v, formVal);
}

function preferBool(itemJson: IDataObject, key: string, formVal: boolean): boolean {
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	if (typeof v === 'boolean') return v;
	const s = String(v).trim().toLowerCase();
	if (s === 'true' || s === '1' || s === 'yes') return true;
	if (s === 'false' || s === '0' || s === 'no') return false;
	return formVal;
}

function resolveIdleMinutes(raw: string): number | undefined {
	if (raw === '') return undefined;
	const n = coalesceNumber(raw, 0);
	return n > 0 && Number.isFinite(n) ? Math.floor(n) : undefined;
}

/**
 * Một item: POST /web-auto/connect.
 */
export async function executeConnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveWebSessionConnectionFields(ctx, itemIndex);
	const { itemJson } = conn;

	let browserType = (ctx.getNodeParameter('browserType', itemIndex, 'chromium') as string) || 'chromium';
	let headless = ctx.getNodeParameter('headless', itemIndex, false) as boolean;
	let startUrl = ctx.getNodeParameter('startUrl', itemIndex, '') as string;
	let viewportWidth = ctx.getNodeParameter('viewportWidth', itemIndex, 0) as number;
	let viewportHeight = ctx.getNodeParameter('viewportHeight', itemIndex, 0) as number;
	let slowMo = ctx.getNodeParameter('slowMo', itemIndex, 0) as number;
	let userAgent = ctx.getNodeParameter('userAgent', itemIndex, '') as string;
	let defaultTimeoutMs = ctx.getNodeParameter('defaultTimeoutMs', itemIndex, 0) as number;
	const idleParamRaw = ctx.getNodeParameter('idleTimeoutMinutes', itemIndex, '') as string | number;
	const idleParam = String(idleParamRaw ?? '').trim();

	browserType = preferStr(itemJson, 'browserType', browserType);
	headless = preferBool(itemJson, 'headless', headless);
	startUrl = preferStr(itemJson, 'startUrl', startUrl);
	viewportWidth = preferNum(itemJson, 'viewportWidth', viewportWidth);
	viewportHeight = preferNum(itemJson, 'viewportHeight', viewportHeight);
	slowMo = preferNum(itemJson, 'slowMo', slowMo);
	userAgent = preferStr(itemJson, 'userAgent', userAgent);
	defaultTimeoutMs = preferNum(itemJson, 'defaultTimeoutMs', defaultTimeoutMs);

	let idleMinutes = resolveIdleMinutes(idleParam);
	const idleFromInput = valueFromItemJson(itemJson, 'idleTimeoutMinutes');
	if (idleFromInput !== undefined && idleFromInput !== null && String(idleFromInput).trim() !== '') {
		const n = coalesceNumber(idleFromInput, 0);
		idleMinutes = n > 0 ? n : undefined;
	}

	const sessionId = conn.sessionId;

	const body: Record<string, unknown> = {
		sessionId,
		...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		browserType,
		headless,
	};
	if (startUrl.trim()) body.startUrl = startUrl.trim();
	if (viewportWidth > 0 && viewportHeight > 0) {
		body.viewportWidth = viewportWidth;
		body.viewportHeight = viewportHeight;
	}
	if (slowMo > 0) body.slowMo = slowMo;
	if (userAgent.trim()) body.userAgent = userAgent.trim();
	if (defaultTimeoutMs > 0) body.defaultTimeoutMs = defaultTimeoutMs;
	if (idleMinutes !== undefined) body.idleTimeoutMinutes = idleMinutes;

	const url = `${conn.baseUrl}/web-auto/connect`;

	return webAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		sessionId,
		'Web connect',
		connectionPassThrough(conn),
	);
}
