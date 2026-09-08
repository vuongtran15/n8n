import type { IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	connectionPassThrough,
	resolveFileSessionConnectionFields,
} from '../shared/fileSessionContext';
import { fileAutoPost } from '../shared/fileAutoRequest';
import { valueFromItemJson } from '../shared/fileItemJson';

/**
 * Một item: POST /file-auto/connect.
 * Body: sessionId + rootDirectory (+ idleTimeoutMinutes tùy chọn).
 */
export async function executeConnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveFileSessionConnectionFields(ctx, itemIndex);
	const itemJson = conn.itemJson;

	let rootDirectory = String(ctx.getNodeParameter('rootDirectory', itemIndex, '') ?? '').trim();
	const fromJson = valueFromItemJson(itemJson, 'rootDirectory');
	if (fromJson !== undefined && fromJson !== null && String(fromJson).trim() !== '') {
		rootDirectory = String(fromJson).trim();
	}
	if (!rootDirectory) {
		throw new Error('Thiếu Root Directory (rootDirectory) — thư mục sandbox trên máy worker.');
	}

	let idleTimeoutMinutes = String(
		ctx.getNodeParameter('idleTimeoutMinutes', itemIndex, '') ?? '',
	).trim();
	const idleFromJson = valueFromItemJson(itemJson, 'idleTimeoutMinutes');
	if (idleFromJson !== undefined && idleFromJson !== null && String(idleFromJson).trim() !== '') {
		idleTimeoutMinutes = String(idleFromJson).trim();
	}

	const body: Record<string, unknown> = {
		sessionId: conn.sessionId,
		rootDirectory,
		...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
	};
	if (idleTimeoutMinutes) {
		const n = Number(idleTimeoutMinutes);
		body.idleTimeoutMinutes = Number.isFinite(n) && n > 0 ? Math.floor(n) : idleTimeoutMinutes;
	}

	const url = `${conn.baseUrl}/file-auto/connect`;
	const result = await fileAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		conn.sessionId,
		'File connect',
		connectionPassThrough(conn),
	);

	result.json.rootDirectory = rootDirectory;
	return result;
}
