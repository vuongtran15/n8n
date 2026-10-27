import {
	NodeConnectionTypes,
	NodeOperationError,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

function trimOrEmpty(value: unknown): string {
	if (value === undefined || value === null) return '';
	return String(value).trim();
}

const showWhenSapEnabled = {
	show: {
		enableSapOptions: [true],
	},
};

/**
 * RM Workflow — Init
 * Xuất JSON kết nối tool (baseUrl, apiKey, sessionId) + tùy chọn thông tin SAP.
 */
export class RmInit implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM Init',
		name: 'rmInit',
		icon: { light: 'file:icon.svg', dark: 'file:icon.dark.svg' },
		iconColor: 'pink-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["baseUrl"]}}',
		description:
			'Initialize baseUrl, apiKey, sessionId (and optional SAP details) for the following RM nodes',
		defaults: {
			name: 'RM Init',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RM', 'Init', 'SAP', 'session', 'apiKey', 'baseUrl'],
		},
		properties: [
			{
				displayName: 'Tool Connection',
				name: 'toolConnectionNotice',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'Các ô có dấu * là bắt buộc. Session ID dạng GUID — bấm Random Session ID để tạo mới.',
			},
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'http://172.x.x.x:port',
				description: 'Host SAP/Web Automation API (cũng nhận alias host / baseURL trên JSON)',
			},
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				description: 'Header api-key khi gọi tool API',
			},
			{
				displayName: 'Session ID',
				name: 'sessionId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
				description: 'GUID phiên dùng xuyên suốt các node RM tiếp theo (có thể sửa tay hoặc Random)',
			},
			{
				displayName: 'Random Session ID',
				name: 'randomSessionId',
				type: 'button',
				default: '',
				description: 'Tạo Session ID mới dạng GUID',
				typeOptions: {
					buttonConfig: {
						label: 'Random Session ID',
						hasInputField: false,
						action: {
							type: 'generateUuid',
							target: 'sessionId',
						},
					},
				},
			},
			{
				displayName: 'Request Timeout (Seconds)',
				name: 'requestTimeoutSeconds',
				type: 'number',
				default: 600,
				description: 'Tùy chọn. Timeout axios khi gọi API (mặc định 600)',
				typeOptions: {
					minValue: 1,
				},
			},
			{
				displayName: 'Log URL',
				name: 'logUrl',
				type: 'string',
				default: '',
				placeholder: 'https://…/log-callback',
				description: 'Tùy chọn. Callback log (logUrl / logCallbackUrl)',
			},
			{
				displayName: 'Enable SAP Options',
				name: 'enableSapOptions',
				type: 'boolean',
				default: false,
				description:
					'Bật để nhập thông tin kết nối SAP (không bắt buộc). Dùng khi workflow sẽ Open and Connect.',
			},
			{
				displayName: 'SAP Connection',
				name: 'sapOptionalNotice',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				displayOptions: showWhenSapEnabled,
				description:
					'Các field SAP dưới đây không bắt buộc. Chỉ điền những gì cần cho Open and Connect.',
			},
			{
				displayName: 'Server',
				name: 'server',
				type: 'string',
				default: '',
				displayOptions: showWhenSapEnabled,
				description: 'Tên connection SAP Logon',
			},
			{
				displayName: 'Client',
				name: 'client',
				type: 'string',
				default: '',
				placeholder: '800',
				displayOptions: showWhenSapEnabled,
				description: 'SAP client',
			},
			{
				displayName: 'Username',
				name: 'username',
				type: 'string',
				default: '',
				displayOptions: showWhenSapEnabled,
				description: 'Tên đăng nhập SAP',
			},
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				displayOptions: showWhenSapEnabled,
				description: 'Mật khẩu SAP',
			},
			{
				displayName: 'Multi Logon Action',
				name: 'multiLogonAction',
				type: 'string',
				default: '',
				placeholder: 'opt2',
				displayOptions: showWhenSapEnabled,
				description: 'Tùy chọn. Hành vi multi-logon (opt1 / opt2 / opt3). Để trống = không ghi vào output.',
			},
			{
				displayName: 'Language',
				name: 'language',
				type: 'string',
				default: '',
				placeholder: 'EN',
				displayOptions: showWhenSapEnabled,
				description: 'Tùy chọn. Ngôn ngữ SAP. Để trống = không ghi vào output.',
			},
			{
				displayName: 'Idle Timeout (Minutes)',
				name: 'idleTimeoutMinutes',
				type: 'string',
				default: '',
				placeholder: 'Để trống = không gửi',
				displayOptions: showWhenSapEnabled,
				description: 'Tùy chọn. Số phút idle trước khi server có thể disconnect session.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const length = items.length > 0 ? items.length : 1;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < length; i++) {
			const incoming = (items[i]?.json ?? {}) as IDataObject;

			const baseUrl = trimOrEmpty(this.getNodeParameter('baseUrl', i, ''));
			const apiKey = trimOrEmpty(this.getNodeParameter('apiKey', i, ''));
			let sessionId = trimOrEmpty(this.getNodeParameter('sessionId', i, ''));

			const missing: string[] = [];
			if (!baseUrl) missing.push('Base URL');
			if (!apiKey) missing.push('API Key');
			if (!sessionId) missing.push('Session ID');
			if (missing.length > 0) {
				throw new NodeOperationError(
					this.getNode(),
					`Thiếu thông tin bắt buộc: ${missing.join(', ')}. Điền các ô có dấu * hoặc bấm Random Session ID.`,
					{ itemIndex: i },
				);
			}

			const requestTimeoutSeconds = this.getNodeParameter(
				'requestTimeoutSeconds',
				i,
				600,
			) as number;
			const logUrl = trimOrEmpty(this.getNodeParameter('logUrl', i, ''));
			const enableSapOptions = this.getNodeParameter('enableSapOptions', i, false) as boolean;

			const out: IDataObject = {
				...incoming,
				baseUrl,
				apiKey,
				sessionId,
			};

			if (
				typeof requestTimeoutSeconds === 'number' &&
				Number.isFinite(requestTimeoutSeconds) &&
				requestTimeoutSeconds > 0
			) {
				out.requestTimeoutSeconds = requestTimeoutSeconds;
			}
			if (logUrl) out.logUrl = logUrl;

			if (enableSapOptions) {
				const server = trimOrEmpty(this.getNodeParameter('server', i, ''));
				const client = trimOrEmpty(this.getNodeParameter('client', i, ''));
				const username = trimOrEmpty(this.getNodeParameter('username', i, ''));
				const password = trimOrEmpty(this.getNodeParameter('password', i, ''));
				const multiLogonAction = trimOrEmpty(this.getNodeParameter('multiLogonAction', i, ''));
				const language = trimOrEmpty(this.getNodeParameter('language', i, ''));
				const idleTimeoutMinutes = trimOrEmpty(this.getNodeParameter('idleTimeoutMinutes', i, ''));

				if (server) out.server = server;
				if (client) out.client = client;
				if (username) out.username = username;
				if (password) out.password = password;
				if (multiLogonAction) out.multiLogonAction = multiLogonAction;
				if (language) out.language = language;
				if (idleTimeoutMinutes) {
					const n = Number(idleTimeoutMinutes);
					out.idleTimeoutMinutes =
						Number.isFinite(n) && n > 0 ? Math.floor(n) : idleTimeoutMinutes;
				}
			}

			returnData.push({ json: out, pairedItem: { item: i } });
		}

		return [returnData];
	}
}
