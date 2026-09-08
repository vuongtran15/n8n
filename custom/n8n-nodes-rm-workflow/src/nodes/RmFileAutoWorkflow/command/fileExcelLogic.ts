import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { valueFromItemJson } from '../shared/fileItemJson';

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

function buildStyleObject(opts: {
	bold?: boolean;
	italic?: boolean;
	fontSize?: number;
	fontName?: string;
	color?: string;
	fillColor?: string;
	border?: string;
	borderColor?: string;
	horizontalAlignment?: string;
	wrapText?: boolean;
}): Record<string, unknown> | undefined {
	const style: Record<string, unknown> = {};
	if (opts.bold) style.bold = true;
	if (opts.italic) style.italic = true;
	if (opts.fontSize && opts.fontSize > 0) style.fontSize = opts.fontSize;
	if (opts.fontName?.trim()) style.fontName = opts.fontName.trim();
	if (opts.color?.trim()) style.color = opts.color.trim();
	if (opts.fillColor?.trim()) style.fillColor = opts.fillColor.trim();
	if (opts.border && opts.border !== 'none') style.border = opts.border;
	if (opts.borderColor?.trim()) style.borderColor = opts.borderColor.trim();
	if (opts.horizontalAlignment && opts.horizontalAlignment !== 'default') {
		style.horizontalAlignment = opts.horizontalAlignment;
	}
	if (opts.wrapText) style.wrapText = true;
	return Object.keys(style).length > 0 ? style : undefined;
}

/**
 * Xây dataJson từ toàn bộ input items (bỏ field kết nối).
 * - Có headers tường minh → rows là mảng theo thứ tự header (object theo key).
 * - Không headers → mảng object (key = header).
 */
function dataFromInputItems(
	ctx: IExecuteFunctions,
	headers: string[] | undefined,
): unknown {
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

/** Build paramObject cho WriteExcel — UX table/cells/range/style/batch. */
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

	const path = s('excelPath', 'relativeOrAbsolutePath').trim();
	if (!path) throw new Error('Thiếu Excel Path (relativeOrAbsolutePath) — phải kết thúc .xlsx');
	if (!path.toLowerCase().endsWith('.xlsx')) {
		throw new Error('Excel Path phải kết thúc bằng .xlsx');
	}

	const writeMode = preferStr(
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
			throw new Error(
				'Thiếu Operations JSON — mảng operation (table/cells/range/style/sheetStyle). Sẽ JSON.stringify gửi lên API.',
			);
		}
		// Cho phép user dán object/array; luôn stringify đúng 1 lần
		const parsed = parseJsonField('Operations JSON', operationsJson);
		base.operationsJson = stringifyIfNeeded(parsed);
		return base;
	}

	const sheetName = s('sheetName').trim() || 'Sheet1';
	base.sheetName = sheetName;
	base.type = writeMode;

	if (writeMode === 'table') {
		const startCell = s('startCell').trim() || 'A1';
		base.startCell = startCell;

		const dataSource = preferStr(
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
			const data = dataFromInputItems(ctx, headers);
			base.dataJson = JSON.stringify(data);
		} else {
			const dataRaw = s('dataJson').trim();
			if (!dataRaw) {
				throw new Error(
					'Thiếu Data JSON — mảng dòng [[...]] hoặc object[], hoặc chọn Data Source = Input Items.',
				);
			}
			base.dataJson = stringifyIfNeeded(parseJsonField('Data JSON', dataRaw));
		}

		if (b('excelUseHeaderStyle', true)) {
			const headerStyle = buildStyleObject({
				bold: true,
				fillColor: s('headerFillColor') || '#4472C4',
				color: s('headerFontColor') || '#FFFFFF',
				border: s('headerBorder') || 'thin',
				borderColor: s('headerBorderColor') || '#1F4E79',
				horizontalAlignment: s('headerAlign') || 'center',
				fontSize: Number(ctx.getNodeParameter('headerFontSize', itemIndex, 11)) || 11,
			});
			if (headerStyle) base.headerStyleJson = JSON.stringify(headerStyle);
		}

		if (b('excelUseBodyStyle', true)) {
			const bodyStyle = buildStyleObject({
				border: s('bodyBorder') || 'thin',
				borderColor: s('bodyBorderColor') || '#000000',
				fontSize: Number(ctx.getNodeParameter('bodyFontSize', itemIndex, 11)) || 11,
				fontName: s('bodyFontName') || '',
				wrapText: b('bodyWrapText', false),
			});
			if (bodyStyle) base.styleJson = JSON.stringify(bodyStyle);
		}

		return base;
	}

	if (writeMode === 'cells') {
		const cellsRaw = s('cellsJson').trim();
		if (!cellsRaw) {
			throw new Error(
				'Thiếu Cells JSON — ví dụ {"A1":"Tiêu đề","B1":123,"C1":{"value":"OK","style":{"bold":true}}}',
			);
		}
		base.cellsJson = stringifyIfNeeded(parseJsonField('Cells JSON', cellsRaw));
		const styleRaw = s('styleJson').trim();
		if (styleRaw) base.styleJson = stringifyIfNeeded(parseJsonField('Style JSON', styleRaw));
		return base;
	}

	if (writeMode === 'range') {
		const range = s('excelRange', 'range').trim() || 'A1';
		base.range = range;
		const dataRaw = s('dataJson').trim();
		if (!dataRaw) throw new Error('Thiếu Data JSON cho type=range (mảng 2D).');
		base.dataJson = stringifyIfNeeded(parseJsonField('Data JSON', dataRaw));
		const styleRaw = s('styleJson').trim();
		if (styleRaw) base.styleJson = stringifyIfNeeded(parseJsonField('Style JSON', styleRaw));
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
			// API expect cells as list in style op — gửi qua cellsJson stringified array
			base.cellsJson = stringifyIfNeeded(parseJsonField('Style Cells JSON', cellsList));
		}
		const styleRaw = s('styleJson').trim();
		if (!styleRaw) throw new Error('Thiếu Style JSON cho type=style.');
		base.styleJson = stringifyIfNeeded(parseJsonField('Style JSON', styleRaw));
		return base;
	}

	if (writeMode === 'sheetStyle') {
		const styleRaw = s('styleJson').trim();
		if (!styleRaw) {
			throw new Error('Thiếu Style JSON cho sheetStyle — vd {"fontName":"Arial","fontSize":11}');
		}
		base.styleJson = stringifyIfNeeded(parseJsonField('Style JSON', styleRaw));
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

	const path = s('excelPath', 'relativeOrAbsolutePath').trim();
	if (!path) throw new Error('Thiếu Excel Path — phải kết thúc .xlsx');
	if (!path.toLowerCase().endsWith('.xlsx')) {
		throw new Error('Excel Path phải kết thúc bằng .xlsx');
	}

	const out: Record<string, string> = { relativeOrAbsolutePath: path };
	const sheetName = s('sheetName').trim();
	if (sheetName) out.sheetName = sheetName;
	out.hasHeader = b('excelHasHeader', true) ? 'true' : 'false';
	return out;
}
