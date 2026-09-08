import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	connectionPassThrough,
	resolveOutlookSessionConnectionFields,
} from '../shared/outlookSessionContext';
import { outlookAutoPost } from '../shared/outlookAutoRequest';
import { coalesceNumber, valueFromItemJson } from '../shared/outlookItemJson';

function preferStr(itemJson: IDataObject, key: string, formVal: string): string {
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	const s = String(v).trim();
	return s !== '' ? s : formVal;
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
 * Một item: POST /outlook-auto/connect.
 */
export async function executeConnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveOutlookSessionConnectionFields(ctx, itemIndex);
	const { itemJson } = conn;

	let attachExisting = ctx.getNodeParameter('attachExisting', itemIndex, true) as boolean;
	let visible = ctx.getNodeParameter('visible', itemIndex, true) as boolean;
	let profileName = ctx.getNodeParameter('profileName', itemIndex, '') as string;
	const idleParamRaw = ctx.getNodeParameter('idleTimeoutMinutes', itemIndex, '') as string | number;
	const idleParam = String(idleParamRaw ?? '').trim();

	attachExisting = preferBool(itemJson, 'attachExisting', attachExisting);
	visible = preferBool(itemJson, 'visible', visible);
	profileName = preferStr(itemJson, 'profileName', profileName);

	let idleMinutes = resolveIdleMinutes(idleParam);
	const idleFromInput = valueFromItemJson(itemJson, 'idleTimeoutMinutes');
	if (idleFromInput !== undefined && idleFromInput !== null && String(idleFromInput).trim() !== '') {
		const n = coalesceNumber(idleFromInput, 0);
		idleMinutes = n > 0 ? n : undefined;
	}

	const sessionId = conn.sessionId;

	const body: Record<string, unknown> = {
		sessionId,
		attachExisting,
		visible,
		...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
	};
	if (profileName.trim()) body.profileName = profileName.trim();
	if (idleMinutes !== undefined) body.idleTimeoutMinutes = idleMinutes;

	const url = `${conn.baseUrl}/outlook-auto/connect`;

	return outlookAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		sessionId,
		'Outlook connect',
		connectionPassThrough(conn),
	);
}
