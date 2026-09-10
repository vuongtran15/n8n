/** Cách build paramObject cho POST /outlook-auto/command */
export type OutlookCommandParamKind =
	| 'none'
	| 'folderPathOptional'
	| 'folderPathRequired'
	| 'listMails'
	| 'searchMails'
	| 'entryId'
	| 'sendMail'
	| 'replyMail'
	| 'forwardMail'
	| 'markAsRead'
	| 'moveMail'
	| 'deleteMail'
	| 'saveAttachment'
	| 'saveAllAttachments'
	| 'captureMail'
	| 'closeInspector'
	| 'closeAllInspectors'
	| 'sendKeys'
	| 'sendKeySequence';

export interface OutlookCommandDefinition {
	operation: string;
	function: string;
	displayName: string;
	description: string;
	action: string;
	params: OutlookCommandParamKind;
}

/** Một nguồn cho operation → OutlookAutomationManager function (HTTP reflection). */
export const OUTLOOK_COMMAND_DEFINITIONS: OutlookCommandDefinition[] = [
	{
		operation: 'getSessionInfo',
		function: 'GetSessionInfo',
		displayName: 'Get Session Info',
		description: 'Lấy thông tin session Outlook: profile, CurrentUser, store. Không cần param.',
		action: 'Get session info',
		params: 'none',
	},
	{
		operation: 'listFolders',
		function: 'ListFolders',
		displayName: 'List Folders',
		description:
			'Liệt kê thư mục con. folderPath tùy chọn (mặc định Inbox), vd Inbox, Inbox/SubFolder.',
		action: 'List folders',
		params: 'folderPathOptional',
	},
	{
		operation: 'openFolder',
		function: 'OpenFolder',
		displayName: 'Open Folder',
		description: 'Đặt CurrentFolder trên Explorer. folderPath bắt buộc (Inbox, Sent, …).',
		action: 'Open folder',
		params: 'folderPathRequired',
	},
	{
		operation: 'listMails',
		function: 'ListMails',
		displayName: 'List Mails',
		description:
			'Liệt kê mail trong folder. Tham số: folderPath, maxCount, unreadOnly, subjectContains.',
		action: 'List mails',
		params: 'listMails',
	},
	{
		operation: 'searchMails',
		function: 'SearchMails',
		displayName: 'Search Mails',
		description:
			'Tìm mail theo filterOrSubject (bắt buộc). Tùy chọn folderPath, maxCount.',
		action: 'Search mails',
		params: 'searchMails',
	},
	{
		operation: 'readMail',
		function: 'ReadMail',
		displayName: 'Read Mail',
		description: 'Đọc subject/body/html/attachments theo entryId (bắt buộc).',
		action: 'Read mail',
		params: 'entryId',
	},
	{
		operation: 'displayMail',
		function: 'DisplayMail',
		displayName: 'Display Mail',
		description: 'Mở Inspector xem mail theo entryId.',
		action: 'Display mail',
		params: 'entryId',
	},
	{
		operation: 'captureMail',
		function: 'CaptureMail',
		displayName: 'Capture Mail',
		description:
			'Chụp/lưu email ra file. format: png / html / msg. Đường dẫn: savePath hoặc saveDirectory + fileName ({subject} {date} {time} {entryId}). overwrite mặc định true.',
		action: 'Capture mail',
		params: 'captureMail',
	},
	{
		operation: 'getSelectedMail',
		function: 'GetSelectedMail',
		displayName: 'Get Selected Mail',
		description: 'Lấy mail đang chọn trên Explorer. Không cần param.',
		action: 'Get selected mail',
		params: 'none',
	},
	{
		operation: 'sendMail',
		function: 'SendMail',
		displayName: 'Send Mail',
		description:
			'Tạo & gửi mail. to bắt buộc; subject, body, htmlBody, cc, bcc, attachmentPaths tùy chọn. sendImmediately=true để gửi ngay (mặc định).',
		action: 'Send mail',
		params: 'sendMail',
	},
	{
		operation: 'replyMail',
		function: 'ReplyMail',
		displayName: 'Reply Mail',
		description:
			'Trả lời mail theo entryId. body tùy chọn; replyAll, sendImmediately.',
		action: 'Reply mail',
		params: 'replyMail',
	},
	{
		operation: 'forwardMail',
		function: 'ForwardMail',
		displayName: 'Forward Mail',
		description: 'Chuyển tiếp mail: entryId + to bắt buộc; body, sendImmediately tùy chọn.',
		action: 'Forward mail',
		params: 'forwardMail',
	},
	{
		operation: 'markAsRead',
		function: 'MarkAsRead',
		displayName: 'Mark As Read',
		description: 'Đánh dấu đã đọc / chưa đọc theo entryId + isRead.',
		action: 'Mark as read',
		params: 'markAsRead',
	},
	{
		operation: 'moveMail',
		function: 'MoveMail',
		displayName: 'Move Mail',
		description: 'Chuyển mail: entryId + destinationFolderPath bắt buộc.',
		action: 'Move mail',
		params: 'moveMail',
	},
	{
		operation: 'deleteMail',
		function: 'DeleteMail',
		displayName: 'Delete Mail',
		description: 'Xóa mail theo entryId. permanent=true xóa vĩnh viễn.',
		action: 'Delete mail',
		params: 'deleteMail',
	},
	{
		operation: 'saveAttachment',
		function: 'SaveAttachment',
		displayName: 'Save Attachment',
		description:
			'Lưu file đính kèm ra đĩa worker: entryId + attachmentKey + saveDirectory. overwrite=true (mặc định) ghi đè; false → ten_2.ext …',
		action: 'Save attachment',
		params: 'saveAttachment',
	},
	{
		operation: 'saveAllAttachments',
		function: 'SaveAllAttachments',
		displayName: 'Save All Attachments',
		description:
			'Lưu tất cả đính kèm ra saveDirectory. skipEmbedded=true bỏ ảnh inline. overwrite=true ghi đè; false → ten_2.ext …. Trả SavedFiles[], SavedCount.',
		action: 'Save all attachments',
		params: 'saveAllAttachments',
	},
	{
		operation: 'activateOutlook',
		function: 'ActivateOutlook',
		displayName: 'Activate Outlook',
		description: 'Đưa cửa sổ Outlook lên trước. Không cần param.',
		action: 'Activate Outlook',
		params: 'none',
	},
	{
		operation: 'closeInspector',
		function: 'CloseInspector',
		displayName: 'Close Inspector',
		description:
			'Đóng cửa sổ email. entryId tùy chọn; saveOption: discard / save / prompt.',
		action: 'Close inspector',
		params: 'closeInspector',
	},
	{
		operation: 'closeAllInspectors',
		function: 'CloseAllInspectors',
		displayName: 'Close All Inspectors',
		description: 'Đóng mọi Inspector. saveOption: discard / save / prompt.',
		action: 'Close all inspectors',
		params: 'closeAllInspectors',
	},
	{
		operation: 'sendKeys',
		function: 'SendKeys',
		displayName: 'Send Keys',
		description: 'Gửi một chuỗi SendKeys (keys bắt buộc). activateFirst tùy chọn.',
		action: 'Send keys',
		params: 'sendKeys',
	},
	{
		operation: 'sendKeySequence',
		function: 'SendKeySequence',
		displayName: 'Send Key Sequence',
		description:
			'Chuỗi bước cách || + {WAIT:ms}. sequence bắt buộc; activateFirst tùy chọn.',
		action: 'Send key sequence',
		params: 'sendKeySequence',
	},
];

export const OUTLOOK_COMMAND_FUNCTION: Record<string, string> = Object.fromEntries(
	OUTLOOK_COMMAND_DEFINITIONS.map((d) => [d.operation, d.function]),
);

export const OUTLOOK_COMMAND_PARAM_KIND: Record<string, OutlookCommandParamKind> = Object.fromEntries(
	OUTLOOK_COMMAND_DEFINITIONS.map((d) => [d.operation, d.params]),
);

/** Gom operation theo param kind (cho displayOptions field). */
export function operationsWithParamKind(...kinds: OutlookCommandParamKind[]): string[] {
	return OUTLOOK_COMMAND_DEFINITIONS.filter((d) => kinds.includes(d.params)).map((d) => d.operation);
}
