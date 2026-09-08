import type { INodeProperties } from 'n8n-workflow';

import { getFileCommandShortcutProperties } from '../command/fileCommandFields';

/** Dùng cho mọi operation (kết nối HTTP + sessionId từ input JSON). */
const fileSessionCommonFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Connection Fields Source',
		name: 'connectionFieldsSourceInfo',
		type: 'notice',
		default: '',
		typeOptions: {
			theme: 'info',
		},
		description:
			'Bắt buộc từ JSON input: baseUrl, apiKey. sessionId bắt buộc trừ Function List. Connect cần thêm Root Directory trên máy worker. Tùy chọn: requestTimeoutSeconds, logUrl.',
	},
];

const connectOnlyFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Root Directory',
		name: 'rootDirectory',
		type: 'string',
		default: '',
		required: true,
		placeholder: 'D:\\Data\\Sandbox',
		description:
			'Thư mục gốc sandbox trên máy worker (phải tồn tại). Mọi path file/Excel phải nằm trong root này.',
	},
	{
		displayName: 'Idle Timeout (Minutes)',
		name: 'idleTimeoutMinutes',
		type: 'string',
		default: '',
		placeholder: 'Để trống = không auto-idle',
		description:
			'Tùy chọn. Số phút không có request thì tự disconnect session. Để trống = không gửi (không auto-idle).',
	},
];

const showConnect = {
	show: {
		operation: ['connect'],
	},
};

/** Field RM FILE AUTO (Connect + Command shortcuts + Excel). */
export function getFileSessionPropertiesForWorkflow(): INodeProperties[] {
	return [
		...(fileSessionCommonFields.map((p) => ({ ...p })) as INodeProperties[]),
		...(connectOnlyFields.map((p) => ({
			...p,
			displayOptions: showConnect,
		})) as INodeProperties[]),
		...getFileCommandShortcutProperties(),
	];
}
