/** Cách build paramObject cho POST /file-auto/command */
export type FileCommandParamKind =
	| 'pathOnly'
	| 'pathEncoding'
	| 'writeText'
	| 'appendText'
	| 'writeBytes'
	| 'deleteDirectory'
	| 'copyMove'
	| 'listDirectory'
	| 'downloadFromUrl'
	| 'openFile'
	| 'writeExcel'
	| 'readExcel'
	| 'deleteExcelSheet'
	| 'clearExcelRange'
	| 'deleteExcelEmptyRows';

export interface FileCommandDefinition {
	operation: string;
	function: string;
	displayName: string;
	description: string;
	action: string;
	params: FileCommandParamKind;
	/** Nhóm hiển thị trong Operation list (description prefix). */
	group: 'check' | 'read' | 'write' | 'delete' | 'copy' | 'list' | 'network' | 'util' | 'excel';
}

/** Một nguồn operation → FileAccessManager function (HTTP reflection). */
export const FILE_COMMAND_DEFINITIONS: FileCommandDefinition[] = [
	{
		operation: 'fileExists',
		function: 'FileExists',
		displayName: 'File Exists',
		description: 'Kiểm tra file có tồn tại trong root? Result = true/false.',
		action: 'Check file exists',
		params: 'pathOnly',
		group: 'check',
	},
	{
		operation: 'directoryExists',
		function: 'DirectoryExists',
		displayName: 'Directory Exists',
		description: 'Kiểm tra thư mục có tồn tại trong root? Result = true/false.',
		action: 'Check directory exists',
		params: 'pathOnly',
		group: 'check',
	},
	{
		operation: 'ensureDirectory',
		function: 'EnsureDirectory',
		displayName: 'Ensure Directory',
		description: 'Tạo thư mục (cả cây nếu thiếu) trong root.',
		action: 'Ensure directory',
		params: 'pathOnly',
		group: 'check',
	},
	{
		operation: 'listDirectory',
		function: 'ListDirectory',
		displayName: 'List Directory',
		description: 'Liệt kê 1 cấp: Result.Files / Result.Directories (full path). searchPattern chỉ lọc file.',
		action: 'List directory',
		params: 'listDirectory',
		group: 'list',
	},
	{
		operation: 'readAllText',
		function: 'ReadAllText',
		displayName: 'Read All Text',
		description: 'Đọc file text. Result.Content = nội dung. Encoding mặc định utf-8.',
		action: 'Read text file',
		params: 'pathEncoding',
		group: 'read',
	},
	{
		operation: 'readAllBytes',
		function: 'ReadAllBytes',
		displayName: 'Read All Bytes',
		description: 'Đọc file binary. Result.Data = Base64 trong JSON.',
		action: 'Read binary file',
		params: 'pathOnly',
		group: 'read',
	},
	{
		operation: 'writeAllText',
		function: 'WriteAllText',
		displayName: 'Write All Text',
		description: 'Ghi/đè file text. createParentDirectories mặc định true.',
		action: 'Write text file',
		params: 'writeText',
		group: 'write',
	},
	{
		operation: 'appendAllText',
		function: 'AppendAllText',
		displayName: 'Append All Text',
		description: 'Nối text cuối file (tạo file nếu chưa có).',
		action: 'Append text file',
		params: 'appendText',
		group: 'write',
	},
	{
		operation: 'writeAllBytes',
		function: 'WriteAllBytes',
		displayName: 'Write All Bytes',
		description: 'Ghi/đè file binary. bytes = Base64 string.',
		action: 'Write binary file',
		params: 'writeBytes',
		group: 'write',
	},
	{
		operation: 'deleteFile',
		function: 'DeleteFile',
		displayName: 'Delete File',
		description: 'Xóa một file trong root.',
		action: 'Delete file',
		params: 'pathOnly',
		group: 'delete',
	},
	{
		operation: 'deleteDirectory',
		function: 'DeleteDirectory',
		displayName: 'Delete Directory',
		description: 'Xóa thư mục. recursive=true xóa cả cây; false chỉ thư mục rỗng.',
		action: 'Delete directory',
		params: 'deleteDirectory',
		group: 'delete',
	},
	{
		operation: 'copyFile',
		function: 'CopyFile',
		displayName: 'Copy File',
		description: 'Copy file trong root. overwrite mặc định false.',
		action: 'Copy file',
		params: 'copyMove',
		group: 'copy',
	},
	{
		operation: 'moveFile',
		function: 'MoveFile',
		displayName: 'Move File',
		description: 'Di chuyển / đổi tên file trong root. overwrite mặc định false.',
		action: 'Move file',
		params: 'copyMove',
		group: 'copy',
	},
	{
		operation: 'openFile',
		function: 'OpenFile',
		displayName: 'Open File',
		description:
			'Mở file trên máy worker bằng app mặc định Windows (txt→Notepad, xlsx→Excel…). Tùy chọn applicationPath.',
		action: 'Open file on worker',
		params: 'openFile',
		group: 'util',
	},
	{
		operation: 'exportPathForApi',
		function: 'ExportPathForApi',
		displayName: 'Export Path For API',
		description:
			'File → ContentBase64; thư mục → zip Base64. Result: Kind, EntryName, RelativePath, ContentBase64, ContentByteLength.',
		action: 'Export path as Base64',
		params: 'pathOnly',
		group: 'util',
	},
	{
		operation: 'downloadFromUrl',
		function: 'DownloadFromUrl',
		displayName: 'Download From URL',
		description:
			'Tải http/https vào thư mục trong root. Result.SavedFullPath. timeout mặc định 300 giây.',
		action: 'Download from URL',
		params: 'downloadFromUrl',
		group: 'network',
	},
	{
		operation: 'tryResolvePath',
		function: 'TryResolvePath',
		displayName: 'Try Resolve Path',
		description: 'Resolve path an toàn trong root (tiện ích; thường dùng nội bộ).',
		action: 'Try resolve path',
		params: 'pathOnly',
		group: 'util',
	},
	{
		operation: 'writeExcel',
		function: 'WriteExcel',
		displayName: 'Write Excel',
		description:
			'Ghi .xlsx: Table (dễ dùng) / Cells / Range / Style / Sheet Style / Batch (operationsJson). Engine EPPlus.',
		action: 'Write Excel workbook',
		params: 'writeExcel',
		group: 'excel',
	},
	{
		operation: 'readExcel',
		function: 'ReadExcel',
		displayName: 'Read Excel',
		description:
			'Đọc sheet .xlsx → Result.Content (JSON string). hasHeader=true → object[]; false → matrix.',
		action: 'Read Excel workbook',
		params: 'readExcel',
		group: 'excel',
	},
	{
		operation: 'deleteExcelSheet',
		function: 'DeleteExcelSheet',
		displayName: 'Delete Excel Sheet',
		description: 'Xóa một sheet (workbook phải còn ≥ 1 sheet). Không xóa file.',
		action: 'Delete Excel sheet',
		params: 'deleteExcelSheet',
		group: 'excel',
	},
	{
		operation: 'clearExcelRange',
		function: 'ClearExcelRange',
		displayName: 'Clear Excel Range',
		description:
			'Xóa nội dung vùng / used range. range trống hoặc * / used / all = Dimension. clearFormats tùy chọn.',
		action: 'Clear Excel range',
		params: 'clearExcelRange',
		group: 'excel',
	},
	{
		operation: 'deleteExcelEmptyRows',
		function: 'DeleteExcelEmptyRows',
		displayName: 'Delete Excel Empty Rows',
		description: 'Xóa hàng trống trong used range. keepHeaderRow=true giữ hàng đầu.',
		action: 'Delete empty Excel rows',
		params: 'deleteExcelEmptyRows',
		group: 'excel',
	},
];

export const FILE_COMMAND_FUNCTION: Record<string, string> = Object.fromEntries(
	FILE_COMMAND_DEFINITIONS.map((d) => [d.operation, d.function]),
);

export const FILE_COMMAND_PARAM_KIND: Record<string, FileCommandParamKind> = Object.fromEntries(
	FILE_COMMAND_DEFINITIONS.map((d) => [d.operation, d.params]),
);
