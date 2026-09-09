/**
 * Generate zh/vi translation JSON for RM SAP and RM WEB AUTO nodes
 * from KT-Node dist node descriptions (full property list).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { ACTION_VI, LABEL_VI, OP_NAME_VI } from './rm-locale-maps.mjs';
import {
	SAP_ACTION_VI,
	SAP_ACTION_ZH,
	SAP_OP_NAME_VI,
	SAP_OP_NAME_ZH,
} from './sap-translations.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ktNodeRoot = join(root, '..', '..', '..', 'KT-Node', 'dist', 'nodes');

const NODES = [
	{
		ktFolder: 'RmSapWorkflow',
		nodeKey: 'rmSapWorkflow',
		header: {
			en: {
				displayName: 'RM SAP',
				description:
					'SAP Automation',
			},
			zh: {
				displayName: 'RM SAP',
				description:
					'SAP 自动化',
			},
			vi: {
				displayName: 'RM SAP',
				description:
					'Tự động hóa SAP ',
			},
		},
	},
	{
		ktFolder: 'RmWebAutoWorkflow',
		nodeKey: 'rmWebAutoWorkflow',
		header: {
			en: {
				displayName: 'RM WEB AUTO',
				description:
					'Web Automation',
			},
			zh: {
				displayName: 'RM WEB AUTO',
				description:
					'Web 自动化',
			},
			vi: {
				displayName: 'RM WEB AUTO',
				description:
					'Tự động hóa Website',
			},
		},
	},
];

/** Common UI label translations (en -> zh) */
const LABEL_ZH = {
	Operation: '操作',
	'Branch on Success': '成功时分支',
	'Success Branching': '成功分支说明',
	'Connection Fields Source': '连接字段来源',
	Server: '服务器',
	Client: '客户端',
	Username: '用户名',
	Password: '密码',
	'Multi Logon Action': '多重登录操作',
	Language: '语言',
	'Idle Timeout (Minutes)': '空闲超时（分钟）',
	Reason: '原因',
	'SAP Element ID': 'SAP 元素 ID',
	'Text Value': '文本值',
	'Texts (JSON object)': '文本（JSON 对象）',
	'Checkboxes (JSON object)': '复选框（JSON 对象）',
	'Caret Position': '光标位置',
	'Checkbox Value': '复选框值',
	'Combo Key': '下拉键',
	'Combo Text': '下拉文本',
	'Virtual Key': '虚拟键',
	'Transaction Code': '事务代码',
	'Tab Strip ID': '选项卡条 ID',
	'Tab ID': '选项卡 ID',
	'Toolbar ID': '工具栏 ID',
	'Button Index': '按钮索引',
	'Shell ID': 'Shell ID',
	'Shell Button ID': 'Shell 按钮 ID',
	'Container ID': '容器 ID',
	'Scroll Position': '滚动位置',
	Tooltip: '工具提示',
	'Grid ID': '网格 ID',
	'Grid Row Index': '网格行索引',
	'Column Name': '列名',
	'Cell Value': '单元格值',
	'Grid Button ID': '网格按钮 ID',
	'Page Index': '页索引',
	'Page Size': '页大小',
	'Tree ID': '树 ID',
	'Node Key': '节点键',
	'Table ID': '表格 ID',
	'Table Row Index': '表格行索引',
	'Table Column Index': '表格列索引',
	'Save Path': '保存路径',
	'File Type': '文件类型',
	'User Area ID': '用户区域 ID',
	'ID Pattern': 'ID 模式',
	'Text To Find': '要查找的文本',
	'Popup Action': '弹窗操作',
	'Timeout (Seconds)': '超时（秒）',
	'Wait For SAP (Seconds)': '等待 SAP（秒）',
	'Sleep (Ms)': '休眠（毫秒）',
	'Bot ID': '机器人 ID',
	'Message Type': '消息类型',
	Content: '内容',
	'Mentioned List': '提及列表',
	'Mentioned Mobile List': '提及手机号列表',
	'Image Base64': '图片 Base64',
	'Image MD5': '图片 MD5',
	'Emp IDs': '员工 ID',
	Message: '消息',
	'Multi Sel Cell ID Base': '多选单元格 ID 基址',
	'Multi Sel Items': '多选项目',
	'Multi Sel Open Button ID': '多选打开按钮 ID',
	'Multi Sel Data Row': '多选数据行',
	'Multi Sel Window Index': '多选窗口索引',
	'Multi Sel Send Enter On Scroll': '滚动时发送 Enter',
	'Multi Sel Confirm Button Indices': '多选确认按钮索引',
	'Log Command': '日志命令',
	'Log Message': '日志消息',
	'Browser Type': '浏览器类型',
	Headless: '无头模式',
	'Start URL': '起始 URL',
	'Viewport Width': '视口宽度',
	'Viewport Height': '视口高度',
	'Slow Mo (Ms)': '慢动作（毫秒）',
	'User Agent': 'User-Agent',
	'Default Timeout (Ms)': '默认超时（毫秒）',
	Selector: '选择器',
	URL: 'URL',
	'HTTP Method': 'HTTP 方法',
	'Headers JSON': 'Headers JSON',
	'Request Body': '请求体',
	'Fail On HTTP Error': 'HTTP 错误时失败',
	Value: '值',
	Text: '文本',
	Key: '键',
	'Attribute Name': '属性名',
	'Force Click': '强制点击',
	'Query Type': '查询类型',
	'Query Value': '查询值',
	'Value Kind': '值类型',
	'Outer HTML': '外部 HTML',
	'File Path': '文件路径',
	'Encoding Name': '编码名称',
	'Wait State': '等待状态',
	'Load State': '加载状态',
	'Wait (Ms)': '等待（毫秒）',
	'Timeout (Ms)': '超时（毫秒）',
	'Type Delay (Ms)': '输入延迟（毫秒）',
	'Full Page': '整页',
	Script: '脚本',
	'Arg JSON': '参数 JSON',
	Code: '代码',
	'Page Index': '页索引',
};

/** Operation option name translations (en -> zh) */
const OP_NAME_ZH = {
	'Open and Connect': '打开并连接',
	Disconnect: '断开连接',
	'Session By Account': '按账户查询会话',
	'Kill By Account': '按账户终止会话',
	'Kill All Sessions': '终止所有会话',
	Log: '日志',
	'ROS Wecom Send Message': 'ROS 企业微信发消息',
	'Wecom Group Message': '企业微信群消息',
	Connect: '连接',
	Reconnect: '重新连接',
	'Is Session Alive': '会话是否存活',
	Exists: '元素是否存在',
	'Find Ids': '查找 ID',
	'Set Text': '设置文本',
	'Set Texts (many)': '批量设置文本',
	'Get Text': '获取文本',
	Clear: '清除',
	'Set Text And Enter': '设置文本并回车',
	'Set Focus': '设置焦点',
	'Get Caret Position': '获取光标位置',
	'Set Caret Position': '设置光标位置',
	Click: '点击',
	'Double Click': '双击',
	'Click By Tooltip': '按工具提示点击',
	'Send Enter': '发送 Enter',
	'Send Virtual Key': '发送虚拟键',
	'Press Toolbar Button': '按工具栏按钮',
	'Press Shell Button': '按 Shell 按钮',
	'Scroll Page': '滚动页面',
	'Reset Scroll': '重置滚动',
	'Set Checkbox': '设置复选框',
	'Set Checkboxes (many)': '批量设置复选框',
	'Get Checkbox': '获取复选框',
	'Select Radio': '选择单选',
	'Select By Key': '按键选择',
	'Select By Text': '按文本选择',
	'Get Selected Key': '获取选中键',
	'Get Selected Text': '获取选中文本',
	'Get Options': '获取选项',
	'Execute T-Code': '执行事务码',
	'Select Tab': '选择选项卡',
	'Reset To Main Menu': '返回主菜单',
	'Go Back': '后退',
	'Open New Session': '打开新会话',
	Navigate: '导航',
	'Go Forward': '前进',
	Reload: '刷新',
	Fill: '填充',
	Type: '输入',
	'Press Key': '按键',
	'Select Option': '选择选项',
	Check: '勾选',
	Uncheck: '取消勾选',
	Hover: '悬停',
	'Set Input Files': '设置上传文件',
	'Get Inner Text': '获取 innerText',
	'Get Input Value': '获取输入值',
	'Get Attribute': '获取属性',
	'Get Title': '获取标题',
	'Get URL': '获取 URL',
	'Get Content': '获取页面内容',
	'Download Full HTML': '下载完整 HTML',
	'Find Elements': '查找元素',
	'Get HTML': '获取 HTML',
	'Is Visible': '是否可见',
	'Is Checked': '是否已选',
	'Is Enabled': '是否启用',
	'Wait For Selector': '等待选择器',
	'Wait For Load State': '等待加载状态',
	'Wait For Timeout': '固定等待',
	'Fetch API': 'Fetch API',
	Screenshot: '截图',
	'Screenshot Element': '元素截图',
	Evaluate: '执行 JavaScript',
	'Run JavaScript': '运行 JavaScript',
	'Run JavaScript File': '运行 JS 文件',
	'Run Script': '运行控制台脚本',
	'New Page': '新建标签页',
	'Close Page': '关闭标签页',
	'Switch Page': '切换标签页',
	'List Pages': '列出标签页',
	'Session Check': '检查会话',
	...SAP_OP_NAME_ZH,
};

/** Action label translations (en -> zh) */
const ACTION_ZH = {
	'Open and connect': '打开并连接',
	'Disconnect session': '断开会话',
	'Get sessions by account': '按账户获取会话',
	'Kill SAP sessions by account': '按账户终止 SAP 会话',
	'Kill all SAP sessions': '终止所有 SAP 会话',
	'Send log': '发送日志',
	'Send ROS Wecom message': '发送 ROS 企业微信消息',
	'Send Wecom group message': '发送企业微信群消息',
	'Connect session': '连接会话',
	'Reconnect session': '重新连接会话',
	'Check session alive': '检查会话是否存活',
	'Check element exists': '检查元素是否存在',
	'Find element ids by pattern': '按模式查找元素 ID',
	'Set text': '设置文本',
	'Set many texts': '批量设置文本',
	'Get text': '获取文本',
	'Clear field': '清除字段',
	'Set text and enter': '设置文本并回车',
	'Set focus': '设置焦点',
	'Get caret position': '获取光标位置',
	'Set caret position': '设置光标位置',
	Click: '点击',
	'Double-click element': '双击元素',
	'Click by tooltip': '按工具提示点击',
	'Send Enter': '发送 Enter',
	'Send VKey': '发送虚拟键',
	'Press toolbar button': '按工具栏按钮',
	'Press shell button': '按 Shell 按钮',
	'Scroll page (vertical scrollbar)': '滚动页面（垂直滚动条）',
	'Reset vertical scrollbar to top': '重置垂直滚动条到顶部',
	'Set checkbox': '设置复选框',
	'Set many checkboxes': '批量设置复选框',
	'Get checkbox': '获取复选框',
	'Select radio': '选择单选按钮',
	'Select combo by key': '按键选择下拉项',
	'Select combo by text': '按文本选择下拉项',
	'Get selected key': '获取选中键',
	'Get selected text': '获取选中文本',
	'Get combo options': '获取下拉选项',
	'Execute T-code': '执行事务码',
	'Select tab': '选择选项卡',
	'Reset to main menu': '返回主菜单',
	'Go back': '后退',
	'Open new session': '打开新会话',
	'Connect browser': '连接浏览器',
	'Check session': '检查会话',
	'Kill all web sessions': '终止所有 Web 会话',
	'Navigate to URL': '导航到 URL',
	'Go forward': '前进',
	'Reload page': '刷新页面',
	'Click element': '点击元素',
	'Double-click element': '双击元素',
	'Fill input': '填充输入框',
	'Type text': '输入文本',
	'Press key': '按键',
	'Select option': '选择选项',
	'Check checkbox': '勾选复选框',
	'Uncheck checkbox': '取消勾选',
	'Hover element': '悬停元素',
	'Set input files': '设置上传文件',
	'Get inner text': '获取 innerText',
	'Get input value': '获取输入值',
	'Get attribute': '获取属性',
	'Get page title': '获取页面标题',
	'Get current URL': '获取当前 URL',
	'Get page content': '获取页面内容',
	'Download full HTML': '下载完整 HTML',
	'Find elements': '查找元素',
	'Get element HTML': '获取元素 HTML',
	'Is visible': '是否可见',
	'Is checked': '是否已选',
	'Is enabled': '是否启用',
	'Wait for selector': '等待选择器',
	'Wait for load state': '等待加载状态',
	'Wait fixed time': '固定等待',
	'Fetch API in session': '在会话中 Fetch API',
	'Screenshot page': '页面截图',
	'Screenshot element': '元素截图',
	'Evaluate JavaScript': '执行 JavaScript',
	'Run JavaScript': '运行 JavaScript',
	'Run JS file': '运行 JS 文件',
	'Run console script': '运行控制台脚本',
	'Open new tab': '打开新标签页',
	'Close tab': '关闭标签页',
	'Switch tab': '切换标签页',
	'List tabs': '列出标签页',
	...SAP_ACTION_ZH,
};

function translateLabel(text, locale) {
	if (!text) return text;
	if (locale === 'zh') {
		return LABEL_ZH[text] ?? OP_NAME_ZH[text] ?? SAP_OP_NAME_ZH[text] ?? text;
	}
	if (locale === 'vi') {
		return LABEL_VI[text] ?? OP_NAME_VI[text] ?? SAP_OP_NAME_VI[text] ?? text;
	}
	return text;
}

function translateDescription(text, locale) {
	if (!text || locale === 'vi') return text;
	if (locale !== 'zh') return text;

	let result = text
		.replace(/Bắt buộc từ JSON input item/g, '必填：来自输入项 JSON')
		.replace(/Tùy chọn/g, '可选')
		.replace(/mặc định/g, '默认')
		.replace(/Khi bật/g, '启用时')
		.replace(/node có 2 output/g, '节点有 2 个输出')
		.replace(/Success \(response\.Success === true\)/g, 'Success（response.Success === true）')
		.replace(/Failed \(còn lại\)/g, 'Failed（其余情况）')
		.replace(/một output/g, '一个输出')
		.replace(/đóng một session/g, '关闭一个会话')
		.replace(/đóng hết/g, '关闭全部')
		.replace(/đóng mọi session SAP trên host \(không đóng web\/file\)/g, '关闭主机上所有 SAP 会话（不关闭 web/file）')
		.replace(/liệt kê session SAP theo server\/client\/username/g, '按 server/client/username 列出 SAP 会话')
		.replace(/đóng hết session SAP của một tài khoản/g, '关闭某账户的全部 SAP 会话')
		.replace(/theo sessionId/g, '按 sessionId')
		.replace(/mở browser Playwright với sessionId \(GUID\)/g, '用 sessionId (GUID) 打开 Playwright 浏览器')
		.replace(/đóng browser và giải phóng session/g, '关闭浏览器并释放会话')
		.replace(/kiểm tra session còn active/g, '检查会话是否仍活跃')
		.replace(/đóng hết browser web \(headless \+ có UI\)\. Không cần sessionId\./g, '关闭全部 Web 浏览器（headless + 有 UI）。无需 sessionId。')
		.replace(/Đường dẫn control SAP \(tham số id\)/g, 'SAP 控件路径（id 参数）')
		.replace(/Ghi chú tùy chọn gửi trong body \(reason\)/g, '可选备注，随 body 发送（reason）')
		.replace(/Tên connection SAP Logon/g, 'SAP Logon 连接名')
		.replace(/Tên đăng nhập SAP/g, 'SAP 登录用户名')
		.replace(/Để trống = không ngắt session theo idle/g, '留空 = 不按空闲断开会话')
		.replace(/Để trống = server mặc định 5 phút/g, '留空 = 服务器默认 5 分钟');

	// Strip remaining Vietnamese sentence fragments by keeping API/technical parts only when mixed
	if (/[àáâãèéêìíòóôõùúýăđĩũơưắằẳẵặấầẩẫậếềểễệốồổộớờởỡợụủứừửữự]/i.test(result)) {
		const apiMatch = result.match(/(POST|GET|PUT|PATCH|DELETE|https?:\/\/[^\s—]+|\/[\w-]+(?:\/[\w-*]+)*)/);
		if (apiMatch) {
			return apiMatch[0];
		}
	}

	return result;
}

function translateAction(text, locale) {
	if (!text) return text;
	if (locale === 'zh') {
		return (
			ACTION_ZH[text] ??
			SAP_ACTION_ZH[text] ??
			OP_NAME_ZH[text] ??
			SAP_OP_NAME_ZH[text] ??
			translateLabel(text, locale) ??
			text
		);
	}
	if (locale === 'vi') {
		return (
			ACTION_VI[text] ??
			SAP_ACTION_VI[text] ??
			OP_NAME_VI[text] ??
			SAP_OP_NAME_VI[text] ??
			translateLabel(text, locale) ??
			text
		);
	}
	return text;
}

/** Escape `{` / `}` / `@` so vue-i18n message compiler treats them as literals (n8n convention). */
function escapeForVueI18n(text) {
	if (!text || typeof text !== 'string') return text;
	if (!/[{}@]/.test(text)) return text;
	const OPEN = '\u0000LB\u0000';
	const CLOSE = '\u0000RB\u0000';
	const AT = '\u0000AT\u0000';
	return text
		.replace(/\}/g, CLOSE)
		.replace(/\{/g, OPEN)
		.replace(/@/g, AT)
		.replaceAll(CLOSE, "{'}'}")
		.replaceAll(OPEN, "{'{'}")
		.replaceAll(AT, "{'@'}");
}

function escapeTranslationObject(value) {
	if (typeof value === 'string') return escapeForVueI18n(value);
	if (Array.isArray(value)) return value.map(escapeTranslationObject);
	if (value && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, nested]) => [key, escapeTranslationObject(nested)]),
		);
	}
	return value;
}

function propertyToNodeView(prop, locale) {
	const entry = {};

	if (prop.displayName) {
		entry.displayName = translateLabel(prop.displayName, locale);
	}
	if (prop.description) {
		entry.description = translateDescription(prop.description, locale);
	}
	if (prop.placeholder) {
		entry.placeholder = prop.placeholder;
	}
	if (prop.hint) {
		entry.hint = prop.hint;
	}

	if (prop.type === 'options' && Array.isArray(prop.options)) {
		entry.options = {};
		for (const opt of prop.options) {
			const optEntry = {};
			if (opt.name) {
				const opNameMap =
					locale === 'vi'
						? { ...OP_NAME_VI, ...SAP_OP_NAME_VI }
						: { ...OP_NAME_ZH, ...SAP_OP_NAME_ZH };
				optEntry.displayName = translateLabel(opt.name, locale) ?? opNameMap[opt.name] ?? opt.name;
			}
			if (opt.description) {
				optEntry.description = translateDescription(opt.description, locale);
			}
			if (opt.action) {
				optEntry.action = translateAction(opt.action, locale);
			}
			entry.options[opt.value] = optEntry;
		}
	}

	return entry;
}

function buildNodeView(properties, locale) {
	const nodeView = {};
	for (const prop of properties) {
		if (!prop.name) continue;
		nodeView[prop.name] = propertyToNodeView(prop, locale);
	}
	return nodeView;
}

for (const node of NODES) {
	const sourcePath = join(ktNodeRoot, node.ktFolder, `${node.ktFolder}.node.json`);
	if (!existsSync(sourcePath)) {
		console.warn(`Skip ${node.nodeKey}: missing KT-Node source ${sourcePath}`);
		continue;
	}
	const source = JSON.parse(readFileSync(sourcePath, 'utf8'));

	for (const locale of ['zh', 'vi']) {
		const translation = escapeTranslationObject({
			header: node.header[locale],
			nodeView: buildNodeView(source.properties ?? [], locale),
		});

		const outDir = join(root, 'src', 'nodes', node.ktFolder, 'translations', locale);
		mkdirSync(outDir, { recursive: true });
		const outPath = join(outDir, `${node.nodeKey}.json`);
		writeFileSync(outPath, `${JSON.stringify(translation, null, '\t')}\n`, 'utf8');
		console.log(`Wrote ${outPath}`);
	}
}

console.log('Translation generation complete.');
