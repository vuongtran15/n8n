import type { INodeProperties } from 'n8n-workflow';

import { operationsWithParamKind } from './sapCommandRegistry';

function op(...operations: string[]): INodeProperties['displayOptions'] {
	return {
		show: {
			operation: operations,
		},
	};
}

const ID_OPS = operationsWithParamKind(
	'elementId',
	'elementIdAndText',
	'elementIdAndCaret',
	'elementIdAndCheckbox',
	'elementIdAndComboKey',
	'elementIdAndComboText',
	'waitElement',
);
const TEXT_VALUE_OPS = operationsWithParamKind('elementIdAndText');
const GRID_ID_OPS = operationsWithParamKind(
	'gridIdOnly',
	'gridCellRead',
	'gridCellWrite',
	'gridRowOnly',
	'gridRowColumn',
	'gridToolbarButton',
	'gridPage',
	'gridSavePath',
);
const GRID_ROW_OPS = operationsWithParamKind(
	'gridCellRead',
	'gridCellWrite',
	'gridRowOnly',
	'gridRowColumn',
);
const GRID_COL_OPS = operationsWithParamKind('gridCellRead', 'gridCellWrite', 'gridRowColumn');
const TREE_ITEM_OPS = operationsWithParamKind('treeItem');
const TREE_ID_OPS = operationsWithParamKind('treeItem', 'treeNode', 'treeIdOnly');
const TREE_NODE_KEY_OPS = operationsWithParamKind('treeItem', 'treeNode');
const CELL_VALUE_OPS = operationsWithParamKind('gridCellWrite', 'tableCellWrite');
const TABLE_ID_OPS = operationsWithParamKind(
	'tableIdOnly',
	'tableCellRead',
	'tableCellWrite',
	'tableRowScroll',
);
const TABLE_ROW_OPS = operationsWithParamKind('tableCellRead', 'tableCellWrite', 'tableRowScroll');
const TABLE_COL_OPS = operationsWithParamKind('tableCellRead', 'tableCellWrite');
const SAVE_PATH_OPS = operationsWithParamKind('savePath', 'gridSavePath', 'savePathAndFileType');
const MULTI_SEL_FILL_OPS = operationsWithParamKind('fillMultipleSelection');
const MULTI_SEL_OPEN_OPS = operationsWithParamKind('openFillMultipleSelection');
const MULTI_SEL_SHARED_OPS = operationsWithParamKind(
	'fillMultipleSelection',
	'openFillMultipleSelection',
);

/** Field bổ sung cho POST /sap-auto/command và disconnect (không gồm block Open and Connect). */
export function getSapCommandShortcutProperties(): INodeProperties[] {
	return [
		{
			displayName: 'SAP Element ID',
			name: 'elementId',
			type: 'string',
			default: '',
			placeholder: 'wnd[0]/usr/...',
			description: 'Đường dẫn control SAP (tham số id)',
			displayOptions: op(...ID_OPS),
		},
		{
			displayName: 'Text Value',
			name: 'textValue',
			type: 'string',
			default: '',
			displayOptions: op(...TEXT_VALUE_OPS),
		},
		{
			displayName: 'Texts (JSON object)',
			name: 'textsJson',
			type: 'json',
			default: '{}',
			placeholder:
				'{"wnd[0]/usr/ctxtMATNR-LOW":"10000001","wnd[0]/usr/ctxtWERKS-LOW":"1000","wnd[0]/usr/ctxtLGORT-LOW":"0001"}',
			hint: 'Map SAP Element ID -> text value.',
			description:
				'Object map id control -> text. Gửi qua SetTexts — paramObject là map này (không bọc thêm key items).',
			displayOptions: op('setTexts'),
		},
		{
			displayName: 'Checkboxes (JSON object)',
			name: 'checkboxesJson',
			type: 'json',
			default: '{}',
			placeholder: '{"wnd[0]/usr/chk[1,49]":"true","wnd[0]/usr/chk[1,50]":"false"}',
			hint: 'Map SAP Element ID -> true/false.',
			description:
				'Object map id checkbox -> "true"/"false" (cũng chấp nhận 1/0, yes/no, x). Gửi qua SetCheckboxes.',
			displayOptions: op('setCheckboxes'),
		},
		{
			displayName: 'Caret Position',
			name: 'caretPosition',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			displayOptions: op(...operationsWithParamKind('elementIdAndCaret')),
		},
		{
			displayName: 'Checkbox Value',
			name: 'checkboxValue',
			type: 'boolean',
			default: false,
			displayOptions: op(...operationsWithParamKind('elementIdAndCheckbox')),
		},
		{
			displayName: 'Combo Key',
			name: 'comboKey',
			type: 'string',
			default: '',
			displayOptions: op(...operationsWithParamKind('elementIdAndComboKey')),
		},
		{
			displayName: 'Combo Text',
			name: 'comboText',
			type: 'string',
			default: '',
			displayOptions: op(...operationsWithParamKind('elementIdAndComboText')),
		},
		{
			displayName: 'Virtual Key',
			name: 'virtualKey',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			description: 'Mã SAP VKey (Int32)',
			displayOptions: op(...operationsWithParamKind('virtualKey')),
		},
		{
			displayName: 'Transaction Code',
			name: 'transactionCode',
			type: 'string',
			default: '',
			placeholder: 'MM03',
			displayOptions: op(...operationsWithParamKind('transactionCode')),
		},
		{
			displayName: 'Tab Strip ID',
			name: 'tabStripId',
			type: 'string',
			default: '',
			placeholder: 'wnd[0]/usr/.../tabsHEADER_DETAIL',
			description:
				'Đường dẫn TabStrip (tabStripId). Có thể bỏ trống nếu Tab ID là path đầy đủ tới tab (recorder .select trên tabp...).',
			displayOptions: op(...operationsWithParamKind('selectTab')),
		},
		{
			displayName: 'Tab ID',
			name: 'tabId',
			type: 'string',
			default: '',
			placeholder: 'tabpTABHDT11 hoặc wnd[0]/usr/.../tabpTABHDT11',
			description:
				'Id tab ngắn (kèm Tab Strip ID) hoặc path đầy đủ tới tab — tương đương recorder tabp....select',
			displayOptions: op(...operationsWithParamKind('selectTab')),
		},
		{
			displayName: 'Toolbar ID',
			name: 'toolbarId',
			type: 'string',
			default: '',
			displayOptions: op(...operationsWithParamKind('toolbarButton')),
		},
		{
			displayName: 'Button Index',
			name: 'buttonIndex',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			displayOptions: op(...operationsWithParamKind('toolbarButton')),
		},
		{
			displayName: 'Shell ID',
			name: 'shellId',
			type: 'string',
			default: '',
			placeholder: 'wnd[0]/shellcont/shell/shellcont[1]/shell[0]',
			description: 'Đường dẫn GuiShell SAP (tham số shellId)',
			displayOptions: op(...operationsWithParamKind('shellButton')),
		},
		{
			displayName: 'Shell Button ID',
			name: 'buttonId',
			type: 'string',
			default: '',
			placeholder: 'COPY',
			description: 'PressShellButton — tên nút như recorder pressButton "..."',
			displayOptions: op(...operationsWithParamKind('shellButton')),
		},
		{
			displayName: 'Container ID',
			name: 'containerId',
			type: 'string',
			default: '',
			placeholder: 'wnd[0]/usr',
			description:
				'ScrollPage / ResetScroll — id container có verticalScrollbar (vd. wnd[0]/usr).',
			displayOptions: op(
				...operationsWithParamKind('containerIdOnly', 'scrollPage'),
			),
		},
		{
			displayName: 'Scroll Position',
			name: 'scrollPosition',
			type: 'number',
			default: -1,
			description:
				'ScrollPage — ≥ 0 đặt tuyệt đối; < 0 (mặc định -1) = cuộn thêm PageSize (hoặc +1).',
			displayOptions: op(...operationsWithParamKind('scrollPage')),
		},
		{
			displayName: 'Tooltip',
			name: 'tooltip',
			type: 'string',
			default: '',
			displayOptions: op(...operationsWithParamKind('tooltip')),
		},
		{
			displayName: 'Grid ID',
			name: 'gridId',
			type: 'string',
			default: '',
			displayOptions: op(...GRID_ID_OPS),
		},
		{
			displayName: 'Grid Row Index',
			name: 'gridRow',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			displayOptions: op(...GRID_ROW_OPS),
		},
		{
			displayName: 'Column Name',
			name: 'columnName',
			type: 'string',
			default: '',
			description: 'ALV grid hoặc GuiTree: tên cột (string), ví dụ &Hierarchy',
			displayOptions: op(...GRID_COL_OPS, ...TREE_ITEM_OPS),
		},
		{
			displayName: 'Cell Value',
			name: 'cellValue',
			type: 'string',
			default: '',
			displayOptions: op(...CELL_VALUE_OPS),
		},
		{
			displayName: 'Grid Button ID',
			name: 'buttonId',
			type: 'string',
			default: '',
			description: 'PressGridToolbarButton — buttonId',
			displayOptions: op(...operationsWithParamKind('gridToolbarButton')),
		},
		{
			displayName: 'Page Index',
			name: 'pageIndex',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			displayOptions: op(...operationsWithParamKind('gridPage')),
		},
		{
			displayName: 'Page Size',
			name: 'pageSize',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 100,
			description: 'GetGridPage — mặc định API 100',
			displayOptions: op(...operationsWithParamKind('gridPage')),
		},
		{
			displayName: 'Tree ID',
			name: 'treeId',
			type: 'string',
			default: '',
			placeholder: 'wnd[0]/.../shell hoặc .../cntlTEXT_TYPES_0100/shell',
			description:
				'Đường dẫn GuiTree (treeId). SelectTreeNode: recorder selectedNode; SelectTreeItem: shell column tree.',
			displayOptions: op(...TREE_ID_OPS),
		},
		{
			displayName: 'Node Key',
			name: 'nodeKey',
			type: 'string',
			default: '',
			placeholder: 'F01 hoặc 2',
			description:
				'SelectTreeNode: mã node (ví dụ F01). SelectTreeItem: key cột — số có thể gửi "2" thay vì pad space.',
			displayOptions: op(...TREE_NODE_KEY_OPS),
		},
		{
			displayName: 'Table ID',
			name: 'tableId',
			type: 'string',
			default: '',
			displayOptions: op(...TABLE_ID_OPS),
		},
		{
			displayName: 'Table Row Index',
			name: 'tableRow',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			displayOptions: op(...TABLE_ROW_OPS),
		},
		{
			displayName: 'Table Column Index',
			name: 'tableCol',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			description: 'Table control: chỉ số cột (Int32)',
			displayOptions: op(...TABLE_COL_OPS),
		},
		{
			displayName: 'Save Path',
			name: 'savePath',
			type: 'string',
			default: '',
			placeholder: 'C:\\temp\\export.xlsx',
			displayOptions: op(...SAVE_PATH_OPS, ...operationsWithParamKind('savePath')),
		},
		{
			displayName: 'File Type',
			name: 'fileType',
			type: 'string',
			default: 'XLSX',
			description: 'SelectLocalFileExport — optional (mặc định XLSX)',
			displayOptions: op(...operationsWithParamKind('savePathAndFileType')),
		},
		{
			displayName: 'User Area ID',
			name: 'userAreaId',
			type: 'string',
			default: 'wnd[1]/usr',
			description: 'DumpUserAreaTexts — optional (mặc định wnd[1]/usr)',
			displayOptions: op(...operationsWithParamKind('dumpUserArea')),
		},
		{
			displayName: 'ID Pattern',
			name: 'idPattern',
			type: 'string',
			default: '',
			placeholder: 'wnd[0]/usr/.../cmbEKKO_CI-POADDR',
			description:
				'FindIds — pattern path SAP (hỗ trợ `...`), trả danh sách id relative bắt đầu bằng wnd[',
			displayOptions: op(...operationsWithParamKind('idPattern')),
		},
		{
			displayName: 'Text To Find',
			name: 'containsSearchText',
			type: 'string',
			default: '',
			description: 'ContainsText — tìm chuỗi trên màn hình',
			displayOptions: op(...operationsWithParamKind('containsText')),
		},
		{
			displayName: 'Popup Action',
			name: 'handlePopupAction',
			type: 'string',
			default: '',
			description: 'Tham số action cho HandlePopup (theo ISapPopup)',
			displayOptions: op(...operationsWithParamKind('handlePopup')),
		},
		{
			displayName: 'Timeout (Seconds)',
			name: 'timeoutSeconds',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 10,
			description: 'WaitForElement / WaitUntilGone',
			displayOptions: op(...operationsWithParamKind('waitElement')),
		},
		{
			displayName: 'Wait For SAP (Seconds)',
			name: 'waitSapTimeoutSeconds',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 30,
			description: 'WaitForSap — optional timeoutSeconds (API mặc 30).',
			displayOptions: op(...operationsWithParamKind('waitSap')),
		},
		{
			displayName: 'Sleep (Ms)',
			name: 'sleepMs',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 500,
			displayOptions: op(...operationsWithParamKind('sleep')),
		},
		{
			displayName: 'Bot ID',
			name: 'botid',
			type: 'string',
			default: '',
			placeholder: 'webhook-key',
			description:
				'Key webhook nhóm WeCom. Node gửi POST tới https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key= + botid.',
			displayOptions: op('wecomGroupMessage'),
		},
		{
			displayName: 'Message Type',
			name: 'msgtype',
			type: 'options',
			options: [
				{ name: 'Text', value: 'text' },
				{ name: 'Markdown', value: 'markdown' },
				{ name: 'Markdown V2', value: 'markdown_v2' },
				{ name: 'Image', value: 'image' },
			],
			default: 'text',
			description: 'Loại tin nhắn webhook WeCom: text, markdown, markdown_v2 hoặc image.',
			displayOptions: op('wecomGroupMessage'),
		},
		{
			displayName: 'Content',
			name: 'content',
			type: 'string',
			typeOptions: { rows: 6 },
			default: '',
			placeholder: 'Noi dung tin nhan...',
			description:
				'Nội dung gửi trong text.content / markdown.content / markdown_v2.content tùy msgtype.',
			displayOptions: {
				show: {
					operation: ['wecomGroupMessage'],
					msgtype: ['text', 'markdown', 'markdown_v2'],
				},
			},
		},
		{
			displayName: 'Mentioned List',
			name: 'mentionedList',
			type: 'string',
			default: '',
			placeholder: 'wangqing,@all',
			description:
				'Tùy chọn. userid WeCom cần @mention (text.mentioned_list). Nhiều giá trị: phân tách bằng dấu phẩy. Dùng @all để mention tất cả.',
			displayOptions: {
				show: {
					operation: ['wecomGroupMessage'],
					msgtype: ['text'],
				},
			},
		},
		{
			displayName: 'Mentioned Mobile List',
			name: 'mentionedMobileList',
			type: 'string',
			default: '',
			placeholder: '13800001111,@all',
			description:
				'Tùy chọn. Số điện thoại cần @mention (text.mentioned_mobile_list). Nhiều giá trị: phân tách bằng dấu phẩy. Dùng @all để mention tất cả.',
			displayOptions: {
				show: {
					operation: ['wecomGroupMessage'],
					msgtype: ['text'],
				},
			},
		},
		{
			displayName: 'Image Base64',
			name: 'base64',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			placeholder: 'iVBORw0KGgoAAAANSUhEUgAA...',
			description:
				'Ảnh mã hóa base64 (không kèm prefix data:image/...). Dùng khi msgtype = image.',
			displayOptions: {
				show: {
					operation: ['wecomGroupMessage'],
					msgtype: ['image'],
				},
			},
		},
		{
			displayName: 'Image MD5',
			name: 'md5',
			type: 'string',
			default: '',
			placeholder: 'md5-hash-of-image-bytes',
			description:
				'MD5 của nội dung ảnh (trước khi base64). Dùng khi msgtype = image.',
			displayOptions: {
				show: {
					operation: ['wecomGroupMessage'],
					msgtype: ['image'],
				},
			},
		},
		{
			displayName: 'Emp IDs',
			name: 'empids',
			type: 'string',
			default: '',
			placeholder: 'A001|A002',
			hint: 'A001|A002',
			description: 'Mã nhân viên nhận tin. Nhiều mã: phân tách bằng dấu | (ví dụ A001|A002).',
			displayOptions: op('rosWecomSendMessage'),
		},
		{
			displayName: 'Message',
			name: 'message',
			type: 'string',
			typeOptions: { rows: 6 },
			default: '',
			placeholder: 'Noi dung tin nhan WeCom...',
			description: 'Nội dung tin nhắn gửi qua ROS Wecom.',
			displayOptions: op('rosWecomSendMessage'),
		},
		{
			displayName: 'Multi Sel Cell ID Base',
			name: 'multiSelCellIdBase',
			type: 'string',
			default: '',
			placeholder:
				'wnd[1]/usr/.../tblSAPLALDBSINGLE/ctxtRSCSEL-SLOW_I',
			description:
				'Path ô nhập Multiple Selection (không kèm [row,col]) — tham số cellIdBase.',
			displayOptions: op(...MULTI_SEL_SHARED_OPS),
		},
		{
			displayName: 'Multi Sel Items',
			name: 'multiSelItems',
			type: 'string',
			default: '',
			placeholder: '1,2,3,4,5 hoặc 1;2;3',
			description:
				'Danh sách giá trị (items) — phân tách bằng dấu phẩy, chấm phẩy, xuống dòng hoặc tab.',
			displayOptions: op(...MULTI_SEL_SHARED_OPS),
		},
		{
			displayName: 'Multi Sel Open Button ID',
			name: 'multiSelOpenButtonId',
			type: 'string',
			default: '',
			placeholder: 'wnd[0]/usr/btn%_BA_MATNR_%_APP_%-VALU_PUSH',
			description:
				'Nút mở popup Multiple Selection (openButtonId) — chỉ Open, Fill & Confirm.',
			displayOptions: op(...MULTI_SEL_OPEN_OPS),
		},
		{
			displayName: 'Multi Sel Data Row',
			name: 'multiSelDataRow',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: 1,
			description: 'Hàng dữ liệu trong bảng popup (dataRow, mặc định 1).',
			displayOptions: op(...MULTI_SEL_SHARED_OPS),
		},
		{
			displayName: 'Multi Sel Window Index',
			name: 'multiSelWindowIndex',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 1,
			description: 'Chỉ số cửa sổ popup wnd[n] (windowIndex, mặc định 1).',
			displayOptions: op(...MULTI_SEL_SHARED_OPS),
		},
		{
			displayName: 'Multi Sel Send Enter On Scroll',
			name: 'multiSelSendEnterOnScroll',
			type: 'boolean',
			default: true,
			description: 'Gửi Enter trên wnd[n] khi cuộn sang vùng mới (sendEnterOnScroll).',
			displayOptions: op(...MULTI_SEL_SHARED_OPS),
		},
		{
			displayName: 'Multi Sel Confirm Button Indices',
			name: 'multiSelConfirmButtonIndices',
			type: 'string',
			default: '',
			placeholder: '0,8',
			description:
				'Chỉ số nút xác nhận trên tbar[0] (confirmButtonIndices). Fill: để trống = không bấm. Open: mặc định 0,8.',
			displayOptions: op(...MULTI_SEL_SHARED_OPS),
		},
		{
			displayName: 'Log Command',
			name: 'logCommand',
			type: 'string',
			default: '',
			placeholder: 'Ten lenh hoac buoc workflow...',
			description: 'Gia tri field command trong body POST logUrl.',
			displayOptions: op('logMessage'),
		},
		{
			displayName: 'Log Message',
			name: 'logContent',
			type: 'string',
			typeOptions: { rows: 6 },
			default: '',
			placeholder: 'Noi dung log...',
			description: 'Gia tri field message trong body POST logUrl.',
			displayOptions: op('logMessage'),
		},
	];
}
