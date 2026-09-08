import type { INodeProperties } from 'n8n-workflow';

import { getOutlookCommandShortcutProperties } from '../command/outlookCommandFields';

/** Dùng cho mọi operation (kết nối HTTP + sessionId truyền qua input JSON). */
const outlookSessionCommonFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Connection Fields Source',
		name: 'connectionFieldsSourceInfo',
		type: 'notice',
		default: '',
		typeOptions: {
			theme: 'info',
		},
		description:
			'Bắt buộc từ JSON input item: baseUrl, apiKey. sessionId bắt buộc cho mọi operation trừ Kill All Sessions và Function List. Tùy chọn: requestTimeoutSeconds (giây, mặc định 600 = 10 phút), logUrl.',
	},
];

const connectOnlyFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Attach Existing',
		name: 'attachExisting',
		type: 'boolean',
		default: true,
		description:
			'Gắn Outlook đang chạy; nếu không có instance thì tạo process mới. Mặc định true.',
	},
	{
		displayName: 'Visible',
		name: 'visible',
		type: 'boolean',
		default: true,
		description: 'true = hiện cửa sổ Outlook trên máy worker.',
	},
	{
		displayName: 'Profile Name',
		name: 'profileName',
		type: 'string',
		default: '',
		placeholder: 'Outlook',
		description: 'Profile MAPI tùy chọn (hiếm khi cần). Để trống = không gửi.',
	},
	{
		displayName: 'Idle Timeout (Minutes)',
		name: 'idleTimeoutMinutes',
		type: 'string',
		default: '',
		placeholder: 'Để trống = server mặc định 5 phút',
		description:
			'Phút không có request thì tự disconnect session. Để trống = server dùng mặc định (5 phút).',
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

/** Field RM OUTLOOK AUTO (Connect + Command shortcuts). */
export function getOutlookSessionPropertiesForWorkflow(): INodeProperties[] {
	return [
		...outlookSessionCommonFields.map((p) => ({ ...p })) as INodeProperties[],
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
			description: 'Ghi chú tùy chọn gửi trong body (reason) khi đóng hết session Outlook.',
			displayOptions: showKillAll,
		},
		...getOutlookCommandShortcutProperties(),
	];
}
