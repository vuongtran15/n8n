import type { INodeProperties } from 'n8n-workflow';

import { operationsWithParamKind } from './outlookCommandRegistry';

function op(...operations: string[]): INodeProperties['displayOptions'] {
	return {
		show: {
			operation: operations,
		},
	};
}

const FOLDER_PATH_OPS = operationsWithParamKind(
	'folderPathOptional',
	'folderPathRequired',
	'listMails',
	'searchMails',
);
const LIST_MAILS_OPS = operationsWithParamKind('listMails');
const SEARCH_MAILS_OPS = operationsWithParamKind('searchMails');
const ENTRY_ID_OPS = operationsWithParamKind(
	'entryId',
	'replyMail',
	'forwardMail',
	'markAsRead',
	'moveMail',
	'deleteMail',
	'saveAttachment',
	'saveAllAttachments',
	'closeInspector',
);
const SEND_MAIL_OPS = operationsWithParamKind('sendMail');
const FORWARD_MAIL_OPS = operationsWithParamKind('forwardMail');
const REPLY_MAIL_OPS = operationsWithParamKind('replyMail');
const REPLY_OR_FORWARD_OPS = operationsWithParamKind('replyMail', 'forwardMail');
const MARK_AS_READ_OPS = operationsWithParamKind('markAsRead');
const MOVE_MAIL_OPS = operationsWithParamKind('moveMail');
const DELETE_MAIL_OPS = operationsWithParamKind('deleteMail');
const SAVE_ATTACHMENT_OPS = operationsWithParamKind('saveAttachment');
const SAVE_ALL_ATTACHMENTS_OPS = operationsWithParamKind('saveAllAttachments');
const SAVE_DIR_OPS = operationsWithParamKind('saveAttachment', 'saveAllAttachments');
const CLOSE_INSPECTOR_OPS = operationsWithParamKind('closeInspector', 'closeAllInspectors');
const SEND_KEYS_OPS = operationsWithParamKind('sendKeys');
const SEND_KEY_SEQUENCE_OPS = operationsWithParamKind('sendKeySequence');
const KEYS_ACTIVATE_OPS = operationsWithParamKind('sendKeys', 'sendKeySequence');

/** Field bổ sung cho POST /outlook-auto/command (không gồm block Connect). */
export function getOutlookCommandShortcutProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Command Params Source',
			name: 'commandParamsSourceInfo',
			type: 'notice',
			default: '',
			typeOptions: {
				theme: 'info',
			},
			description:
				'Tham số command có thể lấy từ JSON input item (ưu tiên hơn form). Ví dụ: entryId, folderPath, to, subject, body, …',
			displayOptions: op(
				...operationsWithParamKind(
					'folderPathOptional',
					'folderPathRequired',
					'listMails',
					'searchMails',
					'entryId',
					'sendMail',
					'replyMail',
					'forwardMail',
					'markAsRead',
					'moveMail',
					'deleteMail',
					'saveAttachment',
					'saveAllAttachments',
					'closeInspector',
					'closeAllInspectors',
					'sendKeys',
					'sendKeySequence',
				),
			),
		},
		{
			displayName: 'Folder Path',
			name: 'folderPath',
			type: 'string',
			default: '',
			placeholder: 'Inbox, Sent, Inbox/SubFolder',
			description: 'Đường dẫn thư mục Outlook (Inbox, Sent Items, …).',
			displayOptions: op(...FOLDER_PATH_OPS),
		},
		{
			displayName: 'Max Count',
			name: 'maxCount',
			type: 'string',
			default: '',
			placeholder: '20',
			description: 'Số mail tối đa trả về (List / Search). Để trống = server mặc định.',
			displayOptions: op(...LIST_MAILS_OPS, ...SEARCH_MAILS_OPS),
		},
		{
			displayName: 'Unread Only',
			name: 'unreadOnly',
			type: 'boolean',
			default: false,
			description: 'true = chỉ liệt kê mail chưa đọc (List Mails).',
			displayOptions: op(...LIST_MAILS_OPS),
		},
		{
			displayName: 'Subject Contains',
			name: 'subjectContains',
			type: 'string',
			default: '',
			description: 'Lọc subject chứa chuỗi (List Mails).',
			displayOptions: op(...LIST_MAILS_OPS),
		},
		{
			displayName: 'Filter / Subject',
			name: 'filterOrSubject',
			type: 'string',
			default: '',
			description: 'Filter hoặc subject tìm kiếm (Search Mails) — bắt buộc.',
			displayOptions: op(...SEARCH_MAILS_OPS),
		},
		{
			displayName: 'Entry ID',
			name: 'entryId',
			type: 'string',
			default: '',
			description: 'EntryID mail Outlook (Read, Reply, Move, Delete, …).',
			displayOptions: op(...ENTRY_ID_OPS),
		},
		{
			displayName: 'To',
			name: 'to',
			type: 'string',
			default: '',
			placeholder: 'user@example.com',
			description: 'Người nhận (Send Mail, Forward Mail).',
			displayOptions: op(...SEND_MAIL_OPS, ...FORWARD_MAIL_OPS),
		},
		{
			displayName: 'Subject',
			name: 'subject',
			type: 'string',
			default: '',
			description: 'Tiêu đề mail (Send Mail).',
			displayOptions: op(...SEND_MAIL_OPS),
		},
		{
			displayName: 'Body',
			name: 'body',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			description: 'Nội dung text (Send / Reply / Forward).',
			displayOptions: op(...SEND_MAIL_OPS, ...REPLY_OR_FORWARD_OPS),
		},
		{
			displayName: 'HTML Body',
			name: 'htmlBody',
			type: 'string',
			typeOptions: { rows: 4 },
			default: '',
			description: 'Nội dung HTML (Send Mail).',
			displayOptions: op(...SEND_MAIL_OPS),
		},
		{
			displayName: 'CC',
			name: 'cc',
			type: 'string',
			default: '',
			description: 'CC (Send Mail).',
			displayOptions: op(...SEND_MAIL_OPS),
		},
		{
			displayName: 'BCC',
			name: 'bcc',
			type: 'string',
			default: '',
			description: 'BCC (Send Mail).',
			displayOptions: op(...SEND_MAIL_OPS),
		},
		{
			displayName: 'Attachment Paths',
			name: 'attachmentPaths',
			type: 'string',
			default: '',
			placeholder: 'C:\\temp\\a.pdf;C:\\temp\\b.xlsx',
			description:
				'Đường dẫn file trên máy worker, nối bằng ; hoặc | (dấu phẩy cũng được chấp nhận).',
			displayOptions: op(...SEND_MAIL_OPS),
		},
		{
			displayName: 'Reply All',
			name: 'replyAll',
			type: 'boolean',
			default: false,
			description: 'true = Reply All (Reply Mail).',
			displayOptions: op(...REPLY_MAIL_OPS),
		},
		{
			displayName: 'Send Immediately',
			name: 'sendImmediately',
			type: 'boolean',
			default: true,
			description:
				'true = gửi mail ngay (Sent=true). false = chỉ mở draft/Inspector, không gửi (Displayed=true, Sent=false). Áp dụng Send / Reply / Forward.',
			displayOptions: op(...SEND_MAIL_OPS, ...REPLY_OR_FORWARD_OPS),
		},
		{
			displayName: 'Is Read',
			name: 'isRead',
			type: 'boolean',
			default: true,
			description: 'true = đánh dấu đã đọc; false = chưa đọc (Mark As Read).',
			displayOptions: op(...MARK_AS_READ_OPS),
		},
		{
			displayName: 'Destination Folder Path',
			name: 'destinationFolderPath',
			type: 'string',
			default: '',
			placeholder: 'Inbox/Archive',
			description: 'Thư mục đích khi Move Mail.',
			displayOptions: op(...MOVE_MAIL_OPS),
		},
		{
			displayName: 'Permanent',
			name: 'permanent',
			type: 'boolean',
			default: false,
			description: 'true = xóa vĩnh viễn (Delete Mail).',
			displayOptions: op(...DELETE_MAIL_OPS),
		},
		{
			displayName: 'Attachment Key',
			name: 'attachmentKey',
			type: 'string',
			default: '',
			description: 'Tên file hoặc index đính kèm (Save Attachment).',
			displayOptions: op(...SAVE_ATTACHMENT_OPS),
		},
		{
			displayName: 'Save Directory',
			name: 'saveDirectory',
			type: 'string',
			default: '',
			placeholder: 'C:\\temp\\attachments',
			description: 'Thư mục lưu trên máy worker (Save Attachment / Save All Attachments).',
			displayOptions: op(...SAVE_DIR_OPS),
		},
		{
			displayName: 'Skip Embedded',
			name: 'skipEmbedded',
			type: 'boolean',
			default: true,
			description:
				'true = bỏ ảnh OLE / chữ ký inline khi Save All Attachments. false = lưu cả file nhúng.',
			displayOptions: op(...SAVE_ALL_ATTACHMENTS_OPS),
		},
		{
			displayName: 'Save Option',
			name: 'saveOption',
			type: 'options',
			options: [
				{ name: 'Discard', value: 'discard' },
				{ name: 'Save', value: 'save' },
				{ name: 'Prompt', value: 'prompt' },
			],
			default: 'discard',
			description: 'Cách xử lý khi đóng Inspector: discard / save / prompt.',
			displayOptions: op(...CLOSE_INSPECTOR_OPS),
		},
		{
			displayName: 'Keys',
			name: 'keys',
			type: 'string',
			default: '',
			placeholder: '%{F4}',
			description: 'Chuỗi SendKeys (Send Keys).',
			displayOptions: op(...SEND_KEYS_OPS),
		},
		{
			displayName: 'Sequence',
			name: 'sequence',
			type: 'string',
			default: '',
			placeholder: '^{a}||{WAIT:500}||^{c}',
			description: 'Chuỗi bước cách || + {WAIT:ms} (Send Key Sequence).',
			displayOptions: op(...SEND_KEY_SEQUENCE_OPS),
		},
		{
			displayName: 'Activate First',
			name: 'activateFirst',
			type: 'boolean',
			default: true,
			description: 'true = ActivateOutlook trước khi gửi phím.',
			displayOptions: op(...KEYS_ACTIVATE_OPS),
		},
	];
}
