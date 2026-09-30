import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	apiConnectionPassThrough,
	connectionPassThrough,
	resolveSapApiConnectionFields,
	resolveSapSessionConnectionFields,
	resolveWecomExecutionContext,
} from '../shared/sapSessionContext';
import {
	rosWecomMessagePost,
	sapAutoPost,
	sapLogPost,
	wecomGroupMessagePost,
} from '../shared/sapAutoRequest';
import { coalesceNumber, valueFromItemJson } from '../shared/sapItemJson';
import { SAP_COMMAND_FUNCTION, SAP_COMMAND_PARAM_KIND } from './sapCommandRegistry';

export { SAP_COMMAND_FUNCTION };

/** Khi SAP API chưa deploy tên hàm mới — gửi lại với hàm cũ và cùng paramObject (vd. openButtonId). */
const SAP_COMMAND_FUNCTION_FALLBACK: Partial<Record<string, string>> = {
	OpenAndFillMultipleSelectionValues: 'FillMultipleSelectionValues',
};

function isSapFunctionNotFound(result: INodeExecutionData): boolean {
	const message = result.json?.Message;
	return typeof message === 'string' && /function not found/i.test(message);
}

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

function preferJsonObject(
	useInputJsonFields: boolean,
	itemJson: IDataObject,
	key: string,
	formVal: IDataObject,
): IDataObject {
	if (!useInputJsonFields) return formVal;
	const parsed = jsonObjectFromUnknown(valueFromItemJson(itemJson, key));
	if (parsed && Object.keys(parsed).length > 0) return parsed;
	return formVal;
}

/** Parse object hoặc chuỗi JSON thành IDataObject. */
function jsonObjectFromUnknown(v: unknown): IDataObject | undefined {
	if (v === undefined || v === null) return undefined;
	if (typeof v === 'string') {
		const trimmed = v.trim();
		if (!trimmed) return undefined;
		try {
			const parsed: unknown = JSON.parse(trimmed);
			if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
				return parsed as IDataObject;
			}
		} catch {
			return undefined;
		}
		return undefined;
	}
	if (typeof v === 'object' && !Array.isArray(v)) return v as IDataObject;
	return undefined;
}

/** Bỏ bọc `{ "items": { ... } }` nếu không có key SAP ở top-level. */
function unwrapSetTextsWrapper(obj: IDataObject): IDataObject {
	const nested = jsonObjectFromUnknown(obj.items);
	if (!nested || Object.keys(nested).length === 0) return obj;
	const hasSapKeysAtTop = Object.keys(obj).some(
		(k) => k.toLowerCase() !== 'items' && (k.includes('wnd[') || k.includes('/usr/')),
	);
	return hasSapKeysAtTop ? obj : nested;
}

/** Map id control → text (mọi value thành string) cho SetTexts / paramObject. */
function toSetTextsParamObject(obj: IDataObject): Record<string, string> {
	const flat = unwrapSetTextsWrapper(obj);
	const out: Record<string, string> = {};
	for (const [k, v] of Object.entries(flat)) {
		if (k.toLowerCase() === 'items') continue;
		if (v === undefined || v === null) continue;
		out[k] = String(v);
	}
	return out;
}

function resolveSetTextsMap(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> {
	const raw = ctx.getNodeParameter('textsJson', itemIndex, {}) as IDataObject | string;
	const formObj = jsonObjectFromUnknown(raw) ?? {};

	if (useInputJsonFields) {
		for (const key of ['textsJson', 'texts', 'items']) {
			const fromInput = jsonObjectFromUnknown(valueFromItemJson(itemJson, key));
			if (fromInput && Object.keys(fromInput).length > 0) {
				return toSetTextsParamObject(fromInput);
			}
		}
	}

	const merged = preferJsonObject(useInputJsonFields, itemJson, 'textsJson', formObj);
	return toSetTextsParamObject(merged);
}

function resolveSetCheckboxesMap(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> {
	const raw = ctx.getNodeParameter('checkboxesJson', itemIndex, {}) as IDataObject | string;
	const formObj = jsonObjectFromUnknown(raw) ?? {};

	if (useInputJsonFields) {
		for (const key of ['checkboxesJson', 'checkboxes', 'items']) {
			const fromInput = jsonObjectFromUnknown(valueFromItemJson(itemJson, key));
			if (fromInput && Object.keys(fromInput).length > 0) {
				return toSetTextsParamObject(fromInput);
			}
		}
	}

	const merged = preferJsonObject(useInputJsonFields, itemJson, 'checkboxesJson', formObj);
	return toSetTextsParamObject(merged);
}

/** Path đầy đủ tới control SAP (recorder), khác id tab ngắn dạng tabpTABHDT11. */
function isFullSapControlPath(id: string): boolean {
	return id.trim().includes('/');
}

type MultipleSelectionParamBuilder = {
	s: (key: string, formKey?: string) => string;
	n: (key: string, fallback?: number) => number;
	b: (key: string, fallback: boolean) => boolean;
};

function buildMultipleSelectionParamObject(
	builder: MultipleSelectionParamBuilder,
	withOpen: boolean,
): Record<string, string> {
	const { s, n, b } = builder;
	const cellIdBase = s('multiSelCellIdBase');
	const items = s('multiSelItems');
	if (!cellIdBase.trim()) throw new Error('Thiếu Multi Sel Cell ID Base');
	if (!items.trim()) throw new Error('Thiếu Multi Sel Items');

	const result: Record<string, string> = {
		cellIdBase,
		items,
		dataRow: String(n('multiSelDataRow', 1)),
		windowIndex: String(n('multiSelWindowIndex', 1)),
		sendEnterOnScroll: String(b('multiSelSendEnterOnScroll', true)),
	};

	const confirmButtonIndices = s('multiSelConfirmButtonIndices').trim();
	if (withOpen) {
		const openButtonId = s('multiSelOpenButtonId');
		if (!openButtonId.trim()) throw new Error('Thiếu Multi Sel Open Button ID');
		result.openButtonId = openButtonId;
		result.confirmButtonIndices = confirmButtonIndices || '0,8';
	} else if (confirmButtonIndices) {
		result.confirmButtonIndices = confirmButtonIndices;
	}

	return result;
}

/** Tham số named cho /sap-auto/command (JSON — giá trị thường là string). */
function buildParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, unknown> | undefined {
	const kind = SAP_COMMAND_PARAM_KIND[operation];
	if (!kind) return undefined;

	const s = (key: string, formKey?: string) =>
		preferStr(useInputJsonFields, itemJson, formKey ?? key, ctx.getNodeParameter(key, itemIndex, '') as string);
	const n = (key: string, fallback = 0) =>
		preferNum(useInputJsonFields, itemJson, key, ctx.getNodeParameter(key, itemIndex, fallback) as number);
	const b = (key: string, fallback: boolean) =>
		preferBool(useInputJsonFields, itemJson, key, ctx.getNodeParameter(key, itemIndex, fallback) as boolean);

	const requireElementId = (): string => {
		const id = s('elementId');
		if (!id.trim()) throw new Error('Thiếu SAP Element ID');
		return id;
	};
	const requireGridId = (): string => {
		const gridId = s('gridId');
		if (!gridId.trim()) throw new Error('Thiếu Grid ID');
		return gridId;
	};
	const requireTableId = (): string => {
		const tableId = s('tableId');
		if (!tableId.trim()) throw new Error('Thiếu Table ID');
		return tableId;
	};
	const requireTreeId = (): string => {
		const treeId = s('treeId');
		if (!treeId.trim()) throw new Error('Thiếu Tree ID');
		return treeId;
	};
	const requireTreeItemParams = (): { treeId: string; nodeKey: string; columnName: string } => {
		const treeId = requireTreeId();
		const nodeKey = s('nodeKey');
		const columnName = s('columnName');
		if (!nodeKey.trim()) throw new Error('Thiếu Node Key');
		if (!columnName.trim()) throw new Error('Thiếu Column Name');
		return { treeId, nodeKey, columnName };
	};
	const requireTreeNodeParams = (): { treeId: string; nodeKey: string } => {
		const treeId = requireTreeId();
		const nodeKey = s('nodeKey');
		if (!nodeKey.trim()) throw new Error('Thiếu Node Key');
		return { treeId, nodeKey };
	};
	const requireSavePath = (): string => {
		const savePath = s('savePath');
		if (!savePath.trim()) throw new Error('Thiếu Save Path');
		return savePath;
	};

	switch (kind) {
		case 'none':
			return undefined;
		case 'elementId':
			return { id: requireElementId() };
		case 'elementIdAndText':
			return { id: requireElementId(), value: s('textValue') };
		case 'elementIdAndCaret': {
			const position = n('caretPosition', 0);
			return { id: requireElementId(), position: String(position) };
		}
		case 'elementIdAndCheckbox':
			return { id: requireElementId(), value: String(b('checkboxValue', false)) };
		case 'elementIdAndComboKey':
			return { id: requireElementId(), key: s('comboKey') };
		case 'elementIdAndComboText':
			return { id: requireElementId(), text: s('comboText') };
		case 'setTexts': {
			const map = resolveSetTextsMap(ctx, itemIndex, itemJson, useInputJsonFields);
			if (!map || Object.keys(map).length === 0) {
				throw new Error(
					'SetTexts cần textsJson (object id -> text), ví dụ {"wnd[0]/usr/ctxtMATNR-LOW":"10000001","wnd[0]/usr/ctxtWERKS-LOW":"1000"}',
				);
			}
			return map;
		}
		case 'setCheckboxes': {
			const map = resolveSetCheckboxesMap(ctx, itemIndex, itemJson, useInputJsonFields);
			if (!map || Object.keys(map).length === 0) {
				throw new Error(
					'SetCheckboxes cần checkboxesJson (object id -> true/false), ví dụ {"wnd[0]/usr/chk[1,49]":"true","wnd[0]/usr/chk[1,50]":"false"}',
				);
			}
			return map;
		}
		case 'virtualKey':
			return { vKey: String(n('virtualKey', 0)) };
		case 'transactionCode': {
			const tcode = s('transactionCode');
			if (!tcode.trim()) throw new Error('Thiếu Transaction Code');
			return { tcode };
		}
		case 'selectTab': {
			const tabStripId = s('tabStripId');
			const tabId = s('tabId');
			if (!tabId.trim()) {
				throw new Error('Thiếu Tab ID');
			}
			if (!tabStripId.trim() && !isFullSapControlPath(tabId)) {
				throw new Error(
					'Thiếu Tab Strip ID — chỉ bỏ trống khi Tab ID là path đầy đủ (ví dụ wnd[0]/usr/.../tabpTABHDT11)',
				);
			}
			return { tabStripId, tabId };
		}
		case 'toolbarButton': {
			const toolbarId = s('toolbarId');
			if (!toolbarId.trim()) throw new Error('Thiếu Toolbar ID');
			return { toolbarId, buttonIndex: String(n('buttonIndex', 0)) };
		}
		case 'shellButton': {
			const shellId = s('shellId');
			const buttonId = s('buttonId');
			if (!shellId.trim()) throw new Error('Thiếu Shell ID');
			if (!buttonId.trim()) throw new Error('Thiếu Shell Button ID');
			return { shellId, buttonId };
		}
		case 'containerIdOnly': {
			const containerId = s('containerId');
			if (!containerId.trim()) throw new Error('Thiếu Container ID');
			return { containerId };
		}
		case 'scrollPage': {
			const containerId = s('containerId');
			if (!containerId.trim()) throw new Error('Thiếu Container ID');
			const position = preferNum(
				useInputJsonFields,
				itemJson,
				'position',
				n('scrollPosition', -1),
			);
			return { containerId, position: String(position) };
		}
		case 'tooltip': {
			const tooltip = s('tooltip');
			if (!tooltip.trim()) throw new Error('Thiếu Tooltip');
			return { tooltip };
		}
		case 'containsText': {
			const text = s('containsSearchText');
			if (!text.trim()) throw new Error('Thiếu Text To Find');
			return { text };
		}
		case 'handlePopup': {
			const action = s('handlePopupAction');
			if (!action.trim()) throw new Error('Thiếu Popup Action');
			return { action };
		}
		case 'waitElement': {
			const id = requireElementId();
			const ts = n('timeoutSeconds', 10);
			return { id, timeoutSeconds: String(ts > 0 ? ts : 10) };
		}
		case 'waitSap': {
			const ts = preferNum(
				useInputJsonFields,
				itemJson,
				'waitSapTimeoutSeconds',
				ctx.getNodeParameter('waitSapTimeoutSeconds', itemIndex, 30) as number,
			);
			return ts > 0 ? { timeoutSeconds: String(ts) } : undefined;
		}
		case 'sleep':
			return { milliseconds: String(n('sleepMs', 500)) };
		case 'gridIdOnly':
			return { gridId: requireGridId() };
		case 'gridCellRead': {
			const columnName = s('columnName');
			if (!columnName.trim()) throw new Error('Thiếu Column Name');
			return {
				gridId: requireGridId(),
				row: String(n('gridRow', 0)),
				columnName,
			};
		}
		case 'gridCellWrite': {
			const columnName = s('columnName');
			if (!columnName.trim()) throw new Error('Thiếu Column Name');
			return {
				gridId: requireGridId(),
				row: String(n('gridRow', 0)),
				columnName,
				value: s('cellValue'),
			};
		}
		case 'gridRowOnly':
			return { gridId: requireGridId(), row: String(n('gridRow', 0)) };
		case 'gridRowColumn': {
			const columnName = s('columnName');
			if (!columnName.trim()) throw new Error('Thiếu Column Name');
			return {
				gridId: requireGridId(),
				row: String(n('gridRow', 0)),
				columnName,
			};
		}
		case 'gridToolbarButton': {
			const buttonId = s('buttonId');
			if (!buttonId.trim()) throw new Error('Thiếu Button ID');
			return { gridId: requireGridId(), buttonId };
		}
		case 'gridPage': {
			const pageSize = n('pageSize', 100);
			return {
				gridId: requireGridId(),
				pageIndex: String(n('pageIndex', 0)),
				...(pageSize > 0 ? { pageSize: String(pageSize) } : {}),
			};
		}
		case 'tableIdOnly':
			return { tableId: requireTableId() };
		case 'tableCellRead':
			return {
				tableId: requireTableId(),
				row: String(n('tableRow', 0)),
				col: String(n('tableCol', 0)),
			};
		case 'tableCellWrite':
			return {
				tableId: requireTableId(),
				row: String(n('tableRow', 0)),
				col: String(n('tableCol', 0)),
				value: s('cellValue'),
			};
		case 'tableRowScroll':
			return { tableId: requireTableId(), row: String(n('tableRow', 0)) };
		case 'treeItem':
			return requireTreeItemParams();
		case 'treeNode':
			return requireTreeNodeParams();
		case 'treeIdOnly':
			return { treeId: requireTreeId() };
		case 'savePath':
			return { savePath: requireSavePath() };
		case 'gridSavePath':
			return { gridId: requireGridId(), savePath: requireSavePath() };
		case 'savePathAndFileType': {
			const fileType = s('fileType').trim();
			return {
				savePath: requireSavePath(),
				...(fileType ? { fileType } : {}),
			};
		}
		case 'dumpUserArea': {
			const userAreaId = s('userAreaId').trim();
			return userAreaId ? { userAreaId } : undefined;
		}
		case 'idPattern': {
			const idPattern = preferStr(
				useInputJsonFields,
				itemJson,
				'idPattern',
				ctx.getNodeParameter('idPattern', itemIndex, '') as string,
			).trim();
			if (!idPattern) throw new Error('Thiếu ID Pattern');
			return { idPattern };
		}
		case 'fillMultipleSelection':
			return buildMultipleSelectionParamObject({ s, n, b }, false);
		case 'openFillMultipleSelection':
			return buildMultipleSelectionParamObject({ s, n, b }, true);
		default:
			return undefined;
	}
}

export async function executeDisconnectItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveSapSessionConnectionFields(ctx, itemIndex);
	const url = `${conn.baseUrl}/sap-auto/disconnect`;
	return sapAutoPost(
		ctx,
		url,
		conn.apiKey,
		{
			sessionId: conn.sessionId,
			...(conn.logUrl ? { logUrl: conn.logUrl } : {}),
		},
		conn.timeoutMs,
		conn.sessionId,
		'SAP disconnect',
		connectionPassThrough(conn),
	);
}

function resolveSapAccountParams(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
): { server: string; client: string; username: string } {
	const prefer = (key: string): string => {
		const fromJson = valueFromItemJson(itemJson, key);
		if (fromJson !== undefined && fromJson !== null) {
			const s = String(fromJson).trim();
			if (s) return s;
		}
		return String(ctx.getNodeParameter(key, itemIndex, '') as string).trim();
	};
	const server = prefer('server');
	const client = prefer('client');
	const username = prefer('username');
	if (!server) throw new Error('Thiếu Server');
	if (!client) throw new Error('Thiếu Client');
	if (!username) throw new Error('Thiếu Username');
	return { server, client, username };
}

function resolveOptionalKillReason(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
): string | undefined {
	const fromJson = valueFromItemJson(itemJson, 'reason');
	const reason =
		fromJson !== undefined && fromJson !== null
			? String(fromJson).trim()
			: String(ctx.getNodeParameter('killReason', itemIndex, '') as string).trim();
	return reason || undefined;
}

export async function executeSessionByAccountItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveSapApiConnectionFields(ctx, itemIndex);
	const account = resolveSapAccountParams(ctx, itemIndex, conn.itemJson);
	const url = `${conn.baseUrl}/sap-auto/session/by-account`;
	return sapAutoPost(
		ctx,
		url,
		conn.apiKey,
		account,
		conn.timeoutMs,
		'',
		'SAP session by account',
		apiConnectionPassThrough(conn),
	);
}

export async function executeKillByAccountItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveSapApiConnectionFields(ctx, itemIndex);
	const account = resolveSapAccountParams(ctx, itemIndex, conn.itemJson);
	const reason = resolveOptionalKillReason(ctx, itemIndex, conn.itemJson);
	const body: Record<string, unknown> = { ...account };
	if (reason) body.reason = reason;

	const url = `${conn.baseUrl}/sap-auto/session/kill-by-account`;
	return sapAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		'',
		'SAP kill by account',
		apiConnectionPassThrough(conn),
	);
}

export async function executeKillAllSapSessionsItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveSapApiConnectionFields(ctx, itemIndex);
	const reason = resolveOptionalKillReason(ctx, itemIndex, conn.itemJson);
	const body: Record<string, unknown> = {};
	if (reason) body.reason = reason;

	const url = `${conn.baseUrl}/sap-auto/session/kill-all`;
	return sapAutoPost(
		ctx,
		url,
		conn.apiKey,
		body,
		conn.timeoutMs,
		'',
		'SAP kill all sessions',
		apiConnectionPassThrough(conn),
	);
}

export async function executeCommandShortcutItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
	operation: string,
): Promise<INodeExecutionData> {
	const conn = resolveSapSessionConnectionFields(ctx, itemIndex);
	const funcName = SAP_COMMAND_FUNCTION[operation];
	if (!funcName) {
		throw new Error(`Không phải lệnh SAP command: ${operation}`);
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

	const url = `${conn.baseUrl}/sap-auto/command`;
	const outputBase = connectionPassThrough(conn);
	const fallbackFunc = SAP_COMMAND_FUNCTION_FALLBACK[funcName];

	let result: INodeExecutionData;
	try {
		result = await sapAutoPost(
			ctx,
			url,
			conn.apiKey,
			body,
			conn.timeoutMs,
			conn.sessionId,
			`SAP ${funcName}`,
			outputBase,
		);
	} catch (error) {
		if (
			fallbackFunc &&
			error instanceof Error &&
			/function not found/i.test(error.message)
		) {
			return sapAutoPost(
				ctx,
				url,
				conn.apiKey,
				{ ...body, function: fallbackFunc },
				conn.timeoutMs,
				conn.sessionId,
				`SAP ${fallbackFunc}`,
				outputBase,
			);
		}
		throw error;
	}

	if (fallbackFunc && result.json?.Success === false && isSapFunctionNotFound(result)) {
		result = await sapAutoPost(
			ctx,
			url,
			conn.apiKey,
			{ ...body, function: fallbackFunc },
			conn.timeoutMs,
			conn.sessionId,
			`SAP ${fallbackFunc}`,
			outputBase,
		);
	}

	return result;
}

const ROS_WECOM_TEXT_URL = 'https://ros.reginamiracle.com:82/api/msg/text';
const ROS_WECOM_API_KEY = '349EAF1F-B78B-4B0D-AEF0-9577B8E2F111';
const WECOM_GROUP_WEBHOOK_BASE_URL = 'https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=';

/** Parse danh sách mention: mảng JSON, hoặc chuỗi phân tách bằng , ; | xuống dòng. */
function parseWecomMentionList(raw: unknown): string[] {
	if (raw === undefined || raw === null) return [];
	if (Array.isArray(raw)) {
		return raw.map((v) => String(v).trim()).filter((s) => s !== '');
	}
	const s = String(raw).trim();
	if (!s) return [];
	if (s.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(s);
			if (Array.isArray(parsed)) {
				return parsed.map((v) => String(v).trim()).filter((x) => x !== '');
			}
		} catch {
			/* fall through to delimiter split */
		}
	}
	return s
		.split(/[,;|\n\r]+/)
		.map((part) => part.trim())
		.filter((part) => part !== '');
}

function preferWecomMentionList(
	useInputJsonFields: boolean,
	itemJson: IDataObject,
	jsonKeys: string[],
	formVal: string,
): string[] {
	if (useInputJsonFields) {
		for (const key of jsonKeys) {
			const v = valueFromItemJson(itemJson, key);
			if (v === undefined || v === null) continue;
			const list = parseWecomMentionList(v);
			if (list.length > 0) return list;
		}
	}
	return parseWecomMentionList(formVal);
}

export async function executeWecomGroupMessageItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const wecom = resolveWecomExecutionContext(ctx, itemIndex);
	const botid = preferStr(
		wecom.useInputJsonFields,
		wecom.itemJson,
		'botid',
		ctx.getNodeParameter('botid', itemIndex, '') as string,
	).trim();
	const msgtype = preferStr(
		wecom.useInputJsonFields,
		wecom.itemJson,
		'msgtype',
		ctx.getNodeParameter('msgtype', itemIndex, 'text') as string,
	).trim();
	if (!botid) {
		throw new Error('Bot ID không được rỗng.');
	}
	if (
		msgtype !== 'text' &&
		msgtype !== 'markdown' &&
		msgtype !== 'markdown_v2' &&
		msgtype !== 'image'
	) {
		throw new Error('msgtype phải là text, markdown, markdown_v2 hoặc image.');
	}

	let body: Record<string, unknown>;
	if (msgtype === 'image') {
		const base64 = preferStr(
			wecom.useInputJsonFields,
			wecom.itemJson,
			'base64',
			ctx.getNodeParameter('base64', itemIndex, '') as string,
		).trim();
		const md5 = preferStr(
			wecom.useInputJsonFields,
			wecom.itemJson,
			'md5',
			ctx.getNodeParameter('md5', itemIndex, '') as string,
		).trim();
		if (!base64) {
			throw new Error('Base64 không được rỗng khi msgtype = image.');
		}
		if (!md5) {
			throw new Error('MD5 không được rỗng khi msgtype = image.');
		}
		body = { msgtype: 'image', image: { base64, md5 } };
	} else {
		const content = preferStr(
			wecom.useInputJsonFields,
			wecom.itemJson,
			'content',
			ctx.getNodeParameter('content', itemIndex, '') as string,
		).trim();
		if (!content) {
			throw new Error('Content không được rỗng.');
		}
		if (msgtype === 'text') {
			const text: Record<string, unknown> = { content };
			const mentionedList = preferWecomMentionList(
				wecom.useInputJsonFields,
				wecom.itemJson,
				['mentioned_list', 'mentionedList'],
				ctx.getNodeParameter('mentionedList', itemIndex, '') as string,
			);
			const mentionedMobileList = preferWecomMentionList(
				wecom.useInputJsonFields,
				wecom.itemJson,
				['mentioned_mobile_list', 'mentionedMobileList'],
				ctx.getNodeParameter('mentionedMobileList', itemIndex, '') as string,
			);
			if (mentionedList.length > 0) {
				text.mentioned_list = mentionedList;
			}
			if (mentionedMobileList.length > 0) {
				text.mentioned_mobile_list = mentionedMobileList;
			}
			body = { msgtype: 'text', text };
		} else if (msgtype === 'markdown_v2') {
			body = { msgtype: 'markdown_v2', markdown_v2: { content } };
		} else {
			body = { msgtype: 'markdown', markdown: { content } };
		}
	}

	return wecomGroupMessagePost(
		ctx,
		`${WECOM_GROUP_WEBHOOK_BASE_URL}${encodeURIComponent(botid)}`,
		body,
		wecom.timeoutMs,
	);
}

export async function executeRosWecomSendMessageItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const wecom = resolveWecomExecutionContext(ctx, itemIndex);
	const empids = preferStr(
		wecom.useInputJsonFields,
		wecom.itemJson,
		'empids',
		ctx.getNodeParameter('empids', itemIndex, '') as string,
	).trim();
	const message = preferStr(
		wecom.useInputJsonFields,
		wecom.itemJson,
		'message',
		ctx.getNodeParameter('message', itemIndex, '') as string,
	).trim();
	if (!empids) {
		throw new Error('Emp IDs không được rỗng.');
	}
	if (!message) {
		throw new Error('Message không được rỗng.');
	}

	return rosWecomMessagePost(ctx, ROS_WECOM_TEXT_URL, ROS_WECOM_API_KEY, empids, message, wecom.timeoutMs);
}

export async function executeLogItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const conn = resolveSapSessionConnectionFields(ctx, itemIndex);
	const command = (ctx.getNodeParameter('logCommand', itemIndex, '') as string).trim();
	const message = (ctx.getNodeParameter('logContent', itemIndex, '') as string).trim();
	if (!message) {
		throw new Error('Log Message không được rỗng.');
	}
	if (!conn.logUrl) {
		throw new Error('Thiếu "logUrl" trong JSON input item cho operation Log.');
	}

	const body: Record<string, unknown> = {
		sessionId: conn.sessionId,
		command,
		message,
	};
	return sapLogPost(
		ctx,
		conn.logUrl,
		conn.apiKey,
		body,
		conn.timeoutMs,
		conn.sessionId,
		connectionPassThrough(conn),
	);
}
