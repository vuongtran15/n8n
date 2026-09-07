import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	apiConnectionPassThrough,
	connectionPassThrough,
	resolveWebApiConnectionFields,
	resolveWebSessionConnectionFields,
} from '../shared/webSessionContext';
import { webAutoPost } from '../shared/webAutoRequest';
import { coalesceNumber, valueFromItemJson } from '../shared/webItemJson';
import { WEB_COMMAND_FUNCTION, WEB_COMMAND_PARAM_KIND } from './webCommandRegistry';

export { WEB_COMMAND_FUNCTION };

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

function optionalTimeoutMs(n: number): string | undefined {
	return n > 0 ? String(n) : undefined;
}

function buildParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> | undefined {
	const kind = WEB_COMMAND_PARAM_KIND[operation];
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

	const requireSelector = (): string => {
		const selector = s('selector');
		if (!selector.trim()) throw new Error('Thiếu Selector');
		return selector;
	};

	const withTimeout = (base: Record<string, string>): Record<string, string> => {
		const ts = optionalTimeoutMs(n('timeoutMs', 0));
		return ts ? { ...base, timeoutMs: ts } : base;
	};

	switch (kind) {
		case 'none':
			return undefined;
		case 'navigate': {
			const url = s('url');
			if (!url.trim()) throw new Error('Thiếu URL');
			return withTimeout({ url });
		}
		case 'timeoutOnly': {
			const ts = optionalTimeoutMs(n('timeoutMs', 0));
			return ts ? { timeoutMs: ts } : undefined;
		}
		case 'selector':
			return withTimeout({ selector: requireSelector() });
		case 'selectorForce': {
			const base: Record<string, string> = { selector: requireSelector() };
			if (b('forceClick', false)) base.force = 'true';
			return withTimeout(base);
		}
		case 'selectorValue': {
			const value = s('textValue');
			if (!value.trim()) throw new Error('Thiếu Value');
			return withTimeout({ selector: requireSelector(), value });
		}
		case 'selectorText': {
			const text = s('typeText');
			if (!text.trim()) throw new Error('Thiếu Text');
			const base: Record<string, string> = { selector: requireSelector(), text };
			const delay = n('delayMs', 0);
			if (delay > 0) base.delayMs = String(delay);
			return withTimeout(base);
		}
		case 'selectorKey': {
			const key = s('pressKey');
			if (!key.trim()) throw new Error('Thiếu Key');
			return withTimeout({ selector: requireSelector(), key });
		}
		case 'selectorSelectValue': {
			const value = s('textValue');
			if (!value.trim()) throw new Error('Thiếu Value (option)');
			return withTimeout({ selector: requireSelector(), value });
		}
		case 'selectorAttribute': {
			const attributeName = s('attributeName');
			if (!attributeName.trim()) throw new Error('Thiếu Attribute Name');
			return withTimeout({ selector: requireSelector(), attributeName });
		}
		case 'queryElements': {
			const queryType = s('queryType', 'queryType') || 'css';
			const queryValue = s('queryValue');
			if (!queryValue.trim()) throw new Error('Thiếu Query Value');
			const base: Record<string, string> = { queryType, queryValue };
			const valueKind = s('valueKind').trim();
			if (valueKind) base.valueKind = valueKind;
			return withTimeout(base);
		}
		case 'queryHtml': {
			const queryType = s('queryType', 'queryType') || 'css';
			const queryValue = s('queryValue');
			if (!queryValue.trim()) throw new Error('Thiếu Query Value');
			const base: Record<string, string> = { queryType, queryValue };
			if (b('outerHtml', false)) base.outerHtml = 'true';
			return withTimeout(base);
		}
		case 'filePathEncoding': {
			const filePath = s('filePath');
			if (!filePath.trim()) throw new Error('Thiếu File Path');
			const encodingName = s('encodingName').trim();
			return encodingName ? { filePath, encodingName } : { filePath };
		}
		case 'setInputFiles': {
			const filePath = s('filePath');
			if (!filePath.trim()) throw new Error('Thiếu File Path');
			return withTimeout({ selector: requireSelector(), filePath });
		}
		case 'waitSelector': {
			const state = s('waitState').trim() || 'visible';
			return withTimeout({ selector: requireSelector(), state });
		}
		case 'waitLoadState': {
			const state = s('loadState').trim() || 'load';
			const ts = optionalTimeoutMs(n('timeoutMs', 0));
			return ts ? { state, timeoutMs: ts } : { state };
		}
		case 'waitTimeout':
			return { milliseconds: String(n('waitMs', 1000)) };
		case 'fetchApi': {
			const url = s('url');
			if (!url.trim()) throw new Error('Thiếu URL');
			const base: Record<string, string> = { url };
			const method = preferStr(
				useInputJsonFields,
				itemJson,
				'method',
				ctx.getNodeParameter('httpMethod', itemIndex, 'GET') as string,
			).trim();
			if (method && method.toUpperCase() !== 'GET') base.method = method;
			const headersJson = preferStr(
				useInputJsonFields,
				itemJson,
				'headersJson',
				ctx.getNodeParameter('headersJson', itemIndex, '') as string,
			).trim();
			if (headersJson) base.headersJson = headersJson;
			const body = preferStr(
				useInputJsonFields,
				itemJson,
				'body',
				ctx.getNodeParameter('requestBody', itemIndex, '') as string,
			).trim();
			if (body) base.body = body;
			if (b('failOnHttpError', false)) base.failOnHttpError = 'true';
			return withTimeout(base);
		}
		case 'screenshot': {
			const base: Record<string, string> = {};
			if (b('fullPage', false)) base.fullPage = 'true';
			return Object.keys(base).length > 0 ? base : undefined;
		}
		case 'screenshotElement':
			return withTimeout({ selector: requireSelector() });
		case 'scriptEvaluate': {
			const script = s('script');
			if (!script.trim()) throw new Error('Thiếu Script');
			const argJson = s('argJson').trim();
			return argJson ? { script, argJson } : { script };
		}
		case 'scriptFile': {
			const filePath = s('filePath');
			if (!filePath.trim()) throw new Error('Thiếu File Path');
			const argJson = s('argJson').trim();
			return argJson ? { filePath, argJson } : { filePath };
		}
		case 'scriptRun': {
			const code = s('scriptCode');
			if (!code.trim()) throw new Error('Thiếu Code');
			const argJson = s('argJson').trim();
			return argJson ? { code, argJson } : { code };
		}
		case 'newPage': {
			const url = s('url').trim();
			return url ? { url } : undefined;
		}
		case 'pageIndex':
			return { pageIndex: String(n('pageIndex', 0)) };
		default:
			return undefined;
	}
}

export async function executeDisconnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveWebSessionConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/web-auto/disconnect`;
	return webAutoPost(
		ctx,
		url,
		conn.apiKey,
		{
			sessionId: conn.sessionId,
			...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		},
		conn.timeoutMs,
		conn.sessionId,
		'Web disconnect',
		connectionPassThrough(conn),
	);
}

export async function executeSessionCheckItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveWebSessionConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/web-auto/session/check`;
	return webAutoPost(
		ctx,
		url,
		conn.apiKey,
		{
			sessionId: conn.sessionId,
			...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		},
		conn.timeoutMs,
		conn.sessionId,
		'Web session check',
		connectionPassThrough(conn),
	);
}

export async function executeKillAllSessionsItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveWebApiConnectionFields(ctx, itemIndex);
	const formReason = ctx.getNodeParameter('killAllReason', itemIndex, '') as string;
	const reasonFromJson = valueFromItemJson(conn.itemJson, 'reason');
	const reason =
		reasonFromJson !== undefined && reasonFromJson !== null
			? String(reasonFromJson).trim()
			: formReason.trim();

	const body: Record<string, unknown> = {};
	if (reason) body.reason = reason;

	const url = `${conn.baseUrl}/web-auto/session/kill-all`;
	return webAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		'',
		'Web kill all sessions',
		apiConnectionPassThrough(conn),
	);
}

export async function executeCommandShortcutItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): Promise<INodeExecutionData> {
	const conn = resolveWebSessionConnectionFields(ctx, itemIndex);
	const funcName = WEB_COMMAND_FUNCTION[operation];
	if (!funcName) {
		throw new Error(`Không phải lệnh Web command: ${operation}`);
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

	const url = `${conn.baseUrl}/web-auto/command`;
	return webAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		conn.sessionId,
		`Web ${funcName}`,
		connectionPassThrough(conn),
	);
}
