import type { IDataObject, IExecuteFunctions, INodeProperties } from 'n8n-workflow';

const BORDER_OPTIONS = [
	{ name: 'Thin', value: 'thin' },
	{ name: 'Medium', value: 'medium' },
	{ name: 'Thick', value: 'thick' },
	{ name: 'Hair', value: 'hair' },
	{ name: 'Dotted', value: 'dotted' },
	{ name: 'Dashed', value: 'dashed' },
	{ name: 'Double', value: 'double' },
	{ name: 'None', value: 'none' },
];

const HALIGN_OPTIONS = [
	{ name: 'Left', value: 'left' },
	{ name: 'Center', value: 'center' },
	{ name: 'Right', value: 'right' },
	{ name: 'Justify', value: 'justify' },
];

const VALIGN_OPTIONS = [
	{ name: 'Top', value: 'top' },
	{ name: 'Center', value: 'center' },
	{ name: 'Bottom', value: 'bottom' },
];

/** Các option style — user bấm Add option để chọn từng cái cần. */
export function getExcelStyleCollectionOptions(): INodeProperties[] {
	return [
		{
			displayName: 'Font Name',
			name: 'fontName',
			type: 'string',
			default: 'Arial',
			placeholder: 'Arial',
			description: 'Tên font (fontName)',
		},
		{
			displayName: 'Font Size',
			name: 'fontSize',
			type: 'number',
			default: 11,
			typeOptions: { minValue: 1 },
			description: 'Cỡ chữ (fontSize)',
		},
		{
			displayName: 'Bold',
			name: 'bold',
			type: 'boolean',
			default: true,
			description: 'Chữ đậm',
		},
		{
			displayName: 'Italic',
			name: 'italic',
			type: 'boolean',
			default: true,
			description: 'Chữ nghiêng',
		},
		{
			displayName: 'Underline',
			name: 'underline',
			type: 'boolean',
			default: true,
			description: 'Gạch chân',
		},
		{
			displayName: 'Font Color',
			name: 'color',
			type: 'color',
			default: '#000000',
			description: 'Màu chữ (color)',
		},
		{
			displayName: 'Fill Color',
			name: 'fillColor',
			type: 'color',
			default: '#4472C4',
			description: 'Màu nền ô (fillColor)',
		},
		{
			displayName: 'Border',
			name: 'border',
			type: 'options',
			options: BORDER_OPTIONS,
			default: 'thin',
			description: 'Kiểu viền 4 cạnh (border)',
		},
		{
			displayName: 'Border Color',
			name: 'borderColor',
			type: 'color',
			default: '#000000',
			description: 'Màu viền (borderColor)',
		},
		{
			displayName: 'Horizontal Align',
			name: 'horizontalAlignment',
			type: 'options',
			options: HALIGN_OPTIONS,
			default: 'center',
			description: 'Căn ngang',
		},
		{
			displayName: 'Vertical Align',
			name: 'verticalAlignment',
			type: 'options',
			options: VALIGN_OPTIONS,
			default: 'center',
			description: 'Căn dọc',
		},
		{
			displayName: 'Wrap Text',
			name: 'wrapText',
			type: 'boolean',
			default: true,
			description: 'Xuống dòng trong ô',
		},
		{
			displayName: 'Row Height',
			name: 'rowHeight',
			type: 'number',
			default: 22,
			typeOptions: { minValue: 1 },
			description: 'Chiều cao dòng (điểm)',
		},
		{
			displayName: 'Column Width',
			name: 'columnWidth',
			type: 'number',
			default: 15,
			typeOptions: { minValue: 1 },
			description: 'Độ rộng cột',
		},
	];
}

/**
 * Collection "Add option" cho style Excel.
 * Chỉ các option user đã thêm mới có trong object → gửi lên API.
 */
export function buildExcelStyleCollectionField(
	displayName: string,
	name: string,
	description: string,
	displayOptions: INodeProperties['displayOptions'],
): INodeProperties {
	return {
		displayName,
		name,
		type: 'collection',
		placeholder: 'Add option',
		default: {},
		description,
		displayOptions,
		options: getExcelStyleCollectionOptions(),
	};
}

/** Đọc collection style → object API (chỉ key đã Add). */
export function styleObjectFromCollection(raw: unknown): Record<string, unknown> | undefined {
	if (raw === undefined || raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
		return undefined;
	}
	const src = raw as IDataObject;
	const style: Record<string, unknown> = {};

	for (const [key, value] of Object.entries(src)) {
		if (value === undefined || value === null) continue;
		if (typeof value === 'string' && value.trim() === '') continue;
		style[key] = value;
	}

	return Object.keys(style).length > 0 ? style : undefined;
}

export function readStyleCollection(
	ctx: IExecuteFunctions,
	itemIndex: number,
	paramName: string,
): Record<string, unknown> | undefined {
	const raw = ctx.getNodeParameter(paramName, itemIndex, {}) as IDataObject;
	return styleObjectFromCollection(raw);
}
