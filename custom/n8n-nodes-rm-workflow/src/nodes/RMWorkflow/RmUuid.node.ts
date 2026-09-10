import { randomUUID } from 'node:crypto';
import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

function formatUuid(raw: string, format: string): string {
	const lower = raw.toLowerCase();
	switch (format) {
		case 'noDashes':
			return lower.replace(/-/g, '');
		case 'braces':
			return `{${lower}}`;
		case 'upper':
			return lower.toUpperCase();
		case 'upperNoDashes':
			return lower.replace(/-/g, '').toUpperCase();
		default:
			return lower;
	}
}

/**
 * RM UUID — tạo mã khóa ngẫu nhiên (UUID/GUID) cho người dùng không cần hiểu kỹ thuật.
 * Thường dùng làm sessionId cho các node RM tiếp theo.
 */
export class RmUuid implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM UUID',
		name: 'rmUuid',
		icon: { light: 'file:icon.svg', dark: 'file:icon.dark.svg' },
		iconColor: 'pink-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["outputField"]}}',
		description:
			'Generate a random key (Session ID) for the workflow — no need to know UUID/GUID',
		defaults: {
			name: 'RM UUID',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RM', 'UUID', 'GUID', 'Session', 'Random', 'Key', 'mã khóa'],
		},
		properties: [
			{
				displayName: 'Tips',
				name: 'tips',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'Mỗi lần chạy node sẽ tạo một mã khóa mới (chuỗi dạng xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx). Dùng làm Session ID cho RM SAP / Web / File / Outlook. Bạn không cần nhớ hay gõ tay — chỉ cần Execute.',
			},
			{
				displayName: 'Tên field ghi ra',
				name: 'outputField',
				type: 'string',
				default: 'sessionId',
				required: true,
				placeholder: 'sessionId',
				description:
					'Tên field trong JSON output. Mặc định sessionId — các node RM khác sẽ đọc field này.',
			},
			{
				displayName: 'Ghi thêm field uuid',
				name: 'alsoWriteUuid',
				type: 'boolean',
				default: true,
				description: 'Ngoài field trên, ghi thêm uuid với cùng giá trị (tiện dùng biểu thức).',
			},
			{
				displayName: 'Định dạng',
				name: 'format',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Chuẩn (có dấu gạch)',
						value: 'standard',
						description: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
					},
					{
						name: 'Chữ hoa',
						value: 'upper',
						description: 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX',
					},
					{
						name: 'Không dấu gạch',
						value: 'noDashes',
						description: '32 ký tự liền',
					},
					{
						name: 'Chữ hoa, không dấu gạch',
						value: 'upperNoDashes',
						description: '32 ký tự hoa liền',
					},
					{
						name: 'Trong ngoặc nhọn',
						value: 'braces',
						description: '{xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx}',
					},
				],
				default: 'standard',
			},
			{
				displayName: 'Mỗi item một mã',
				name: 'perItem',
				type: 'boolean',
				default: true,
				description:
					'true = mỗi dòng input nhận mã riêng. false = mọi dòng dùng chung một mã (một lần chạy).',
			},
			{
				displayName: 'Ghi đè nếu đã có',
				name: 'overwrite',
				type: 'boolean',
				default: true,
				description:
					'true = luôn tạo mã mới. false = giữ nguyên nếu field đã có giá trị trên input.',
			},
			{
				displayName: 'Xem trước / tạo thử',
				name: 'previewUuid',
				type: 'string',
				default: '',
				placeholder: 'Bấm nút bên dưới để xem một mã mẫu',
				description: 'Chỉ để xem thử trên form — giá trị Execute mới ghi vào output workflow.',
			},
			{
				displayName: 'Tạo mã mẫu',
				name: 'randomPreview',
				type: 'button',
				default: '',
				description: 'Điền một mã ngẫu nhiên vào ô xem trước (không ảnh hưởng Execute)',
				typeOptions: {
					buttonConfig: {
						label: 'Tạo mã mẫu',
						hasInputField: false,
						action: {
							type: 'generateUuid',
							target: 'previewUuid',
						},
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length > 0 ? items.length : 1;
		const returnData: INodeExecutionData[] = [];

		const outputField = String(this.getNodeParameter('outputField', 0, 'sessionId')).trim() || 'sessionId';
		const alsoWriteUuid = this.getNodeParameter('alsoWriteUuid', 0, true) as boolean;
		const format = this.getNodeParameter('format', 0, 'standard') as string;
		const perItem = this.getNodeParameter('perItem', 0, true) as boolean;
		const overwrite = this.getNodeParameter('overwrite', 0, true) as boolean;

		let sharedKey: string | undefined;

		for (let i = 0; i < length; i++) {
			const incoming = (items[i]?.json ?? {}) as IDataObject;
			const existing = incoming[outputField];
			const hasExisting =
				existing !== undefined && existing !== null && String(existing).trim() !== '';

			let key: string;
			if (!overwrite && hasExisting) {
				key = String(existing).trim();
			} else if (!perItem) {
				if (!sharedKey) sharedKey = formatUuid(randomUUID(), format);
				key = sharedKey;
			} else {
				key = formatUuid(randomUUID(), format);
			}

			const out: IDataObject = {
				...incoming,
				[outputField]: key,
			};
			if (alsoWriteUuid) {
				out.uuid = key;
			}

			returnData.push({ json: out, pairedItem: { item: i } });
		}

		return [returnData];
	}
}
