import type { INodeProperties } from 'n8n-workflow';

import { FILE_COMMAND_DEFINITIONS } from './fileCommandRegistry';
import { buildExcelStyleCollectionField } from './fileExcelStyle';

const showFor = (...ops: string[]) => ({
	show: { operation: ops },
});

const PATH_OPS = FILE_COMMAND_DEFINITIONS.filter((d) =>
	[
		'pathOnly',
		'pathEncoding',
		'writeText',
		'appendText',
		'writeBytes',
		'deleteDirectory',
		'listDirectory',
		'openFile',
	].includes(d.params),
).map((d) => d.operation);

const COPY_OPS = ['copyFile', 'moveFile'];
const TEXT_WRITE_OPS = ['writeAllText', 'appendAllText'];
const EXCEL_WRITE = ['writeExcel'];
const EXCEL_READ = ['readExcel'];
const EXCEL_SHEET_OPS = ['deleteExcelSheet', 'clearExcelRange', 'deleteExcelEmptyRows'];
const EXCEL_PATH_OPS = [...EXCEL_WRITE, ...EXCEL_READ, ...EXCEL_SHEET_OPS];

const excelWriteModeShow = (modes: string[]) => ({
	show: {
		operation: EXCEL_WRITE,
		excelWriteMode: modes,
	},
});

/** UI fields cho command shortcuts + Excel (style = Add option collection). */
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
			displayName: 'Application Path',
			name: 'applicationPath',
			type: 'string',
			default: '',
			placeholder: 'Để trống = app mặc định Windows',
			description:
				'Tùy chọn. Ép mở bằng app cụ thể. Trống: .txt/.json → Notepad; .xlsx → Excel association.',
			displayOptions: showFor('openFile'),
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
				'Table: Headers + Data (hoặc Input Items). Style: bấm Add option chọn fontName, fontSize, border… — chỉ gửi option đã thêm. Nhiều node cùng file: node đầu overwrite=true, node sau =false. Chỉ .xlsx.',
			displayOptions: showFor(...EXCEL_PATH_OPS),
		},
		{
			displayName: 'Excel Path',
			name: 'excelPath',
			type: 'string',
			default: '',
			required: true,
			placeholder: 'exports\\doanh-so.xlsx',
			description: 'Path .xlsx trong root (bắt buộc đuôi .xlsx).',
			displayOptions: showFor(...EXCEL_PATH_OPS),
		},
		{
			displayName: 'Write Mode',
			name: 'excelWriteMode',
			type: 'options',
			noDataExpression: true,
			options: [
				{ name: 'Table (khuyến nghị)', value: 'table', description: 'Header + rows' },
				{ name: 'Cells', value: 'cells', description: 'Ghi từng ô A1, B1…' },
				{ name: 'Range', value: 'range', description: 'Khối 2D từ ô bắt đầu' },
				{ name: 'Style Only', value: 'style', description: 'Chỉ tô style vùng/ô' },
				{ name: 'Sheet Style', value: 'sheetStyle', description: 'Style mặc định cả sheet' },
				{ name: 'Batch (operationsJson)', value: 'batch', description: 'Nhiều sheet/ops' },
			],
			default: 'table',
			description: 'Chế độ WriteExcel.',
			displayOptions: showFor(...EXCEL_WRITE),
		},
		{
			displayName: 'Sheet Name',
			name: 'sheetName',
			type: 'string',
			default: 'Sheet1',
			placeholder: 'DoanhSo',
			description: 'Tên sheet (≤ 31). Read/Clear/Delete Empty: trống = sheet đầu.',
			displayOptions: showFor(...EXCEL_WRITE, ...EXCEL_READ, 'clearExcelRange', 'deleteExcelEmptyRows'),
		},
		{
			displayName: 'Sheet Name',
			name: 'sheetName',
			type: 'string',
			default: 'Sheet1',
			required: true,
			placeholder: 'Sheet2',
			description: 'Tên sheet cần xóa (workbook phải còn ≥ 1 sheet).',
			displayOptions: showFor('deleteExcelSheet'),
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
				{ name: 'JSON (Data JSON field)', value: 'json' },
				{ name: 'Input Items (auto)', value: 'inputItems' },
			],
			default: 'json',
			description: 'Input Items: mỗi item.json = 1 dòng (bỏ field kết nối).',
			displayOptions: excelWriteModeShow(['table']),
		},
		{
			displayName: 'Headers JSON',
			name: 'headersJson',
			type: 'string',
			typeOptions: { rows: 2 },
			default: '["Mã","Tên","Tiền"]',
			placeholder: '["Mã","Tên","Tiền"] hoặc {"code":"Mã"}',
			description: 'Tùy chọn. Mảng tên cột hoặc map field→header.',
			displayOptions: excelWriteModeShow(['table']),
		},
		{
			displayName: 'Data JSON',
			name: 'dataJson',
			type: 'string',
			typeOptions: { rows: 6 },
			default: '[["KH001","An",100],["KH002","Bình",200]]',
			placeholder: '[[...]] hoặc [{"code":"..."}]',
			description: 'Table / range data. Ẩn khi Data Source = Input Items.',
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
			default: '{"A1":"Tiêu đề","B1":123}',
			description: 'Map ô → giá trị. Scalar hoặc {value, style}.',
			displayOptions: excelWriteModeShow(['cells']),
		},
		{
			displayName: 'Range',
			name: 'excelRange',
			type: 'string',
			default: 'A1',
			placeholder: 'A1 hoặc A2:C10',
			description: 'Range ghi data / áp style. Chỉ lấy ô bắt đầu làm góc khi type=range.',
			displayOptions: excelWriteModeShow(['range', 'style']),
		},
		{
			displayName: 'Range',
			name: 'excelRange',
			type: 'string',
			default: '',
			placeholder: 'A1:C100 hoặc * / used / all (trống = used range)',
			description: 'Vùng cần clear. Trống / * / used / all = toàn Dimension.',
			displayOptions: showFor('clearExcelRange'),
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
			displayName: 'Operations JSON (Batch)',
			name: 'operationsJson',
			type: 'string',
			typeOptions: { rows: 10 },
			default:
				'[{"sheetName":"DoanhSo","type":"table","startCell":"A1","headers":["Mã","Tên","Tiền"],"data":[["KH001","An",100]],"headerStyle":{"bold":true,"fillColor":"#4472C4","color":"#FFFFFF"},"style":{"border":"thin"}}]',
			description: 'Mảng operation tuần tự. Thứ tự: sheetStyle → data → style.',
			displayOptions: excelWriteModeShow(['batch']),
		},
		{
			displayName: 'Overwrite File',
			name: 'excelOverwrite',
			type: 'boolean',
			default: true,
			description:
				'table/batch + true = workbook mới. Node tiếp theo cùng file: đặt false. cells/range/style: mở cập nhật (không xóa cả file).',
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

		// Style collections — Add option
		buildExcelStyleCollectionField(
			'Header Style',
			'headerStyleOptions',
			'Bấm Add option để chọn fontName, fontSize, bold, fillColor, border… Chỉ option đã thêm mới áp vào hàng header.',
			excelWriteModeShow(['table']),
		),
		buildExcelStyleCollectionField(
			'Body Style',
			'bodyStyleOptions',
			'Style cả khối bảng (áp trước, headerStyle ghi đè hàng header). Add option từng thuộc tính cần dùng.',
			excelWriteModeShow(['table']),
		),
		buildExcelStyleCollectionField(
			'Style',
			'styleOptions',
			'Add option: Font Name, Font Size, Border, Border Color, Fill Color… Chỉ gửi các option đã thêm.',
			excelWriteModeShow(['cells', 'range', 'style', 'sheetStyle']),
		),

		{
			displayName: 'Has Header',
			name: 'excelHasHeader',
			type: 'boolean',
			default: true,
			description: 'true → object[] theo header; false → matrix.',
			displayOptions: showFor(...EXCEL_READ),
		},
		{
			displayName: 'Clear Formats',
			name: 'excelClearFormats',
			type: 'boolean',
			default: false,
			description: 'true = xóa luôn style ô khi Clear Range.',
			displayOptions: showFor('clearExcelRange'),
		},
		{
			displayName: 'Keep Header Row',
			name: 'excelKeepHeaderRow',
			type: 'boolean',
			default: true,
			description: 'true = không xóa hàng đầu Dimension khi Delete Empty Rows.',
			displayOptions: showFor('deleteExcelEmptyRows'),
		},
	];
}
