import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

type ValueType = 'number' | 'text' | 'object';
type Operation = 'get' | 'set' | 'increment' | 'reset';

type StoredVar = {
	type: ValueType;
	value: unknown;
};

const STORE_KEY = '__rmGlobalVars';

function getStore(staticData: IDataObject): Record<string, StoredVar> {
	const existing = staticData[STORE_KEY];
	if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
		return existing as Record<string, StoredVar>;
	}
	const created: Record<string, StoredVar> = {};
	staticData[STORE_KEY] = created;
	return created;
}

function parseByType(raw: unknown, valueType: ValueType): unknown {
	if (valueType === 'number') {
		if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
		const n = Number(String(raw ?? '').trim());
		if (!Number.isFinite(n)) {
			throw new Error(`Giá trị số không hợp lệ: ${String(raw)}`);
		}
		return n;
	}

	if (valueType === 'text') {
		if (raw === undefined || raw === null) return '';
		return String(raw);
	}

	// object
	if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
		return raw as IDataObject;
	}
	const text = String(raw ?? '').trim();
	if (!text) return {};
	try {
		const parsed = JSON.parse(text) as unknown;
		if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error('JSON phải là object { ... }');
		}
		return parsed as IDataObject;
	} catch (error) {
		throw new Error(
			`Object JSON không hợp lệ: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

function defaultForType(valueType: ValueType): unknown {
	if (valueType === 'number') return 0;
	if (valueType === 'text') return '';
	return {};
}

/**
 * RM Global Var — biến global của workflow (static data).
 * Dùng Increment để đếm tự tăng, không cần viết Code set static data.
 */
export class RmGlobalVar implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM Global Var',
		name: 'rmGlobalVar',
		icon: { light: 'file:icon.svg', dark: 'file:icon.dark.svg' },
		iconColor: 'pink-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["key"]}}',
		description:
			'Workflow global variable — get / set / auto-increment / reset (number, text, object)',
		defaults: {
			name: 'RM Global Var',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: [
				'RM',
				'global',
				'variable',
				'counter',
				'increment',
				'static data',
				'biến',
				'đếm',
				'tự tăng',
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
					'Lưu biến trong Global Static Data của workflow (sống qua nhiều lần chạy). Operation Increment = tự tăng số — không cần Code node. Reset ghi lại Default Value. Scope: theo từng workflow.',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Get',
						value: 'get',
						description: 'Đọc giá trị hiện tại',
						action: 'Get global variable',
					},
					{
						name: 'Set',
						value: 'set',
						description: 'Ghi giá trị mới',
						action: 'Set global variable',
					},
					{
						name: 'Increment',
						value: 'increment',
						description: 'Tự tăng số (counter). Nếu chưa có thì lấy Default Value rồi cộng Step',
						action: 'Increment global counter',
					},
					{
						name: 'Reset',
						value: 'reset',
						description: 'Ghi lại Default Value vào biến',
						action: 'Reset global variable',
					},
				],
				default: 'increment',
			},
			{
				displayName: 'Tên biến',
				name: 'key',
				type: 'string',
				default: 'counter',
				required: true,
				placeholder: 'counter',
				description: 'Tên khóa lưu trong global static data (vd: counter, runId, flags)',
			},
			{
				displayName: 'Kiểu giá trị',
				name: 'valueType',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Number', value: 'number', description: 'Số — dùng Increment' },
					{ name: 'Text', value: 'text', description: 'Chuỗi' },
					{ name: 'Object (JSON)', value: 'object', description: 'Object JSON' },
				],
				default: 'number',
			},
			{
				displayName: 'Value',
				name: 'value',
				type: 'string',
				default: '0',
				placeholder: '0',
				description: 'Giá trị ghi vào khi Operation = Set (Number / Text)',
				displayOptions: {
					show: {
						operation: ['set'],
						valueType: ['number', 'text'],
					},
				},
			},
			{
				displayName: 'Value (JSON)',
				name: 'valueJson',
				type: 'json',
				default: '{}',
				description: 'Object JSON khi kiểu = Object và Operation = Set',
				displayOptions: {
					show: {
						operation: ['set'],
						valueType: ['object'],
					},
				},
			},
			{
				displayName: 'Step',
				name: 'step',
				type: 'number',
				default: 1,
				description: 'Bước tăng mỗi lần Increment (có thể âm để giảm)',
				displayOptions: {
					show: {
						operation: ['increment'],
						valueType: ['number'],
					},
				},
			},
			{
				displayName: 'Default / Reset Value',
				name: 'resetValue',
				type: 'string',
				default: '0',
				placeholder: '0',
				description:
					'Dùng khi Reset, hoặc khi Increment mà biến chưa tồn tại. Object: JSON string.',
			},
			{
				displayName: 'Reset Value (form)',
				name: 'resetValueButton',
				type: 'button',
				default: '',
				description: 'Điền Default / Reset Value vào ô Value (tiện khi Set lại)',
				displayOptions: {
					show: {
						operation: ['set'],
						valueType: ['number', 'text'],
					},
				},
				typeOptions: {
					buttonConfig: {
						label: 'Reset Value',
						hasInputField: false,
						action: {
							type: 'setParameterValue',
							target: 'value',
							source: 'resetValue',
						},
					},
				},
			},
			{
				displayName: 'Tên field ghi ra',
				name: 'outputField',
				type: 'string',
				default: 'value',
				required: true,
				placeholder: 'value',
				description: 'Tên field trên item output chứa giá trị biến',
			},
			{
				displayName: 'Ghi thêm metadata',
				name: 'includeMeta',
				type: 'boolean',
				default: true,
				description: 'Thêm key, operation, valueType, previousValue vào output',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length > 0 ? items.length : 1;
		const returnData: INodeExecutionData[] = [];

		const operation = this.getNodeParameter('operation', 0) as Operation;
		const key = String(this.getNodeParameter('key', 0, 'counter')).trim();
		const valueType = this.getNodeParameter('valueType', 0, 'number') as ValueType;
		const outputField =
			String(this.getNodeParameter('outputField', 0, 'value')).trim() || 'value';
		const includeMeta = this.getNodeParameter('includeMeta', 0, true) as boolean;

		if (!key) {
			throw new NodeOperationError(this.getNode(), 'Tên biến không được để trống');
		}

		if (operation === 'increment' && valueType !== 'number') {
			throw new NodeOperationError(
				this.getNode(),
				'Increment chỉ dùng với kiểu Number. Đổi Kiểu giá trị sang Number.',
			);
		}

		const staticData = this.getWorkflowStaticData('global');
		const store = getStore(staticData);

		// Resolve once per node run (increment once, not per item).
		const existing = store[key];
		const previousValue = existing?.value;
		let nextValue: unknown;

		let parsedReset: unknown;
		try {
			const rawReset = this.getNodeParameter('resetValue', 0, defaultForType(valueType));
			parsedReset = parseByType(rawReset, valueType);
		} catch {
			parsedReset = defaultForType(valueType);
		}

		try {
			switch (operation) {
				case 'get': {
					nextValue = existing ? existing.value : parsedReset;
					if (!existing) {
						store[key] = { type: valueType, value: nextValue };
					}
					break;
				}
				case 'set': {
					const rawValue =
						valueType === 'object'
							? this.getNodeParameter('valueJson', 0, {})
							: this.getNodeParameter('value', 0, defaultForType(valueType));
					nextValue = parseByType(rawValue, valueType);
					store[key] = { type: valueType, value: nextValue };
					break;
				}
				case 'increment': {
					const step = Number(this.getNodeParameter('step', 0, 1));
					const base =
						existing && typeof existing.value === 'number' && Number.isFinite(existing.value)
							? existing.value
							: (parseByType(parsedReset, 'number') as number);
					nextValue = base + (Number.isFinite(step) ? step : 1);
					store[key] = { type: 'number', value: nextValue };
					break;
				}
				case 'reset': {
					nextValue = parsedReset;
					store[key] = { type: valueType, value: nextValue };
					break;
				}
				default:
					throw new Error(`Unknown operation: ${String(operation)}`);
			}
		} catch (error) {
			throw new NodeOperationError(
				this.getNode(),
				error instanceof Error ? error.message : String(error),
			);
		}

		for (let i = 0; i < length; i++) {
			const incoming = (items[i]?.json ?? {}) as IDataObject;
			const out: IDataObject = { ...incoming };
			out[outputField] = nextValue as IDataObject[string];
			if (includeMeta) {
				out.key = key;
				out.operation = operation;
				out.valueType = valueType;
				out.previousValue = (previousValue ?? null) as IDataObject[string];
			}
			returnData.push({ json: out, pairedItem: { item: i } });
		}

		return [returnData];
	}
}
