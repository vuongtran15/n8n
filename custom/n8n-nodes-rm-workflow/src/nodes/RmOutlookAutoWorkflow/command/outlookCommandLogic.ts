import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	apiConnectionPassThrough,
	connectionPassThrough,
	resolveOutlookApiConnectionFields,
	resolveOutlookSessionConnectionFields,
} from '../shared/outlookSessionContext';
import { outlookAutoGet, outlookAutoPost } from '../shared/outlookAutoRequest';
import { valueFromItemJson } from '../shared/outlookItemJson';
import { OUTLOOK_COMMAND_FUNCTION, OUTLOOK_COMMAND_PARAM_KIND } from './outlookCommandRegistry';

export { OUTLOOK_COMMAND_FUNCTION };

function preferStr(
	useInputJsonFields: boolean,
	itemJson: IDataObject,
	key: string,
	formVal: string,
): string {
	if (!useInputJsonFields) return formVal;
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	const s = String(v).trim();
	return s !== '' ? s : formVal;
}

function preferBool(
	useInputJsonFields: boolean,
	itemJson: IDataObject,
	key: string,
	formVal: boolean,
): boolean {
	if (!useInputJsonFields) return formVal;
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	if (typeof v === 'boolean') return v;
	const s = String(v).trim().toLowerCase();
	if (s === 'true' || s === '1' || s === 'yes') return true;
	if (s === 'false' || s === '0' || s === 'no') return false;
	return formVal;
}

function boolStr(value: boolean): string {
	return value ? 'true' : 'false';
}

function buildParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> | undefined {
	const kind = OUTLOOK_COMMAND_PARAM_KIND[operation];
	if (!kind) return undefined;

	const s = (key: string) =>
		preferStr(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, '') as string,
		);
	const b = (key: string, fallback: boolean) =>
		preferBool(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, fallback) as boolean,
		);

	switch (kind) {
		case 'none':
			return undefined;
		case 'folderPathOptional': {
			const folderPath = s('folderPath').trim();
			return folderPath ? { folderPath } : undefined;
		}
		case 'folderPathRequired': {
			const folderPath = s('folderPath').trim();
			if (!folderPath) throw new Error('Thiếu folderPath');
			return { folderPath };
		}
		case 'listMails': {
			const out: Record<string, string> = {
				unreadOnly: boolStr(b('unreadOnly', false)),
			};
			const folderPath = s('folderPath').trim();
			if (folderPath) out.folderPath = folderPath;
			const maxCount = s('maxCount').trim();
			if (maxCount) out.maxCount = maxCount;
			const subjectContains = s('subjectContains').trim();
			if (subjectContains) out.subjectContains = subjectContains;
			return out;
		}
		case 'searchMails': {
			const filterOrSubject = s('filterOrSubject').trim();
			if (!filterOrSubject) throw new Error('Thiếu filterOrSubject');
			const out: Record<string, string> = { filterOrSubject };
			const folderPath = s('folderPath').trim();
			if (folderPath) out.folderPath = folderPath;
			const maxCount = s('maxCount').trim();
			if (maxCount) out.maxCount = maxCount;
			return out;
		}
		case 'entryId': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			return { entryId };
		}
		case 'sendMail': {
			const to = s('to').trim();
			if (!to) throw new Error('Thiếu to');
			const out: Record<string, string> = { to };
			const subject = s('subject').trim();
			if (subject) out.subject = subject;
			const body = s('body').trim();
			if (body) out.body = body;
			const htmlBody = s('htmlBody').trim();
			if (htmlBody) out.htmlBody = htmlBody;
			const cc = s('cc').trim();
			if (cc) out.cc = cc;
			const bcc = s('bcc').trim();
			if (bcc) out.bcc = bcc;
			const attachmentPaths = s('attachmentPaths')
				.trim()
				// API nhận ; hoặc | — chấp nhận cả dấu phẩy từ UI
				.replace(/,/g, ';');
			if (attachmentPaths) out.attachmentPaths = attachmentPaths;
			// UI: Send Immediately (mặc định true). API Outlook dùng displayBeforeSend (đảo).
			// JSON có thể gửi displayBeforeSend trực tiếp — ưu tiên nếu có.
			const displayFromJson = valueFromItemJson(itemJson, 'displayBeforeSend');
			let displayBeforeSend = !b('sendImmediately', true);
			if (displayFromJson !== undefined && displayFromJson !== null && String(displayFromJson).trim() !== '') {
				displayBeforeSend = preferBool(true, itemJson, 'displayBeforeSend', displayBeforeSend);
			}
			out.displayBeforeSend = boolStr(displayBeforeSend);
			return out;
		}
		case 'replyMail': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			const out: Record<string, string> = {
				entryId,
				replyAll: boolStr(b('replyAll', false)),
				sendImmediately: boolStr(b('sendImmediately', true)),
			};
			const body = s('body').trim();
			if (body) out.body = body;
			return out;
		}
		case 'forwardMail': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			const to = s('to').trim();
			if (!to) throw new Error('Thiếu to');
			const out: Record<string, string> = {
				entryId,
				to,
				sendImmediately: boolStr(b('sendImmediately', true)),
			};
			const body = s('body').trim();
			if (body) out.body = body;
			return out;
		}
		case 'markAsRead': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			return {
				entryId,
				isRead: boolStr(b('isRead', true)),
			};
		}
		case 'moveMail': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			const destinationFolderPath = s('destinationFolderPath').trim();
			if (!destinationFolderPath) throw new Error('Thiếu destinationFolderPath');
			return { entryId, destinationFolderPath };
		}
		case 'deleteMail': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			return {
				entryId,
				permanent: boolStr(b('permanent', false)),
			};
		}
		case 'saveAttachment': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			const attachmentKey = s('attachmentKey').trim();
			if (!attachmentKey) throw new Error('Thiếu attachmentKey');
			const saveDirectory = s('saveDirectory').trim();
			if (!saveDirectory) throw new Error('Thiếu saveDirectory');
			return {
				entryId,
				attachmentKey,
				saveDirectory,
				overwrite: boolStr(b('overwrite', true)),
			};
		}
		case 'saveAllAttachments': {
			const entryId = s('entryId').trim();
			if (!entryId) throw new Error('Thiếu entryId');
			const saveDirectory = s('saveDirectory').trim();
			if (!saveDirectory) throw new Error('Thiếu saveDirectory');
			return {
				entryId,
				saveDirectory,
				skipEmbedded: boolStr(b('skipEmbedded', true)),
				overwrite: boolStr(b('overwrite', true)),
			};
		}
		case 'closeInspector': {
			const out: Record<string, string> = {
				saveOption: s('saveOption').trim() || 'discard',
			};
			const entryId = s('entryId').trim();
			if (entryId) out.entryId = entryId;
			return out;
		}
		case 'closeAllInspectors':
			return {
				saveOption: s('saveOption').trim() || 'discard',
			};
		case 'sendKeys': {
			const keys = s('keys').trim();
			if (!keys) throw new Error('Thiếu keys');
			return {
				keys,
				activateFirst: boolStr(b('activateFirst', true)),
			};
		}
		case 'sendKeySequence': {
			const sequence = s('sequence').trim();
			if (!sequence) throw new Error('Thiếu sequence');
			return {
				sequence,
				activateFirst: boolStr(b('activateFirst', true)),
			};
		}
		default:
			return undefined;
	}
}

export async function executeDisconnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveOutlookSessionConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/outlook-auto/disconnect`;
	return outlookAutoPost(
		ctx,
		url,
		conn.apiKey,
		{
			sessionId: conn.sessionId,
			...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		},
		conn.timeoutMs,
		conn.sessionId,
		'Outlook disconnect',
		connectionPassThrough(conn),
	);
}

export async function executeSessionCheckItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveOutlookSessionConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/outlook-auto/session/check`;
	return outlookAutoPost(
		ctx,
		url,
		conn.apiKey,
		{
			sessionId: conn.sessionId,
			...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		},
		conn.timeoutMs,
		conn.sessionId,
		'Outlook session check',
		connectionPassThrough(conn),
	);
}

export async function executeKillAllSessionsItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveOutlookApiConnectionFields(ctx, itemIndex);
	const formReason = ctx.getNodeParameter('killAllReason', itemIndex, '') as string;
	const reasonFromJson = valueFromItemJson(conn.itemJson, 'reason');
	const reason =
		reasonFromJson !== undefined && reasonFromJson !== null
			? String(reasonFromJson).trim()
			: formReason.trim();

	const body: Record<string, unknown> = {};
	if (reason) body.reason = reason;

	const url = `${conn.baseUrl}/outlook-auto/session/kill-all`;
	return outlookAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		'',
		'Outlook kill all sessions',
		apiConnectionPassThrough(conn),
	);
}

export async function executeFunctionListItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveOutlookApiConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/outlook-auto/function/list`;
	return outlookAutoGet(
		ctx,
		url,
		conn.apiKey,
		conn.timeoutMs,
		'',
		'Outlook function list',
		apiConnectionPassThrough(conn),
	);
}

export async function executeCommandShortcutItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): Promise<INodeExecutionData> {
	const conn = resolveOutlookSessionConnectionFields(ctx, itemIndex);
	const funcName = OUTLOOK_COMMAND_FUNCTION[operation];
	if (!funcName) {
		throw new Error(`Không phải lệnh Outlook command: ${operation}`);
	}

	const paramObject = buildParamObject(
		ctx,
		itemIndex,
		operation,
		conn.itemJson,
		conn.useInputJsonFields,
	);

	const body: Record<string, unknown> = {
		sessionId: conn.sessionId,
		...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		function: funcName,
	};
	if (paramObject && Object.keys(paramObject).length > 0) {
		body.paramObject = paramObject;
	}

	const url = `${conn.baseUrl}/outlook-auto/command`;
	return outlookAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		conn.sessionId,
		`Outlook ${funcName}`,
		connectionPassThrough(conn),
	);
}
