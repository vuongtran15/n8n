import type { INodeProperties } from 'n8n-workflow';

import { FILE_COMMAND_DEFINITIONS } from './fileCommandRegistry';

const FILE_OPS = FILE_COMMAND_DEFINITIONS.map((d) => d.operation);

const showFor = (...ops: string[]) => ({
	show: { operation: ops },
});

const PATH_OPS = FILE_COMMAND_DEFINITIONS.filter((d) =>
	['pathOnly', 'pathEncoding', 'writeText', 'appendText', 'writeBytes', 'deleteDirectory', 'listDirectory'].includes(
		d.params,
	),
).map((d) => d.operation);

const COPY_OPS = ['copyFile', 'moveFile'];
const TEXT_WRITE_OPS = ['writeAllText', 'appendAllText'];
const EXCEL_WRITE = ['writeExcel'];
const EXCEL_READ = ['readExcel'];
const EXCEL_ALL = [...EXCEL_WRITE, ...EXCEL_READ];

const excelWriteModeShow = (modes: string[]) => ({
	show: {
		operation: EXCEL_WRITE,
		excelWriteMode: modes,
	},
});

/** UI fields cho command shortcuts + Excel UX. */
export function getFileCommandShortcutProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Path',
			name: 'relativeOrAbsolutePath',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'exports\\report.xlsx hoặc out\\note.txt',
			description:
				'Path tương đối (nối root) hoặc tuyệt đối nhưng phải nằm trong rootDirectory của Connect.',
			displayOptions: showFor(...PATH_OPS),
		},
		{
			displayName: 'Encoding',
			name: 'encoding',
			type: 'string',
			default: 'utf-8',
			placeholder: 'utf-8',
			description: 'Tên encoding (mặc định utf-8).',
			displayOptions: showFor('readAllText', 'writeAllText', 'appendAllText'),
		},
		{
			displayName: 'Content',
			name: 'fileContent',
			type: 'string',
			typeOptions: { rows: 5 },
			default: '',
			required: true,
			description: 'Nội dung text để ghi / nối.',
			displayOptions: showFor(...TEXT_WRITE_OPS),
		},
		{
			displayName: 'Create Parent Directories',
			name: 'createParentDirectories',
			type: 'boolean',
			default: true,
			description: 'Tự tạo thư mục cha nếu thiếu.',
			displayOptions: showFor('writeAllText', 'writeAllBytes'),
		},
		{
			displayName: 'Bytes (Base64)',
			name: 'bytesBase64',
			type: 'string',
			typeOptions: { rows: 3 },
			default: '',
			required: true,
			placeholder: 'AQIDBA==',
			description: 'Nội dung binary dạng Base64.',
			displayOptions: showFor('writeAllBytes'),
		},
		{
			displayName: 'Recursive',
			name: 'recursiveDelete',
			type: 'boolean',
			default: true,
			description: 'true = xóa cả cây; false = chỉ thư mục rỗng.',
			displayOptions: showFor('deleteDirectory'),
		},
		{
			displayName: 'Source Path',
			name: 'sourceRelativeOrAbsolute',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'in\\a.txt',
			description: 'Path nguồn trong root.',
			displayOptions: showFor(...COPY_OPS),
		},
		{
			displayName: 'Destination Path',
			name: 'destinationRelativeOrAbsolute',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'out\\a.txt',
			description: 'Path đích trong root.',
			displayOptions: showFor(...COPY_OPS),
		},
		{
			displayName: 'Overwrite',
			name: 'overwrite',
			type: 'boolean',
			default: false,
			description: 'Đích đã tồn tại + false → lỗi.',
			displayOptions: showFor(...COPY_OPS, 'downloadFromUrl'),
		},
		{
			displayName: 'Search Pattern',
			name: 'searchPattern',
			type: 'string',
			default: '*',
			placeholder: '*.xlsx',
			description: 'Lọc file (1 cấp). Thư mục luôn liệt kê đủ.',
			displayOptions: showFor('listDirectory'),
		},
		{
			displayName: 'URL',
			name: 'downloadUrl',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'https://example.com/a.pdf',
			description: 'URL http/https cần tải.',
			displayOptions: showFor('downloadFromUrl'),
		},
		{
			displayName: 'Destination Folder',
			name: 'destinationFolderRelativeOrAbsolute',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'downloads',
			description: 'Thư mục đích trong root.',
			displayOptions: showFor('downloadFromUrl'),
		},
		{
			displayName: 'File Name',
			name: 'downloadFileName',
			type: 'string',
			default: '',
			placeholder: 'Để trống = Content-Disposition / URL',
			description: 'Tên file lưu; trống = suy từ response/URL.',
			displayOptions: showFor('downloadFromUrl'),
		},
		{
			displayName: 'Timeout (Seconds)',
			name: 'downloadTimeoutSeconds',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 300,
			description: 'Timeout tải (giây). Mặc định 300.',
			displayOptions: showFor('downloadFromUrl'),
		},

		// ——— Excel ———
		{
			displayName: 'Excel Tips',
			name: 'excelTips',
			type: 'notice',
			default: '',
			typeOptions: { theme: 'info' },
			description:
				'Khuyến nghị: Write Mode = Table. Headers JSON + Data JSON (hoặc Data Source = Input Items). Style header xanh/trắng mặc định. Batch = nhiều sheet/ops qua Operations JSON. Chỉ .xlsx.',
			displayOptions: showFor(...EXCEL_ALL),
		},
		{
			displayName: 'Excel Path',
			name: 'excelPath',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'exports\\doanh-so.xlsx',
			description: 'Path .xlsx trong root (bắt buộc đuôi .xlsx).',
			displayOptions: showFor(...EXCEL_ALL),
		},
		{
			displayName: 'Write Mode',
			name: 'excelWriteMode',
			type: 'options',
			noDataExpression: true,
			options: [
				{
					name: 'Table (khuyến nghị)',
					value: 'table',
					description: 'Header + rows — dễ nhất cho báo cáo',
				},
				{
					name: 'Cells',
					value: 'cells',
					description: 'Ghi từng ô A1, B1…',
				},
				{
					name: 'Range',
					value: 'range',
					description: 'Khối 2D từ ô bắt đầu',
				},
				{
					name: 'Style Only',
					value: 'style',
					description: 'Chỉ tô style vùng/ô (không ghi data)',
				},
				{
					name: 'Sheet Style',
					value: 'sheetStyle',
					description: 'Style mặc định cả sheet — gọi trước khi ghi data',
				},
				{
					name: 'Batch (operationsJson)',
					value: 'batch',
					description: 'Nhiều sheet / nhiều type trong một lần ghi',
				},
			],
			default: 'table',
			description: 'Chế độ WriteExcel. Table = UX đơn giản nhất.',
			displayOptions: showFor(...EXCEL_WRITE),
		},
		{
			displayName: 'Sheet Name',
			name: 'sheetName',
			type: 'string',
			default: 'Sheet1',
			placeholder: 'DoanhSo',
			description: 'Tên sheet (≤ 31 ký tự). Read: trống = sheet đầu.',
			displayOptions: {
				show: {
					operation: [...EXCEL_WRITE, ...EXCEL_READ],
					excelWriteMode: ['table', 'cells', 'range', 'style', 'sheetStyle'],
				},
			},
		},
		{
			displayName: 'Start Cell',
			name: 'startCell',
			type: 'string',
			default: 'A1',
			placeholder: 'A1',
			description: 'Góc trên-trái của bảng (header).',
			displayOptions: excelWriteModeShow(['table']),
		},
		{
			displayName: 'Data Source',
			name: 'excelDataSource',
			type: 'options',
			options: [
				{
					name: 'JSON (Data JSON field)',
					value: 'json',
					description: 'Dán / map JSON vào Data JSON',
				},
				{
					name: 'Input Items (auto)',
					value: 'inputItems',
					description: 'Lấy mọi item input → rows (bỏ field kết nối)',
				},
			],
			default: 'json',
			description:
				'Input Items: mỗi item.json = 1 dòng. Có Headers JSON dạng mảng tên field → xếp cột theo thứ tự header.',
			displayOptions: excelWriteModeShow(['table']),
		},
		{
			displayName: 'Headers JSON',
			name: 'headersJson',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '["Mã","Tên","Tiền"]',
			placeholder: '["Mã","Tên","Tiền"] hoặc {"code":"Mã","name":"Tên"}',
			description:
				'Tùy chọn. Mảng tên cột, hoặc object map field→chữ header. Để trống + object rows → key làm header.',
			displayOptions: excelWriteModeShow(['table']),
		},
		{
			displayName: 'Data JSON',
			name: 'dataJson',
			type: 'string',
			typeOptions: { rows: 6 },
			default: '[["KH001","An",100],["KH002","Bình",200]]',
			placeholder: '[[...]] hoặc [{"code":"..."}]',
			description:
				'Table: mảng dòng hoặc object[]. Range: mảng 2D. Ẩn khi Data Source = Input Items.',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table', 'range'],
				},
				hide: {
					excelDataSource: ['inputItems'],
				},
			},
		},
		{
			displayName: 'Cells JSON',
			name: 'cellsJson',
			type: 'string',
			typeOptions: { rows: 5 },
			default: '{"A1":"Tiêu đề","B1":123,"C1":{"value":"OK","style":{"bold":true}}}',
			description:
				'Map ô → giá trị. Scalar hoặc {value, style}. File đã có → mở cập nhật (không xóa sheet khác).',
			displayOptions: excelWriteModeShow(['cells']),
		},
		{
			displayName: 'Range',
			name: 'excelRange',
			type: 'string',
			default: 'A1',
			placeholder: 'A1 hoặc A2:C10',
			description: 'Range: chỉ lấy ô bắt đầu làm góc (range) hoặc vùng style.',
			displayOptions: excelWriteModeShow(['range', 'style']),
		},
		{
			displayName: 'Style Cells JSON',
			name: 'styleCellsJson',
			type: 'string',
			default: '',
			placeholder: '["E1","E2"]',
			description: 'Tùy chọn thay Range: danh sách ô cần style.',
			displayOptions: excelWriteModeShow(['style']),
		},
		{
			displayName: 'Style JSON',
			name: 'styleJson',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '{"border":"thin"}',
			placeholder: '{"fontName":"Arial","fontSize":11,"fillColor":"#FFF2CC"}',
			description:
				'Object style: fontName, fontSize, bold, color, fillColor, border, borderColor, horizontalAlignment, wrapText, rowHeight, columnWidth…',
			displayOptions: excelWriteModeShow(['cells', 'range', 'style', 'sheetStyle']),
		},
		{
			displayName: 'Operations JSON (Batch)',
			name: 'operationsJson',
			type: 'string',
			typeOptions: { rows: 10 },
			default:
				'[{"sheetName":"DoanhSo","type":"table","startCell":"A1","headers":["Mã","Tên","Tiền"],"data":[["KH001","An",100]],"headerStyle":{"bold":true,"fillColor":"#4472C4","color":"#FFFFFF"},"style":{"border":"thin"}}]',
			description:
				'Mảng operation chạy tuần tự. Thứ tự: sheetStyle → table/range/cells → style. Mỗi phần tử: sheetName, type, headers/data/cells/style…',
			displayOptions: excelWriteModeShow(['batch']),
		},
		{
			displayName: 'Overwrite File',
			name: 'excelOverwrite',
			type: 'boolean',
			default: true,
			description:
				'table + true = workbook mới. batch + true = xóa file cũ rồi ghi. cells/range: mở nếu có / tạo nếu không.',
			displayOptions: showFor(...EXCEL_WRITE),
		},
		{
			displayName: 'Create Parent Directories',
			name: 'excelCreateParentDirectories',
			type: 'boolean',
			default: true,
			description: 'Tạo thư mục cha của file Excel nếu thiếu.',
			displayOptions: showFor(...EXCEL_WRITE),
		},

		// Table style presets (friendly)
		{
			displayName: 'Use Header Style Preset',
			name: 'excelUseHeaderStyle',
			type: 'boolean',
			default: true,
			description: 'Áp style hàng header (mặc định xanh đậm + chữ trắng + đậm).',
			displayOptions: excelWriteModeShow(['table']),
		},
		{
			displayName: 'Header Fill Color',
			name: 'headerFillColor',
			type: 'color',
			default: '#4472C4',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseHeaderStyle: [true],
				},
			},
		},
		{
			displayName: 'Header Font Color',
			name: 'headerFontColor',
			type: 'color',
			default: '#FFFFFF',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseHeaderStyle: [true],
				},
			},
		},
		{
			displayName: 'Header Border',
			name: 'headerBorder',
			type: 'options',
			options: [
				{ name: 'Thin', value: 'thin' },
				{ name: 'Medium', value: 'medium' },
				{ name: 'Thick', value: 'thick' },
				{ name: 'None', value: 'none' },
			],
			default: 'thin',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseHeaderStyle: [true],
				},
			},
		},
		{
			displayName: 'Header Border Color',
			name: 'headerBorderColor',
			type: 'color',
			default: '#1F4E79',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseHeaderStyle: [true],
				},
			},
		},
		{
			displayName: 'Header Align',
			name: 'headerAlign',
			type: 'options',
			options: [
				{ name: 'Center', value: 'center' },
				{ name: 'Left', value: 'left' },
				{ name: 'Right', value: 'right' },
			],
			default: 'center',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseHeaderStyle: [true],
				},
			},
		},
		{
			displayName: 'Header Font Size',
			name: 'headerFontSize',
			type: 'number',
			default: 11,
			typeOptions: { minValue: 6 },
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseHeaderStyle: [true],
				},
			},
		},
		{
			displayName: 'Use Body Style Preset',
			name: 'excelUseBodyStyle',
			type: 'boolean',
			default: true,
			description: 'Áp style cả khối bảng (gồm header trước, rồi headerStyle ghi đè).',
			displayOptions: excelWriteModeShow(['table']),
		},
		{
			displayName: 'Body Border',
			name: 'bodyBorder',
			type: 'options',
			options: [
				{ name: 'Thin', value: 'thin' },
				{ name: 'Medium', value: 'medium' },
				{ name: 'None', value: 'none' },
			],
			default: 'thin',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseBodyStyle: [true],
				},
			},
		},
		{
			displayName: 'Body Border Color',
			name: 'bodyBorderColor',
			type: 'color',
			default: '#000000',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseBodyStyle: [true],
				},
			},
		},
		{
			displayName: 'Body Font Name',
			name: 'bodyFontName',
			type: 'string',
			default: '',
			placeholder: 'Arial',
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseBodyStyle: [true],
				},
			},
		},
		{
			displayName: 'Body Font Size',
			name: 'bodyFontSize',
			type: 'number',
			default: 11,
			typeOptions: { minValue: 6 },
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseBodyStyle: [true],
				},
			},
		},
		{
			displayName: 'Wrap Text',
			name: 'bodyWrapText',
			type: 'boolean',
			default: false,
			displayOptions: {
				show: {
					operation: EXCEL_WRITE,
					excelWriteMode: ['table'],
					excelUseBodyStyle: [true],
				},
			},
		},

		// Read Excel
		{
			displayName: 'Has Header',
			name: 'excelHasHeader',
			type: 'boolean',
			default: true,
			description: 'true → Result.Content = object[] theo header; false → matrix.',
			displayOptions: showFor(...EXCEL_READ),
		},
	].map((p) => {
		// Fix sheetName display for readExcel (no excelWriteMode)
		if (p.name === 'sheetName') {
			return {
				...p,
				displayOptions: {
					show: {
						operation: FILE_OPS.filter((op) => EXCEL_ALL.includes(op)),
					},
				},
			};
		}
		return p;
	}) as INodeProperties[];
}
