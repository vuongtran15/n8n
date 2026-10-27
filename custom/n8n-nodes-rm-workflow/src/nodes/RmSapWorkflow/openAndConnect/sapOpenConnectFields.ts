import type { INodeProperties } from 'n8n-workflow';

import { getSapCommandShortcutProperties } from '../command/sapCommandFields';
import { WECOM_OPERATIONS } from '../shared/sapSessionContext';

/** Dùng cho mọi operation (kết nối HTTP + sessionId truyền qua input JSON). */
const sapSessionCommonFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Connection Fields Source',
		name: 'connectionFieldsSourceInfo',
		type: 'notice',
		default: '',
		typeOptions: {
			theme: 'info',
		},
		description:
			'Bắt buộc từ JSON input item: baseUrl, apiKey, sessionId (trừ Session By Account / Kill By Account / Kill All Sessions). Tùy chọn: requestTimeoutSeconds (giây, mặc định 600), logUrl.',
	},
];

const openConnectOnlyFields: Array<Omit<INodeProperties, 'displayOptions'>> = [
	{
		displayName: 'Server',
		name: 'server',
		type: 'string',
		default: '',
		description: 'Tên connection SAP Logon (Open and Connect, Session By Account, Kill By Account)',
	},
	{
		displayName: 'Client',
		name: 'client',
		type: 'string',
		default: '',
		description: 'SAP client (ví dụ 800)',
	},
	{
		displayName: 'Username',
		name: 'username',
		type: 'string',
		default: '',
		description: 'Tên đăng nhập SAP',
	},
	{
		displayName: 'Password',
		name: 'password',
		type: 'string',
		typeOptions: {
			password: true,
		},
		default: '',
	},
	{
		displayName: 'Multi Logon Action',
		name: 'multiLogonAction',
		type: 'string',
		default: 'opt2',
		placeholder: 'opt2',
		hint: 'opt1, opt2, opt3',
		description:
			'Hành vi popup multi-logon SAP. Mặc định opt2 (giữ session khác). Gửi trong body POST open-and-connect.',
	},
	{
		displayName: 'Language',
		name: 'language',
		type: 'string',
		default: 'EN',
		description: 'Không gửi trong API được coi là EN — mặc định EN',
	},
	{
		displayName: 'Idle Timeout (Minutes)',
		name: 'idleTimeoutMinutes',
		type: 'string',
		default: '',
		placeholder: 'Để trống = không ngắt session theo idle',
		description:
			'Tùy chọn. Để trống: không gửi field idleTimeoutMinutes → server không áp idle disconnect theo ô này. Nhập số nguyên > 0 để sau bấy nhiêu phút không có request thì có thể disconnect (tùy server).',
	},
];

const showOpenConnect = {
	show: {
		operation: ['openAndConnect'],
	},
};

const showAccountFields = {
	show: {
		operation: ['openAndConnect', 'sessionByAccount', 'killByAccount'],
	},
};

const showKillReason = {
	show: {
		operation: ['killByAccount', 'killAllSapSessions'],
	},
};

const hideWecomOps = {
	hide: {
		operation: [...WECOM_OPERATIONS],
	},
};

/** Field RM SAP (Open and Connect + Command shortcuts). */
export function getSapSessionPropertiesForWorkflow(): INodeProperties[] {
	return [
		...sapSessionCommonFields.map((p) => ({
			...p,
			displayOptions: hideWecomOps,
		})) as INodeProperties[],
		...openConnectOnlyFields.map((p) => {
			const isAccountField = ['server', 'client', 'username'].includes(p.name ?? '');
			return {
				...p,
				displayOptions: isAccountField ? showAccountFields : showOpenConnect,
			};
		}) as INodeProperties[],
		{
			displayName: 'Reason',
			name: 'killReason',
			type: 'string',
			default: '',
			placeholder: 'batch cleanup',
			description: 'Ghi chú tùy chọn gửi trong body (reason) khi đóng session SAP.',
			displayOptions: showKillReason,
		},
		...getSapCommandShortcutProperties(),
	];
}
