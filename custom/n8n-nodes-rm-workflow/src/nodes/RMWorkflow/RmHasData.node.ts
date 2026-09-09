import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

/** Field kết nối RM — thường không coi là “dữ liệu nghiệp vụ”. */
const RM_CONNECTION_KEYS = new Set([
	'baseUrl',
	'apiKey',
	'sessionId',
	'requestTimeoutSeconds',
	'logUrl',
	'rootDirectory',
	'server',
	'client',
	'username',
	'password',
	'multiLogonAction',
	'language',
	'idleTimeoutMinutes',
	'uuid',
	'hasData',
]);

/**
 * Tách path thành các segment.
 * Hỗ trợ: data.Result, data.test.result, data.result[1], data.result[1].name, data[0].id
 */
export function parsePathSegments(path: string): string[] {
	const segments: string[] = [];
	const re = /([^[.\]]+)|\[(\d+)\]|\[(?:'|")([^'"\]]+)(?:'|")\]/g;
	let match: RegExpExecArray | null;
	while ((match = re.exec(path)) !== null) {
		const seg = match[1] ?? match[2] ?? match[3];
		if (seg !== undefined && seg !== '') segments.push(seg);
	}
	return segments;
}

/** Lấy giá trị theo path: `data.Result` / `data.test.result` / `data.result[1]`. */
export function getByPath(root: unknown, path: string): unknown {
	const parts = parsePathSegments(path);
	if (parts.length === 0) return root;

	let current: unknown = root;
	for (const part of parts) {
		if (current === undefined || current === null) return undefined;
		if (typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[part];
	}
	return current;
}

/**
 * true nếu value được coi là “có dữ liệu”:
 * - không phải null/undefined/""
 * - mảng phải có ít nhất 1 phần tử
 * - object phải có ít nhất 1 key
 */
export function valueHasData(value: unknown, treatBlankAsEmpty: boolean): boolean {
	if (value === undefined || value === null) return false;
	if (Array.isArray(value)) return value.length > 0;
	if (typeof value === 'string') return value.trim() !== '';
	if (typeof value === 'object') {
		if (!treatBlankAsEmpty) return true;
		return Object.keys(value as object).length > 0;
	}
	// number / boolean / bigint …
	return true;
}

/**
 * Trả về true nếu item có dữ liệu nghiệp vụ.
 * - `propertyPath` trống → dò cả object (bỏ field kết nối RM nếu bật).
 * - có path → chỉ dò giá trị tại path (vd. data.Result).
 */
export function itemHasData(
	json: IDataObject,
	options: {
		propertyPath: string;
		ignoreConnectionFields: boolean;
		treatBlankAsEmpty: boolean;
		extraIgnoreKeys: string[];
	},
): boolean {
	const path = options.propertyPath.trim();
	if (path) {
		return valueHasData(getByPath(json, path), options.treatBlankAsEmpty);
	}

	const ignore = new Set<string>(
		options.ignoreConnectionFields ? RM_CONNECTION_KEYS : ['hasData'],
	);
	for (const key of options.extraIgnoreKeys) {
		const trimmed = key.trim();
		if (trimmed) ignore.add(trimmed);
	}

	for (const [key, value] of Object.entries(json)) {
		if (ignore.has(key)) continue;
		if (options.treatBlankAsEmpty) {
			if (!valueHasData(value, true)) continue;
		}
		return true;
	}
	return false;
}

/**
 * RM Has Data — tách nhánh khi input trắng dạng `[{}]` / chỉ còn field kết nối RM.
 * Có thể dò theo property path (data.Result…). Output 0 = Has Data, Output 1 = Empty.
 */
export class RmHasData implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM Has Data',
		name: 'rmHasData',
		icon: { light: 'file:icon.svg', dark: 'file:icon.dark.svg' },
		iconColor: 'pink-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["propertyPath"] || "Has Data / Empty"}}',
		description:
			'Kiểm tra input có dữ liệu hay trống — có thể dò theo property (data.Result…). Tách nhánh Has Data / Empty',
		defaults: {
			name: 'RM Has Data',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['Has Data', 'Empty'],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: [
				'RM',
				'Has Data',
				'Empty',
				'Check',
				'IF',
				'Blank',
				'Null',
				'[{}]',
				'property',
				'path',
				'kiểm tra dữ liệu',
			],
		},
		properties: [
			{
				displayName: 'Tips',
				name: 'tips',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'Để trống Property Path = dò cả object. Điền path (vd. data.Result, data.result[1], data.test.result) = chỉ kiểm tra field đó. Empty / null / "" / [] → nhánh Empty.',
			},
			{
				displayName: 'Property Path',
				name: 'propertyPath',
				type: 'string',
				default: '',
				placeholder: 'data.result[1]',
				description:
					'Để trống = dò cả object. Ví dụ: data.Result, data.test.result, data.result[1]. Index bắt đầu từ 0. Empty / null / "" / [] → Empty (false).',
			},
			{
				displayName: 'Bỏ qua field kết nối RM',
				name: 'ignoreConnectionFields',
				type: 'boolean',
				default: true,
				description:
					'Chỉ dùng khi Property Path trống. true = không tính baseUrl, apiKey, sessionId, uuid, SAP… là dữ liệu nghiệp vụ.',
				displayOptions: {
					show: {
						propertyPath: [''],
					},
				},
			},
			{
				displayName: 'Chuỗi / mảng / object trống = Empty',
				name: 'treatBlankAsEmpty',
				type: 'boolean',
				default: true,
				description:
					'true = "", null, [], {} không tính là có dữ liệu. false = object có key vẫn tính (kể cả value trống); mảng rỗng [] vẫn luôn Empty.',
			},
			{
				displayName: 'Thêm field bỏ qua',
				name: 'extraIgnoreKeys',
				type: 'string',
				default: '',
				placeholder: 'success, message, error',
				description:
					'Chỉ dùng khi Property Path trống. Danh sách field thêm (cách nhau bằng dấu phẩy) không tính là dữ liệu nghiệp vụ.',
				displayOptions: {
					show: {
						propertyPath: [''],
					},
				},
			},
			{
				displayName: 'Ghi field hasData',
				name: 'writeHasDataField',
				type: 'boolean',
				default: true,
				description: 'Ghi hasData: true/false vào JSON output (tiện dùng biểu thức).',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const hasDataOut: INodeExecutionData[] = [];
		const emptyOut: INodeExecutionData[] = [];

		const propertyPath = String(this.getNodeParameter('propertyPath', 0, '') ?? '');
		const ignoreConnectionFields = this.getNodeParameter(
			'ignoreConnectionFields',
			0,
			true,
		) as boolean;
		const treatBlankAsEmpty = this.getNodeParameter('treatBlankAsEmpty', 0, true) as boolean;
		const extraIgnoreRaw = String(this.getNodeParameter('extraIgnoreKeys', 0, '') ?? '');
		const extraIgnoreKeys = extraIgnoreRaw
			.split(/[,;\n]/)
			.map((k) => k.trim())
			.filter(Boolean);
		const writeHasDataField = this.getNodeParameter('writeHasDataField', 0, true) as boolean;

		const options = {
			propertyPath,
			ignoreConnectionFields,
			treatBlankAsEmpty,
			extraIgnoreKeys,
		};

		if (items.length === 0) {
			const json: IDataObject = writeHasDataField ? { hasData: false } : {};
			emptyOut.push({ json, pairedItem: { item: 0 } });
			return [hasDataOut, emptyOut];
		}

		for (let i = 0; i < items.length; i++) {
			const incoming = (items[i]?.json ?? {}) as IDataObject;
			const hasData = itemHasData(incoming, options);
			const json: IDataObject = writeHasDataField
				? { ...incoming, hasData }
				: { ...incoming };

			const entry: INodeExecutionData = { json, pairedItem: { item: i } };
			if (hasData) {
				hasDataOut.push(entry);
			} else {
				emptyOut.push(entry);
			}
		}

		return [hasDataOut, emptyOut];
	}
}
