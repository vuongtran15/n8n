import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { valueFromItemJson } from '../shared/fileItemJson';
import { readStyleCollection } from './fileExcelStyle';

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

function stringifyIfNeeded(value: unknown): string {
	if (typeof value === 'string') return value;
	return JSON.stringify(value);
}

function parseJsonField(label: string, raw: string): unknown {
	const trimmed = raw.trim();
	if (!trimmed) {
		throw new Error(`${label} không được rỗng.`);
	}
	try {
		return JSON.parse(trimmed);
	} catch {
		throw new Error(`${label} phải là JSON hợp lệ.`);
	}
}

function dataFromInputItems(ctx: IExecuteFunctions, headers: string[] | undefined): unknown {
	const items = ctx.getInputData();
	const skip = new Set([
		'baseurl',
		'host',
		'apikey',
		'api-key',
		'api_key',
		'sessionid',
		'requesttimeoutseconds',
		'logurl',
		'logcallbackurl',
		'rootdirectory',
	]);

	const cleanItem = (json: IDataObject): IDataObject => {
		const out: IDataObject = {};
		for (const [k, v] of Object.entries(json)) {
			if (skip.has(k.toLowerCase())) continue;
			out[k] = v as IDataObject[string];
		}
		return out;
	};

	const rows = items.map((it) => cleanItem(it.json ?? {}));
	if (headers && headers.length > 0) {
		return rows.map((row) => headers.map((h) => (row[h] !== undefined ? row[h] : '')));
	}
	return rows;
}

function requireExcelPath(path: string): string {
	const p = path.trim();
	if (!p) throw new Error('Thiếu Excel Path — phải kết thúc .xlsx');
	if (!p.toLowerCase().endsWith('.xlsx')) {
		throw new Error('Excel Path phải kết thúc bằng .xlsx');
	}
	return p;
}

/** Build paramObject cho WriteExcel. */
export function buildWriteExcelParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> {
	const s = (key: string, formKey?: string) =>
		preferStr(
			useInputJsonFields,
			itemJson,
			formKey ?? key,
			ctx.getNodeParameter(key, itemIndex, '') as string,
		);
	const b = (key: string, fallback: boolean) =>
		preferBool(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, fallback) as boolean,
		);

	const path = requireExcelPath(s('excelPath', 'relativeOrAbsolutePath'));
	const writeMode =
		preferStr(
			useInputJsonFields,
			itemJson,
			'excelWriteMode',
			ctx.getNodeParameter('excelWriteMode', itemIndex, 'table') as string,
		).trim() || 'table';

	const overwrite = b('excelOverwrite', true);
	const createParent = b('excelCreateParentDirectories', true);

	const base: Record<string, string> = {
		relativeOrAbsolutePath: path,
		overwrite: overwrite ? 'true' : 'false',
		createParentDirectories: createParent ? 'true' : 'false',
	};

	if (writeMode === 'batch') {
		const operationsJson = s('operationsJson').trim();
		if (!operationsJson) {
			throw new Error('Thiếu Operations JSON — mảng operation (table/cells/range/style/sheetStyle).');
		}
		base.operationsJson = stringifyIfNeeded(parseJsonField('Operations JSON', operationsJson));
		return base;
	}

	base.sheetName = s('sheetName').trim() || 'Sheet1';
	base.type = writeMode;

	if (writeMode === 'table') {
		base.startCell = s('startCell').trim() || 'A1';

		const dataSource =
			preferStr(
				useInputJsonFields,
				itemJson,
				'excelDataSource',
				ctx.getNodeParameter('excelDataSource', itemIndex, 'json') as string,
			).trim() || 'json';

		const headersRaw = s('headersJson').trim();
		let headers: string[] | undefined;
		if (headersRaw) {
			const parsedHeaders = parseJsonField('Headers JSON', headersRaw);
			base.headersJson = stringifyIfNeeded(parsedHeaders);
			if (Array.isArray(parsedHeaders)) {
				headers = parsedHeaders.map((h) => String(h));
			}
		}

		if (dataSource === 'inputItems') {
			base.dataJson = JSON.stringify(dataFromInputItems(ctx, headers));
		} else {
			const dataRaw = s('dataJson').trim();
			if (!dataRaw) {
				throw new Error(
					'Thiếu Data JSON — hoặc chọn Data Source = Input Items.',
				);
			}
			base.dataJson = stringifyIfNeeded(parseJsonField('Data JSON', dataRaw));
		}

		const headerStyle = readStyleCollection(ctx, itemIndex, 'headerStyleOptions');
		if (headerStyle) base.headerStyleJson = JSON.stringify(headerStyle);

		const bodyStyle = readStyleCollection(ctx, itemIndex, 'bodyStyleOptions');
		if (bodyStyle) base.styleJson = JSON.stringify(bodyStyle);

		return base;
	}

	if (writeMode === 'cells') {
		const cellsRaw = s('cellsJson').trim();
		if (!cellsRaw) {
			throw new Error('Thiếu Cells JSON — ví dụ {"A1":"Tiêu đề","B1":123}');
		}
		base.cellsJson = stringifyIfNeeded(parseJsonField('Cells JSON', cellsRaw));
		const style = readStyleCollection(ctx, itemIndex, 'styleOptions');
		if (style) base.styleJson = JSON.stringify(style);
		return base;
	}

	if (writeMode === 'range') {
		base.range = s('excelRange', 'range').trim() || 'A1';
		const dataRaw = s('dataJson').trim();
		if (!dataRaw) throw new Error('Thiếu Data JSON cho type=range (mảng 2D).');
		base.dataJson = stringifyIfNeeded(parseJsonField('Data JSON', dataRaw));
		const style = readStyleCollection(ctx, itemIndex, 'styleOptions');
		if (style) base.styleJson = JSON.stringify(style);
		return base;
	}

	if (writeMode === 'style') {
		const range = s('excelRange', 'range').trim();
		const cellsList = s('styleCellsJson').trim();
		if (!range && !cellsList) {
			throw new Error('type=style cần Range (vd A2:C10) hoặc danh sách ô JSON ["E1","E2"].');
		}
		if (range) base.range = range;
		if (cellsList) {
			base.cellsJson = stringifyIfNeeded(parseJsonField('Style Cells JSON', cellsList));
		}
		const style = readStyleCollection(ctx, itemIndex, 'styleOptions');
		if (!style) {
			throw new Error('type=style: bấm Add option để chọn fontName, border…');
		}
		base.styleJson = JSON.stringify(style);
		return base;
	}

	if (writeMode === 'sheetStyle') {
		const style = readStyleCollection(ctx, itemIndex, 'styleOptions');
		if (!style) {
			throw new Error('sheetStyle: bấm Add option (vd Font Name, Font Size).');
		}
		base.styleJson = JSON.stringify(style);
		return base;
	}

	throw new Error(`excelWriteMode không hỗ trợ: ${writeMode}`);
}

export function buildReadExcelParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> {
	const s = (key: string, formKey?: string) =>
		preferStr(
			useInputJsonFields,
			itemJson,
			formKey ?? key,
			ctx.getNodeParameter(key, itemIndex, '') as string,
		);
	const b = (key: string, fallback: boolean) =>
		preferBool(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, fallback) as boolean,
		);

	const path = requireExcelPath(s('excelPath', 'relativeOrAbsolutePath'));
	const out: Record<string, string> = { relativeOrAbsolutePath: path };
	const sheetName = s('sheetName').trim();
	if (sheetName) out.sheetName = sheetName;
	out.hasHeader = b('excelHasHeader', true) ? 'true' : 'false';
	return out;
}

export function buildDeleteExcelSheetParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> {
	const s = (key: string, formKey?: string) =>
		preferStr(
			useInputJsonFields,
			itemJson,
			formKey ?? key,
			ctx.getNodeParameter(key, itemIndex, '') as string,
		);
	const path = requireExcelPath(s('excelPath', 'relativeOrAbsolutePath'));
	const sheetName = s('sheetName').trim();
	if (!sheetName) throw new Error('Thiếu Sheet Name cần xóa.');
	return { relativeOrAbsolutePath: path, sheetName };
}

export function buildClearExcelRangeParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> {
	const s = (key: string, formKey?: string) =>
		preferStr(
			useInputJsonFields,
			itemJson,
			formKey ?? key,
			ctx.getNodeParameter(key, itemIndex, '') as string,
		);
	const b = (key: string, fallback: boolean) =>
		preferBool(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, fallback) as boolean,
		);

	const path = requireExcelPath(s('excelPath', 'relativeOrAbsolutePath'));
	const out: Record<string, string> = { relativeOrAbsolutePath: path };
	const sheetName = s('sheetName').trim();
	if (sheetName) out.sheetName = sheetName;
	const range = s('excelRange', 'range').trim();
	if (range) out.range = range;
	out.clearFormats = b('excelClearFormats', false) ? 'true' : 'false';
	return out;
}

export function buildDeleteExcelEmptyRowsParamObject(
	ctx: IExecuteFunctions,
	itemIndex: number,
	itemJson: IDataObject,
	useInputJsonFields: boolean,
): Record<string, string> {
	const s = (key: string, formKey?: string) =>
		preferStr(
			useInputJsonFields,
			itemJson,
			formKey ?? key,
			ctx.getNodeParameter(key, itemIndex, '') as string,
		);
	const b = (key: string, fallback: boolean) =>
		preferBool(
			useInputJsonFields,
			itemJson,
			key,
			ctx.getNodeParameter(key, itemIndex, fallback) as boolean,
		);

	const path = requireExcelPath(s('excelPath', 'relativeOrAbsolutePath'));
	const out: Record<string, string> = { relativeOrAbsolutePath: path };
	const sheetName = s('sheetName').trim();
	if (sheetName) out.sheetName = sheetName;
	out.keepHeaderRow = b('excelKeepHeaderRow', true) ? 'true' : 'false';
	return out;
}
