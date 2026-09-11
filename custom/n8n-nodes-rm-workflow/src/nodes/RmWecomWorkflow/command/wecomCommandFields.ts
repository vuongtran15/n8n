import type { INodeProperties } from 'n8n-workflow';

import { DEFAULT_WECOM_BASE_URL, DEFAULT_WECOM_TIMEOUT_SECONDS } from '../shared/wecomApi';

function op(...operations: string[]): INodeProperties['displayOptions'] {
	return { show: { operation: [...operations] } };
}

/** Field chung + theo operation. */
export function getWecomPropertiesForWorkflow(): INodeProperties[] {
	return [
		{
			displayName: 'Connection Fields Source',
			name: 'connectionFieldsSourceInfo',
			type: 'notice',
			default: '',
			typeOptions: {
				theme: 'info',
			},
			description:
				'Không cần đăng nhập / Bearer. Ưu tiên field từ JSON input item: webhook (hoặc key/id), content, mentionedList, mentionedMobileList, binaryPropertyName, filename. Markdown: content/text/markdown (mention bằng <@userid> trong content). Tùy chọn: baseUrl, requestTimeoutSeconds.',
		},
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: DEFAULT_WECOM_BASE_URL,
			placeholder: DEFAULT_WECOM_BASE_URL,
			description:
				'Portal WeCom API base (không trailing slash). Mặc định host RMAI /api/n8n/wecom.',
		},
		{
			displayName: 'Request Timeout (Seconds)',
			name: 'requestTimeoutSeconds',
			type: 'number',
			typeOptions: { minValue: 1 },
			default: DEFAULT_WECOM_TIMEOUT_SECONDS,
			description: 'Timeout HTTP gọi portal (giây).',
		},
		{
			displayName: 'Webhook',
			name: 'webhook',
			type: 'string',
			default: '',
			placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
			description:
				'Bot key (UUID) hoặc full URL https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=… Alias JSON: key, id, botid.',
			displayOptions: op('sendText', 'sendMarkdown', 'sendImage', 'sendFile'),
		},
		{
			displayName: 'Content',
			name: 'content',
			type: 'string',
			typeOptions: { rows: 8 },
			default: '',
			placeholder: 'Nội dung text hoặc markdown WeCom',
			description:
				'Send Text: plain text (alias JSON: text). Send Markdown: markdown WeCom ≤ ~4096 bytes (alias: text, markdown); @ bằng <@userid> — không dùng mentionedList.',
			displayOptions: op('sendText', 'sendMarkdown'),
		},
		{
			displayName: 'Mentioned List',
			name: 'mentionedList',
			type: 'string',
			default: '',
			placeholder: 'A123456,@all',
			description:
				'Tùy chọn. EmpId + @all (text.mentioned_list). Nhiều giá trị: phân tách bằng dấu phẩy.',
			displayOptions: op('sendText'),
		},
		{
			displayName: 'Mentioned Mobile List',
			name: 'mentionedMobileList',
			type: 'string',
			default: '',
			placeholder: '@all',
			description:
				'Tùy chọn. Chỉ EmpId + @all (SĐT bị server loại). Nhiều giá trị: phân tách bằng dấu phẩy.',
			displayOptions: op('sendText'),
		},
		{
			displayName: 'Binary Property',
			name: 'binaryPropertyName',
			type: 'string',
			default: 'data',
			placeholder: 'data',
			description:
				'Tên property binary trên input item (ảnh JPG/PNG ≤ 2 MB hoặc file ≤ 20 MB).',
			displayOptions: op('sendImage', 'sendFile'),
		},
		{
			displayName: 'Filename',
			name: 'filename',
			type: 'string',
			default: '',
			placeholder: 'bao-cao.xlsx',
			description: 'Tên hiển thị trên WeCom (tùy chọn). Để trống = dùng tên file binary.',
			displayOptions: op('sendFile'),
		},
	];
}
