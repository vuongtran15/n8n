import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { connectionPassThrough, resolveSapSessionConnectionFields } from '../shared/sapSessionContext';
import { sapAutoPost } from '../shared/sapAutoRequest';
import { coalesceNumber, valueFromItemJson, valueFromItemJsonAliases } from '../shared/sapItemJson';

function resolveIdleMinutes(raw: string): number {
	if (raw === '') return 0;
	const n = coalesceNumber(raw, 0);
	return n > 0 && Number.isFinite(n) ? Math.floor(n) : 0;
}

/**
 * Một item: POST /sap-auto/open-and-connect.
 */
export async function executeOpenAndConnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveSapSessionConnectionFields(ctx, itemIndex);
	const { itemJson, useInputJsonFields } = conn;

	let server = ctx.getNodeParameter('server', itemIndex, '') as string;
	let client = ctx.getNodeParameter('client', itemIndex, '') as string;
	let username = ctx.getNodeParameter('username', itemIndex, '') as string;
	let password = ctx.getNodeParameter('password', itemIndex, '') as string;
	let multiLogonAction =
		(ctx.getNodeParameter('multiLogonAction', itemIndex, 'opt2') as string) || 'opt2';
	let language = (ctx.getNodeParameter('language', itemIndex, 'EN') as string) || 'EN';
	const idleParamRaw = ctx.getNodeParameter('idleTimeoutMinutes', itemIndex, '') as string | number;
	const idleParam = String(idleParamRaw ?? '').trim();
	let idleRaw = resolveIdleMinutes(idleParam);

	if (useInputJsonFields) {
		const preferInput = (key: string, formVal: string): string => {
			const v = valueFromItemJson(itemJson, key);
			if (v === undefined || v === null) return formVal;
			const s = String(v).trim();
			return s !== '' ? s : formVal;
		};
		server = preferInput('server', server);
		client = preferInput('client', client);
		username = preferInput('username', username);
		password = preferInput('password', password);
		multiLogonAction = preferInput('multiLogonAction', multiLogonAction);
		const logonAlias = valueFromItemJsonAliases(itemJson, [
			'multiLogonAction',
			'logonAction',
			'logon_action',
		]);
		if (logonAlias !== undefined && logonAlias !== null) {
			const s = String(logonAlias).trim();
			if (s !== '') multiLogonAction = s;
		}
		language = preferInput('language', language);
		const idleFromInput = valueFromItemJson(itemJson, 'idleTimeoutMinutes');
		if (idleFromInput !== undefined && idleFromInput !== null && String(idleFromInput).trim() !== '') {
			const n = coalesceNumber(idleFromInput, 0);
			idleRaw = n > 0 ? n : 0;
		}
	}

	const sessionId = conn.sessionId;

	if (!server.trim() || !client.trim() || !username.trim() || !password.trim()) {
		throw new Error(
			'Open and Connect thiếu server, client, username hoặc password. Điền trên node hoặc truyền trong JSON đầu vào.',
		);
	}

	const multiLogon = multiLogonAction.trim() || 'opt2';
	const body: Record<string, unknown> = {
		sessionId,
		...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		server,
		client,
		username,
		password,
		multiLogonAction: multiLogon,
		language,
	};
	if (idleRaw > 0) {
		body.idleTimeoutMinutes = idleRaw;
	}

	const url = `${conn.baseUrl}/sap-auto/open-and-connect`;

	return sapAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		sessionId,
		'SAP open-and-connect',
		connectionPassThrough(conn),
	);
}
