import type { INodeProperties } from 'n8n-workflow';

import { operationsWithParamKind } from './webCommandRegistry';

function op(...operations: string[]): INodeProperties['displayOptions'] {
	return {
		show: {
			operation: operations,
		},
	};
}

const SELECTOR_OPS = operationsWithParamKind(
	'selector',
	'selectorForce',
	'selectorValue',
	'selectorText',
	'selectorKey',
	'selectorSelectValue',
	'selectorAttribute',
	'screenshotElement',
	'setInputFiles',
);
const SELECTOR_VALUE_OPS = operationsWithParamKind('selectorValue');
const SELECTOR_TEXT_OPS = operationsWithParamKind('selectorText');
const SELECTOR_KEY_OPS = operationsWithParamKind('selectorKey');
const SELECTOR_SELECT_OPS = operationsWithParamKind('selectorSelectValue');
const SELECTOR_ATTR_OPS = operationsWithParamKind('selectorAttribute');
const URL_OPS = operationsWithParamKind('navigate', 'newPage', 'fetchApi');
const FETCH_API_OPS = operationsWithParamKind('fetchApi');
const TIMEOUT_ONLY_OPS = operationsWithParamKind(
	'timeoutOnly',
	'selector',
	'selectorForce',
	'selectorValue',
	'selectorText',
	'selectorKey',
	'selectorSelectValue',
	'selectorAttribute',
	'screenshotElement',
	'setInputFiles',
	'navigate',
	'fetchApi',
);
const QUERY_OPS = operationsWithParamKind('queryElements', 'queryHtml');
const FILE_PATH_OPS = operationsWithParamKind('filePathEncoding', 'scriptFile');
const WAIT_SELECTOR_OPS = operationsWithParamKind('waitSelector');
const WAIT_LOAD_OPS = operationsWithParamKind('waitLoadState');
const WAIT_TIMEOUT_OPS = operationsWithParamKind('waitTimeout');
const SCREENSHOT_OPS = operationsWithParamKind('screenshot');
const SCREENSHOT_EL_OPS = operationsWithParamKind('screenshotElement');
const SCRIPT_EVAL_OPS = operationsWithParamKind('scriptEvaluate');
const SCRIPT_FILE_OPS = operationsWithParamKind('scriptFile');
const SCRIPT_RUN_OPS = operationsWithParamKind('scriptRun');
const PAGE_INDEX_OPS = operationsWithParamKind('pageIndex');
const FORCE_OPS = operationsWithParamKind('selectorForce');

/** Field bổ sung cho POST /web-auto/command (không gồm block Connect). */
export function getWebCommandShortcutProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Selector',
			name: 'selector',
			type: 'string',
			default: '',
			placeholder: '#username, text=Đăng nhập, xpath=//button',
			description:
				'Playwright selector: CSS (#id, .class), text=..., xpath=..., v.v. Dùng cho Click, Fill, Wait, …',
			displayOptions: op(...SELECTOR_OPS),
		},
		{
			displayName: 'URL',
			name: 'url',
			type: 'string',
			default: '',
			placeholder: 'https://example.com/path',
			description: 'URL đích (Navigate, Fetch API) hoặc URL mở tab mới (New Page).',
			displayOptions: op(...URL_OPS),
		},
		{
			displayName: 'HTTP Method',
			name: 'httpMethod',
			type: 'options',
			options: [
				{ name: 'GET', value: 'GET' },
				{ name: 'POST', value: 'POST' },
				{ name: 'PUT', value: 'PUT' },
				{ name: 'PATCH', value: 'PATCH' },
				{ name: 'DELETE', value: 'DELETE' },
				{ name: 'HEAD', value: 'HEAD' },
			],
			default: 'GET',
			description: 'Phương thức HTTP (Fetch API). Mặc định GET.',
			displayOptions: op(...FETCH_API_OPS),
		},
		{
			displayName: 'Headers JSON',
			name: 'headersJson',
			type: 'string',
			default: '',
			placeholder: '{"Content-Type":"application/json"}',
			description: 'JSON object header HTTP (Fetch API). Ví dụ Content-Type cho POST JSON.',
			displayOptions: op(...FETCH_API_OPS),
		},
		{
			displayName: 'Request Body',
			name: 'requestBody',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			placeholder: '{"keyword":"RMIV","page":1}',
			description: 'Body request (JSON/text). Bỏ qua với GET/HEAD (Fetch API).',
			displayOptions: op(...FETCH_API_OPS),
		},
		{
			displayName: 'Fail On HTTP Error',
			name: 'failOnHttpError',
			type: 'boolean',
			default: false,
			description: 'true = lỗi khi HTTP status không phải 2xx/3xx (Fetch API).',
			displayOptions: op(...FETCH_API_OPS),
		},
		{
			displayName: 'Value',
			name: 'textValue',
			type: 'string',
			default: '',
			description: 'Giá trị điền vào input/textarea (Fill) hoặc option value/label (Select Option).',
			displayOptions: op(...SELECTOR_VALUE_OPS, ...SELECTOR_SELECT_OPS),
		},
		{
			displayName: 'Text',
			name: 'typeText',
			type: 'string',
			default: '',
			description: 'Chuỗi gõ từng ký tự (Type).',
			displayOptions: op(...SELECTOR_TEXT_OPS),
		},
		{
			displayName: 'Key',
			name: 'pressKey',
			type: 'string',
			default: 'Enter',
			placeholder: 'Enter, Tab, ArrowDown',
			description: 'Tên phím Playwright (Press).',
			displayOptions: op(...SELECTOR_KEY_OPS),
		},
		{
			displayName: 'Attribute Name',
			name: 'attributeName',
			type: 'string',
			default: '',
			placeholder: 'href, value, data-id',
			description: 'Tên thuộc tính HTML cần đọc (Get Attribute).',
			displayOptions: op(...SELECTOR_ATTR_OPS),
		},
		{
			displayName: 'Force Click',
			name: 'forceClick',
			type: 'boolean',
			default: false,
			description: 'Click kể cả khi element bị che (overlay). Mặc định false.',
			displayOptions: op(...FORCE_OPS),
		},
		{
			displayName: 'Query Type',
			name: 'queryType',
			type: 'options',
			options: [
				{ name: 'ID', value: 'id' },
				{ name: 'Class', value: 'class' },
				{ name: 'XPath', value: 'xpath' },
				{ name: 'CSS', value: 'css' },
				{ name: 'Tag / Element', value: 'tag' },
			],
			default: 'css',
			description: 'Kiểu truy vấn element: id, class, xpath, css, tag.',
			displayOptions: op(...QUERY_OPS),
		},
		{
			displayName: 'Query Value',
			name: 'queryValue',
			type: 'string',
			default: '',
			placeholder: 'div.item > a, main-content, //table',
			description: 'Giá trị truy vấn tương ứng queryType (Find Elements, Get HTML).',
			displayOptions: op(...QUERY_OPS),
		},
		{
			displayName: 'Value Kind',
			name: 'valueKind',
			type: 'string',
			default: 'innerText',
			placeholder: 'innerText, href, value',
			description: 'Thuộc tính lấy từ mỗi element tìm được (Find Elements). Mặc định innerText.',
			displayOptions: op(...operationsWithParamKind('queryElements')),
		},
		{
			displayName: 'Outer HTML',
			name: 'outerHtml',
			type: 'boolean',
			default: false,
			description: 'true = outer HTML; false = inner HTML (Get HTML).',
			displayOptions: op(...operationsWithParamKind('queryHtml')),
		},
		{
			displayName: 'File Path',
			name: 'filePath',
			type: 'string',
			default: '',
			placeholder: 'C:\\temp\\page.html',
			description: 'Đường dẫn file trên máy worker (RMIV.WF.CLIENT), không phải máy gọi API.',
			displayOptions: op(...FILE_PATH_OPS, ...operationsWithParamKind('setInputFiles')),
		},
		{
			displayName: 'Encoding Name',
			name: 'encodingName',
			type: 'string',
			default: 'utf-8',
			description: 'Mã hóa khi lưu HTML (Download Full HTML). Mặc định utf-8.',
			displayOptions: op(...operationsWithParamKind('filePathEncoding')),
		},
		{
			displayName: 'Wait State',
			name: 'waitState',
			type: 'string',
			default: 'visible',
			placeholder: 'visible, attached, hidden, detached',
			description: 'Trạng thái chờ selector (Wait For Selector). Mặc định visible.',
			displayOptions: op(...WAIT_SELECTOR_OPS),
		},
		{
			displayName: 'Load State',
			name: 'loadState',
			type: 'string',
			default: 'load',
			placeholder: 'load, domcontentloaded, networkidle',
			description: 'Trạng thái tải trang (Wait For Load State). Mặc định load.',
			displayOptions: op(...WAIT_LOAD_OPS),
		},
		{
			displayName: 'Wait (Ms)',
			name: 'waitMs',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 1000,
			description: 'Thời gian chờ cố định (Wait For Timeout), đơn vị millisecond.',
			displayOptions: op(...WAIT_TIMEOUT_OPS),
		},
		{
			displayName: 'Timeout (Ms)',
			name: 'timeoutMs',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			placeholder: '0 = dùng Default Timeout lúc Connect',
			description:
				'Timeout thao tác/navigation (ms). Để 0 hoặc trống = không gửi, server dùng defaultTimeoutMs lúc connect.',
			displayOptions: op(...TIMEOUT_ONLY_OPS, ...WAIT_SELECTOR_OPS, ...WAIT_LOAD_OPS),
		},
		{
			displayName: 'Type Delay (Ms)',
			name: 'delayMs',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			description: 'Độ trễ giữa các ký tự khi Type (ms). 0 = không trễ.',
			displayOptions: op(...SELECTOR_TEXT_OPS),
		},
		{
			displayName: 'Full Page',
			name: 'fullPage',
			type: 'boolean',
			default: false,
			description: 'true = chụp toàn bộ trang cuộn; false = chỉ viewport (Screenshot).',
			displayOptions: op(...SCREENSHOT_OPS),
		},
		{
			displayName: 'Script',
			name: 'script',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			placeholder: '() => document.title',
			description: 'Hàm JavaScript chạy trên trang (Evaluate / Run JavaScript).',
			displayOptions: op(...SCRIPT_EVAL_OPS),
		},
		{
			displayName: 'Arg JSON',
			name: 'argJson',
			type: 'string',
			default: '',
			placeholder: 'null hoặc {"key":"value"}',
			description: 'JSON đối số truyền vào script (Evaluate, Run JS File, Run Script).',
			displayOptions: op(...SCRIPT_EVAL_OPS, ...SCRIPT_FILE_OPS, ...SCRIPT_RUN_OPS),
		},
		{
			displayName: 'Code',
			name: 'scriptCode',
			type: 'string',
			typeOptions: { rows: 6 },
			default: '',
			description: 'Mã kiểu DevTools Console (Run Script). Biến __arg từ argJson.',
			displayOptions: op(...SCRIPT_RUN_OPS),
		},
		{
			displayName: 'Page Index',
			name: 'pageIndex',
			type: 'number',
			typeOptions: { minValue: 0 },
			default: 0,
			description: 'Chỉ số tab 0-based (Close Page, Switch Page).',
			displayOptions: op(...PAGE_INDEX_OPS),
		},
	];
}
