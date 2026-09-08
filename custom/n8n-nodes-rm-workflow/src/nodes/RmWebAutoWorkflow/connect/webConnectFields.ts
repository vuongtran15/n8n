import type { INodeProperties } from 'n8n-workflow';

import { getWebCommandShortcutProperties } from '../command/webCommandFields';

/** Dùng cho mọi operation (kết nối HTTP + sessionId truyền qua input JSON). */
const webSessionCommonFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Connection Fields Source',
		name: 'connectionFieldsSourceInfo',
		type: 'notice',
		default: '',
		typeOptions: {
			theme: 'info',
		},
		description:
			'Bắt buộc từ JSON input item: baseUrl, apiKey. sessionId bắt buộc cho mọi operation trừ Kill All Sessions. Tùy chọn: requestTimeoutSeconds (giây, mặc định 600 = 10 phút), logUrl.',
	},
];

const connectOnlyFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Browser Type',
		name: 'browserType',
		type: 'options',
		options: [
			{ name: 'Chromium', value: 'chromium' },
			{ name: 'Firefox', value: 'firefox' },
			{ name: 'WebKit', value: 'webkit' },
		],
		default: 'chromium',
		description: 'Engine Playwright: chromium, firefox, webkit.',
	},
	{
		displayName: 'Headless',
		name: 'headless',
		type: 'boolean',
		default: false,
		description:
			'true = browser chạy ẩn trên máy worker; false = hiện cửa sổ (cần RDP/màn hình máy server).',
	},
	{
		displayName: 'Start URL',
		name: 'startUrl',
		type: 'string',
		default: '',
		placeholder: 'https://example.com/login',
		description: 'URL mở ngay sau khi launch browser (tùy chọn).',
	},
	{
		displayName: 'Viewport Width',
		name: 'viewportWidth',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 1920,
		placeholder: '1920',
		description: 'Chiều rộng viewport (px). Mặc định 1920. Đặt 0 = không gửi (cần cả Width và Height > 0).',
	},
	{
		displayName: 'Viewport Height',
		name: 'viewportHeight',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 1080,
		placeholder: '1080',
		description: 'Chiều cao viewport (px). Mặc định 1080. Đặt 0 = không gửi.',
	},
	{
		displayName: 'Slow Mo (Ms)',
		name: 'slowMo',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		placeholder: '0 = không gửi',
		description: 'Làm chậm mỗi thao tác Playwright (ms) — hữu ích khi debug.',
	},
	{
		displayName: 'User Agent',
		name: 'userAgent',
		type: 'string',
		default: '',
		description: 'User-Agent tùy chỉnh (tùy chọn).',
	},
	{
		displayName: 'Default Timeout (Ms)',
		name: 'defaultTimeoutMs',
		type: 'number',
		typeOptions: { minValue: 0 },
		default: 0,
		placeholder: '0 = không gửi (Playwright default)',
		description: 'Timeout mặc định cho selector/navigation (ms) áp dụng cho session này.',
	},
	{
		displayName: 'Idle Timeout (Minutes)',
		name: 'idleTimeoutMinutes',
		type: 'string',
		default: '',
		placeholder: 'Để trống = server mặc định 5 phút',
		description:
			'Phút không có request thì tự đóng browser. Để trống = server dùng mặc định (5 phút).',
	},
];

const showConnect = {
	show: {
		operation: ['connect'],
	},
};

const showKillAll = {
	show: {
		operation: ['killAllSessions'],
	},
};

/** Field RM WEB AUTO (Connect + Command shortcuts). */
export function getWebSessionPropertiesForWorkflow(): INodeProperties[] {
	return [
		...webSessionCommonFields.map((p) => ({ ...p })) as INodeProperties[],
		...connectOnlyFields.map((p) => ({
			...p,
			displayOptions: showConnect,
		})) as INodeProperties[],
		{
			displayName: 'Reason',
			name: 'killAllReason',
			type: 'string',
			default: '',
			placeholder: 'cleanup',
			description: 'Ghi chú tùy chọn gửi trong body (reason) khi đóng hết session web.',
			displayOptions: showKillAll,
		},
		...getWebCommandShortcutProperties(),
	];
}
