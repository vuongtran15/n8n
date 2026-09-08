import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	apiConnectionPassThrough,
	connectionPassThrough,
	resolveFileApiConnectionFields,
	resolveFileSessionConnectionFields,
} from '../shared/fileSessionContext';
import { fileAutoGet, fileAutoPost } from '../shared/fileAutoRequest';
import { coalesceNumber, valueFromItemJson } from '../shared/fileItemJson';
import { FILE_COMMAND_FUNCTION, FILE_COMMAND_PARAM_KIND } from './fileCommandRegistry';
import { buildReadExcelParamObject, buildWriteExcelParamObject } from './fileExcelLogic';

export { FILE_COMMAND_FUNCTION };

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

function preferNum(
	useInputJsonFields: boolean,
	itemJson: IDataObject,
	key: string,
	formVal: number,
): number {
	if (!useInputJsonFields) return formVal;
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	return coalesceNumber(v, formVal);
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

function buildParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> | undefined {
	const kind = FILE_COMMAND_PARAM_KIND[operation];
	if (!kind) return undefined;

	const s = (key: string, formKey?: string) =>
		preferStr(
			useInputJsonFields,
			itemJson,
			formKey ?? key,
			ctx.getNodeParameter(key, itemIndex, '') as string,
		);
	const n = (key: string, fallback = 0) =>
		preferNum(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, fallback) as number,
		);
	const b = (key: string, fallback: boolean) =>
		preferBool(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, fallback) as boolean,
		);

	const requirePath = (): string => {
		const path = s('relativeOrAbsolutePath');
		if (!path.trim()) throw new Error('Thiếu Path (relativeOrAbsolutePath)');
		return path;
	};

	switch (kind) {
		case 'pathOnly':
			return { relativeOrAbsolutePath: requirePath() };
		case 'pathEncoding': {
			const encoding = s('encoding').trim() || 'utf-8';
			return { relativeOrAbsolutePath: requirePath(), encoding };
		}
		case 'writeText':
		case 'appendText': {
			const content = preferStr(
				useInputJsonFields,
				itemJson,
				'content',
				ctx.getNodeParameter('fileContent', itemIndex, '') as string,
			);
			const base: Record<string, string> = {
				relativeOrAbsolutePath: requirePath(),
				content,
			};
			const encoding = s('encoding').trim();
			if (encoding) base.encoding = encoding;
			if (kind === 'writeText') {
				base.createParentDirectories = b('createParentDirectories', true) ? 'true' : 'false';
			}
			return base;
		}
		case 'writeBytes': {
			const bytes = preferStr(
				useInputJsonFields,
				itemJson,
				'bytes',
				ctx.getNodeParameter('bytesBase64', itemIndex, '') as string,
			).trim();
			if (!bytes) throw new Error('Thiếu Bytes (Base64)');
			return {
				relativeOrAbsolutePath: requirePath(),
				bytes,
				createParentDirectories: b('createParentDirectories', true) ? 'true' : 'false',
			};
		}
		case 'deleteDirectory':
			return {
				relativeOrAbsolutePath: requirePath(),
				recursive: b('recursiveDelete', true) ? 'true' : 'false',
			};
		case 'copyMove': {
			const source = s('sourceRelativeOrAbsolute').trim();
			const dest = s('destinationRelativeOrAbsolute').trim();
			if (!source) throw new Error('Thiếu Source Path');
			if (!dest) throw new Error('Thiếu Destination Path');
			return {
				sourceRelativeOrAbsolute: source,
				destinationRelativeOrAbsolute: dest,
				overwrite: b('overwrite', false) ? 'true' : 'false',
			};
		}
		case 'listDirectory': {
			const base: Record<string, string> = { relativeOrAbsolutePath: requirePath() };
			const pattern = s('searchPattern').trim();
			if (pattern) base.searchPattern = pattern;
			return base;
		}
		case 'downloadFromUrl': {
			const url = preferStr(
				useInputJsonFields,
				itemJson,
				'url',
				ctx.getNodeParameter('downloadUrl', itemIndex, '') as string,
			).trim();
			if (!url) throw new Error('Thiếu URL');
			const destFolder = s('destinationFolderRelativeOrAbsolute').trim();
			if (!destFolder) throw new Error('Thiếu Destination Folder');
			const out: Record<string, string> = {
				url,
				destinationFolderRelativeOrAbsolute: destFolder,
				overwrite: b('overwrite', false) ? 'true' : 'false',
			};
			const fileName = preferStr(
				useInputJsonFields,
				itemJson,
				'fileName',
				ctx.getNodeParameter('downloadFileName', itemIndex, '') as string,
			).trim();
			if (fileName) out.fileName = fileName;
			const timeoutSec = n('downloadTimeoutSeconds', 300);
			if (timeoutSec > 0) out.timeout = String(timeoutSec);
			return out;
		}
		case 'writeExcel':
			return buildWriteExcelParamObject(ctx, itemIndex, itemJson, useInputJsonFields);
		case 'readExcel':
			return buildReadExcelParamObject(ctx, itemIndex, itemJson, useInputJsonFields);
		default:
			return undefined;
	}
}

export async function executeDisconnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveFileSessionConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/file-auto/disconnect`;
	return fileAutoPost(
		ctx,
		url,
		conn.apiKey,
		{
			sessionId: conn.sessionId,
			...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		},
		conn.timeoutMs,
		conn.sessionId,
		'File disconnect',
		connectionPassThrough(conn),
	);
}

export async function executeSessionCheckItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveFileSessionConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/file-auto/session/check`;
	return fileAutoPost(
		ctx,
		url,
		conn.apiKey,
		{
			sessionId: conn.sessionId,
			...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		},
		conn.timeoutMs,
		conn.sessionId,
		'File session check',
		connectionPassThrough(conn),
	);
}

export async function executeFunctionListItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveFileApiConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/file-auto/function/list`;
	return fileAutoGet(
		ctx,
		url,
		conn.apiKey,
		conn.timeoutMs,
		'',
		'File function list',
		apiConnectionPassThrough(conn),
	);
}

export async function executeCommandShortcutItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): Promise<INodeExecutionData> {
	const conn = resolveFileSessionConnectionFields(ctx, itemIndex);
	const fn = FILE_COMMAND_FUNCTION[operation];
	if (!fn) throw new Error(`Unknown file operation: ${operation}`);

	const paramObject = buildParamObject(
		ctx,
		itemIndex,
		operation,
		conn.itemJson,
		conn.useInputJsonFields,
	);

	const body: Record<string, unknown> = {
		sessionId: conn.sessionId,
		function: fn,
		...(paramObject ? { paramObject } : {}),
		...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
	};

	const url = `${conn.baseUrl}/file-auto/command`;
	return fileAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		conn.sessionId,
		`File ${fn}`,
		connectionPassThrough(conn),
	);
}
