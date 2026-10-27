import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

/** Field kết nối RM thường cần cho SAP / Web / File. */
const RM_CONNECTION_KEYS = [
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
] as const;

function escapeNodeNameForExpression(name: string): string {
	return name.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isPlainObject(value: unknown): value is IDataObject {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function pickConnectionFields(source: IDataObject): IDataObject {
	const out: IDataObject = {};
	for (const key of RM_CONNECTION_KEYS) {
		if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== '') {
			out[key] = source[key];
		}
	}
	return out;
}

function pickCustomFields(source: IDataObject, keysCsv: string): IDataObject {
	const out: IDataObject = {};
	const keys = keysCsv
		.split(/[,;\n]/)
		.map((k) => k.trim())
		.filter(Boolean);
	for (const key of keys) {
		if (source[key] !== undefined) {
			out[key] = source[key];
		}
	}
	return out;
}

/**
 * RM Copy Context — lấy JSON từ một node đã chạy trong workflow
 * (vd. RM Init / Connect) rồi merge vào item hiện tại.
 * Dùng khi chen Code/Set/IF làm mất baseUrl, apiKey, sessionId.
 */
export class RmCopyContext implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM Copy Context',
		name: 'rmCopyContext',
		icon: { light: 'file:icon.svg', dark: 'file:icon.dark.svg' },
		iconColor: 'pink-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["sourceNode"]}}',
		description: 'Copy data from another node in the workflow',
		defaults: {
			name: 'RM Copy Context',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RM', 'Copy', 'Context', 'Pass', 'Merge', 'baseUrl', 'sessionId'],
		},
		properties: [
			{
				displayName: 'Tips',
				name: 'tips',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'Chèn sau Code/Set/IF khi mất baseUrl/apiKey/sessionId. Gõ đúng tên node nguồn (vd. RM Init hoặc RM FILE AUTO4). Copy Mode = Connection Fields chỉ lấy field kết nối RM.',
			},
			{
				displayName: 'Source Node',
				name: 'sourceNode',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'RM Init',
				description:
					'Tên node đã chạy trong workflow (đúng như trên canvas). Ví dụ: RM Init — sẽ lấy baseUrl/apiKey/sessionId từ output node đó.',
			},
			{
				displayName: 'Copy Mode',
				name: 'copyMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Connection Fields (RM)',
						value: 'connectionFields',
						description:
							'Chỉ baseUrl, apiKey, sessionId, requestTimeoutSeconds, logUrl, rootDirectory (+ SAP nếu có)',
					},
					{
						name: 'All JSON Fields',
						value: 'all',
						description: 'Copy toàn bộ json của source node',
					},
					{
						name: 'Custom Field Names',
						value: 'custom',
						description: 'Chỉ các field liệt kê (phân cách bằng dấu phẩy)',
					},
				],
				default: 'connectionFields',
			},
			{
				displayName: 'Field Names',
				name: 'customFields',
				type: 'string',
				default: 'baseUrl, apiKey, sessionId',
				placeholder: 'baseUrl, apiKey, sessionId, rootDirectory',
				description: 'Danh sách tên field cần copy, phân cách bằng dấu phẩy',
				displayOptions: {
					show: {
						copyMode: ['custom'],
					},
				},
			},
			{
				displayName: 'Merge Mode',
				name: 'mergeMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Source Overwrites',
						value: 'sourceWins',
						description: 'Giữ data hiện tại; field copy từ source ghi đè',
					},
					{
						name: 'Only Fill Missing',
						value: 'fillMissing',
						description: 'Chỉ thêm field từ source khi item hiện tại thiếu / rỗng',
					},
					{
						name: 'Source Only (Replace JSON)',
						value: 'replace',
						description: 'Thay toàn bộ json bằng dữ liệu đã chọn từ source (bỏ data input)',
					},
				],
				default: 'sourceWins',
			},
			{
				displayName: 'Item From Source',
				name: 'sourceItemMode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Paired Item (same index)',
						value: 'paired',
						description: "Dùng $('Node').item — cùng paired item nếu có",
					},
					{
						name: 'First Item',
						value: 'first',
						description: "Luôn lấy $('Node').first() — ổn định sau Code/aggregate",
					},
				],
				default: 'first',
				description:
					'Sau Code thường chọn First Item. Paired Item khi số item khớp và có pairedItem.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const sourceNode = String(this.getNodeParameter('sourceNode', i, '')).trim();
			if (!sourceNode) {
				throw new NodeOperationError(
					this.getNode(),
					'Nhập Source Node — đúng tên trên canvas (vd. RM Init).',
					{ itemIndex: i },
				);
			}

			const copyMode = this.getNodeParameter('copyMode', i, 'connectionFields') as string;
			const mergeMode = this.getNodeParameter('mergeMode', i, 'sourceWins') as string;
			const sourceItemMode = this.getNodeParameter('sourceItemMode', i, 'first') as string;
			const customFields = this.getNodeParameter('customFields', i, '') as string;

			const escaped = escapeNodeNameForExpression(sourceNode);
			const expr =
				sourceItemMode === 'paired'
					? `{{ $('${escaped}').item.json }}`
					: `{{ $('${escaped}').first().json }}`;

			let sourceJson: unknown;
			try {
				sourceJson = this.evaluateExpression(expr, i);
			} catch (error) {
				throw new NodeOperationError(
					this.getNode(),
					`Không đọc được output của node "${sourceNode}". Node đó đã chạy thành công chưa? ${(error as Error).message}`,
					{ itemIndex: i },
				);
			}

			if (!isPlainObject(sourceJson)) {
				throw new NodeOperationError(
					this.getNode(),
					`Output của "${sourceNode}" không phải object JSON.`,
					{ itemIndex: i },
				);
			}

			let picked: IDataObject;
			if (copyMode === 'all') {
				picked = { ...sourceJson };
			} else if (copyMode === 'custom') {
				picked = pickCustomFields(sourceJson, customFields);
			} else {
				picked = pickConnectionFields(sourceJson);
			}

			if (Object.keys(picked).length === 0) {
				throw new NodeOperationError(
					this.getNode(),
					`Không có field nào để copy từ "${sourceNode}" (mode=${copyMode}). Kiểm tra output node nguồn.`,
					{ itemIndex: i },
				);
			}

			const current = { ...(items[i].json ?? {}) } as IDataObject;
			let merged: IDataObject;

			if (mergeMode === 'replace') {
				merged = { ...picked };
			} else if (mergeMode === 'fillMissing') {
				merged = { ...current };
				for (const [key, value] of Object.entries(picked)) {
					const cur = merged[key];
					if (cur === undefined || cur === null || String(cur).trim() === '') {
						merged[key] = value;
					}
				}
			} else {
				merged = { ...current, ...picked };
			}

			returnData.push({
				json: merged,
				pairedItem: items[i].pairedItem ?? { item: i },
				binary: items[i].binary,
			});
		}

		return [returnData];
	}
}
