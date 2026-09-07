/** Cách build paramObject cho POST /web-auto/command */
export type WebCommandParamKind =
	| 'none'
	| 'navigate'
	| 'timeoutOnly'
	| 'selector'
	| 'selectorForce'
	| 'selectorValue'
	| 'selectorText'
	| 'selectorKey'
	| 'selectorSelectValue'
	| 'selectorAttribute'
	| 'queryElements'
	| 'queryHtml'
	| 'filePath'
	| 'filePathEncoding'
	| 'waitSelector'
	| 'waitLoadState'
	| 'waitTimeout'
	| 'fetchApi'
	| 'screenshot'
	| 'screenshotElement'
	| 'scriptEvaluate'
	| 'scriptFile'
	| 'scriptRun'
	| 'pageIndex'
	| 'setInputFiles'
	| 'newPage';

export interface WebCommandDefinition {
	operation: string;
	function: string;
	displayName: string;
	description: string;
	action: string;
	params: WebCommandParamKind;
}

/** Một nguồn cho operation → WebAutomationManager function (HTTP reflection). */
export const WEB_COMMAND_DEFINITIONS: WebCommandDefinition[] = [
	// Điều hướng
	{
		operation: 'navigate',
		function: 'Navigate',
		displayName: 'Navigate',
		description:
			'Mở URL đích trong tab đang active. Tham số: url (bắt buộc), timeoutMs (tùy chọn). Trả WebAccessResponse.',
		action: 'Navigate to URL',
		params: 'navigate',
	},
	{
		operation: 'goBack',
		function: 'GoBack',
		displayName: 'Go Back',
		description: 'Quay lại trang trước trong lịch sử trình duyệt. Tham số timeoutMs tùy chọn.',
		action: 'Go back',
		params: 'timeoutOnly',
	},
	{
		operation: 'goForward',
		function: 'GoForward',
		displayName: 'Go Forward',
		description: 'Tiến tới trang sau trong lịch sử trình duyệt. Tham số timeoutMs tùy chọn.',
		action: 'Go forward',
		params: 'timeoutOnly',
	},
	{
		operation: 'reload',
		function: 'Reload',
		displayName: 'Reload',
		description: 'Tải lại trang hiện tại. Tham số timeoutMs tùy chọn.',
		action: 'Reload page',
		params: 'timeoutOnly',
	},
	// Tương tác
	{
		operation: 'click',
		function: 'Click',
		displayName: 'Click',
		description:
			'Click element theo Playwright selector (CSS, text=..., xpath=...). Có thể bật force để click kể cả bị che.',
		action: 'Click element',
		params: 'selectorForce',
	},
	{
		operation: 'doubleClick',
		function: 'DoubleClick',
		displayName: 'Double Click',
		description: 'Double-click element theo selector Playwright.',
		action: 'Double-click element',
		params: 'selector',
	},
	{
		operation: 'fill',
		function: 'Fill',
		displayName: 'Fill',
		description: 'Điền nhanh giá trị vào input/textarea (không gõ từng ký tự).',
		action: 'Fill input',
		params: 'selectorValue',
	},
	{
		operation: 'type',
		function: 'Type',
		displayName: 'Type',
		description: 'Gõ từng ký tự vào element. Có delayMs giữa các ký tự (debug).',
		action: 'Type text',
		params: 'selectorText',
	},
	{
		operation: 'press',
		function: 'Press',
		displayName: 'Press Key',
		description: 'Nhấn phím trên element (Enter, Tab, ArrowDown, …).',
		action: 'Press key',
		params: 'selectorKey',
	},
	{
		operation: 'selectOption',
		function: 'SelectOption',
		displayName: 'Select Option',
		description: 'Chọn option trong thẻ <select> theo value hoặc label.',
		action: 'Select option',
		params: 'selectorSelectValue',
	},
	{
		operation: 'check',
		function: 'Check',
		displayName: 'Check',
		description: 'Tick checkbox theo selector.',
		action: 'Check checkbox',
		params: 'selector',
	},
	{
		operation: 'uncheck',
		function: 'Uncheck',
		displayName: 'Uncheck',
		description: 'Bỏ tick checkbox theo selector.',
		action: 'Uncheck checkbox',
		params: 'selector',
	},
	{
		operation: 'hover',
		function: 'Hover',
		displayName: 'Hover',
		description: 'Di chuột (hover) lên element theo selector.',
		action: 'Hover element',
		params: 'selector',
	},
	{
		operation: 'setInputFiles',
		function: 'SetInputFiles',
		displayName: 'Set Input Files',
		description:
			'Upload file qua input[type=file]. filePath là đường dẫn trên máy worker (RMIV.WF.CLIENT), không phải máy gọi API.',
		action: 'Set input files',
		params: 'setInputFiles',
	},
	// Đọc giá trị
	{
		operation: 'getText',
		function: 'GetText',
		displayName: 'Get Text',
		description: 'Lấy textContent của element. Kết quả trong Result.Value (string).',
		action: 'Get text',
		params: 'selector',
	},
	{
		operation: 'getInnerText',
		function: 'GetInnerText',
		displayName: 'Get Inner Text',
		description: 'Lấy innerText của element (như hiển thị trên màn hình). Result.Value.',
		action: 'Get inner text',
		params: 'selector',
	},
	{
		operation: 'getInputValue',
		function: 'GetInputValue',
		displayName: 'Get Input Value',
		description: 'Lấy giá trị value của input/textarea. Result.Value.',
		action: 'Get input value',
		params: 'selector',
	},
	{
		operation: 'getAttribute',
		function: 'GetAttribute',
		displayName: 'Get Attribute',
		description: 'Lấy thuộc tính HTML (href, value, data-*, …). Result.Value.',
		action: 'Get attribute',
		params: 'selectorAttribute',
	},
	{
		operation: 'getTitle',
		function: 'GetTitle',
		displayName: 'Get Title',
		description: 'Lấy document.title của tab hiện tại. Không cần selector.',
		action: 'Get page title',
		params: 'none',
	},
	{
		operation: 'getUrl',
		function: 'GetUrl',
		displayName: 'Get URL',
		description: 'Lấy URL hiện tại của tab active. Result.Value.',
		action: 'Get current URL',
		params: 'none',
	},
	{
		operation: 'getContent',
		function: 'GetContent',
		displayName: 'Get Content',
		description: 'Lấy toàn bộ HTML nội dung trang (page content). Result.Value.',
		action: 'Get page content',
		params: 'none',
	},
	{
		operation: 'downloadFullHtml',
		function: 'DownloadFullHtml',
		displayName: 'Download Full HTML',
		description:
			'Lưu HTML trang ra file trên máy worker. filePath bắt buộc; encodingName mặc định utf-8.',
		action: 'Download full HTML',
		params: 'filePathEncoding',
	},
	{
		operation: 'findElements',
		function: 'FindElements',
		displayName: 'Find Elements',
		description:
			'Tìm nhiều element theo queryType (id/class/xpath/css/tag) + queryValue. Trả danh sách Values.',
		action: 'Find elements',
		params: 'queryElements',
	},
	{
		operation: 'getHtml',
		function: 'GetHtml',
		displayName: 'Get HTML',
		description:
			'Lấy inner/outer HTML của element khớp queryType + queryValue. outerHtml=true lấy outer HTML.',
		action: 'Get element HTML',
		params: 'queryHtml',
	},
	{
		operation: 'isVisible',
		function: 'IsVisible',
		displayName: 'Is Visible',
		description: 'Kiểm tra element có hiển thị không. Result.Value (bool).',
		action: 'Is visible',
		params: 'selector',
	},
	{
		operation: 'isChecked',
		function: 'IsChecked',
		displayName: 'Is Checked',
		description: 'Kiểm tra checkbox/radio có được chọn không. Result.Value (bool).',
		action: 'Is checked',
		params: 'selector',
	},
	{
		operation: 'isEnabled',
		function: 'IsEnabled',
		displayName: 'Is Enabled',
		description: 'Kiểm tra element có enabled không. Result.Value (bool).',
		params: 'selector',
		action: 'Is enabled',
	},
	// Chờ
	{
		operation: 'waitForSelector',
		function: 'WaitForSelector',
		displayName: 'Wait For Selector',
		description:
			'Chờ selector đạt state (visible, attached, hidden, detached). Mặc định state=visible.',
		action: 'Wait for selector',
		params: 'waitSelector',
	},
	{
		operation: 'waitForLoadState',
		function: 'WaitForLoadState',
		displayName: 'Wait For Load State',
		description: 'Chờ trạng thái tải trang: load, domcontentloaded, networkidle, …',
		action: 'Wait for load state',
		params: 'waitLoadState',
	},
	{
		operation: 'waitForTimeout',
		function: 'WaitForTimeout',
		displayName: 'Wait For Timeout',
		description: 'Chờ cố định milliseconds (sleep Playwright).',
		action: 'Wait fixed time',
		params: 'waitTimeout',
	},
	{
		operation: 'fetchApi',
		function: 'FetchApi',
		displayName: 'Fetch API',
		description:
			'Gửi HTTP(S) qua cookie/session browser hiện tại (sau login). Trả Result.StatusCode, Body, HeadersJson.',
		action: 'Fetch API in session',
		params: 'fetchApi',
	},
	// Ảnh chụp
	{
		operation: 'screenshot',
		function: 'Screenshot',
		displayName: 'Screenshot',
		description:
			'Chụp màn hình tab hiện tại. fullPage=true chụp toàn trang. Result.ContentBase64 (PNG).',
		action: 'Screenshot page',
		params: 'screenshot',
	},
	{
		operation: 'screenshotElement',
		function: 'ScreenshotElement',
		displayName: 'Screenshot Element',
		description: 'Chụp ảnh một element theo selector. Result.ContentBase64.',
		action: 'Screenshot element',
		params: 'screenshotElement',
	},
	// JavaScript
	{
		operation: 'evaluate',
		function: 'Evaluate',
		displayName: 'Evaluate',
		description:
			'Chạy hàm JavaScript trên trang (Playwright Evaluate). script là hàm JS; argJson là JSON đối số.',
		action: 'Evaluate JavaScript',
		params: 'scriptEvaluate',
	},
	{
		operation: 'runJavaScript',
		function: 'RunJavaScript',
		displayName: 'Run JavaScript',
		description: 'Alias Evaluate — chạy script JS trên trang. Result.ResultJson.',
		action: 'Run JavaScript',
		params: 'scriptEvaluate',
	},
	{
		operation: 'runJavaScriptFile',
		function: 'RunJavaScriptFile',
		displayName: 'Run JavaScript File',
		description: 'Chạy file .js trên máy worker. filePath bắt buộc; argJson tùy chọn.',
		action: 'Run JS file',
		params: 'scriptFile',
	},
	{
		operation: 'runScript',
		function: 'RunScript',
		displayName: 'Run Script',
		description:
			'Chạy mã kiểu DevTools Console. Biến __arg từ argJson. Result.ResultJson.',
		action: 'Run console script',
		params: 'scriptRun',
	},
	// Tab
	{
		operation: 'newPage',
		function: 'NewPage',
		displayName: 'New Page',
		description: 'Mở tab mới; url tùy chọn. Tab mới trở thành active.',
		action: 'Open new tab',
		params: 'newPage',
	},
	{
		operation: 'closePage',
		function: 'ClosePage',
		displayName: 'Close Page',
		description: 'Đóng tab theo chỉ số pageIndex (0-based).',
		action: 'Close tab',
		params: 'pageIndex',
	},
	{
		operation: 'switchPage',
		function: 'SwitchPage',
		displayName: 'Switch Page',
		description: 'Chuyển sang tab theo pageIndex (0-based).',
		action: 'Switch tab',
		params: 'pageIndex',
	},
	{
		operation: 'listPages',
		function: 'ListPages',
		displayName: 'List Pages',
		description: 'Liệt kê tất cả tab: index, url, active. Result.ResultJson.',
		action: 'List tabs',
		params: 'none',
	},
];

export const WEB_COMMAND_FUNCTION: Record<string, string> = Object.fromEntries(
	WEB_COMMAND_DEFINITIONS.map((d) => [d.operation, d.function]),
);

export const WEB_COMMAND_PARAM_KIND: Record<string, WebCommandParamKind> = Object.fromEntries(
	WEB_COMMAND_DEFINITIONS.map((d) => [d.operation, d.params]),
);

/** Gom operation theo param kind (cho displayOptions field). */
export function operationsWithParamKind(...kinds: WebCommandParamKind[]): string[] {
	return WEB_COMMAND_DEFINITIONS.filter((d) => kinds.includes(d.params)).map((d) => d.operation);
}
