/**
 * One-shot: write full vi/zh translations for RM OUTLOOK AUTO + RM Copy Context.
 * Run: node scripts/write-outlook-copy-translations.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'nodes');

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

function esc(obj) {
	if (typeof obj === 'string') return escapeForVueI18n(obj);
	if (Array.isArray(obj)) return obj.map(esc);
	if (obj && typeof obj === 'object') {
		return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, esc(v)]));
	}
	return obj;
}

function write(folder, locale, file, data) {
	const dir = join(root, folder, 'translations', locale);
	mkdirSync(dir, { recursive: true });
	const path = join(dir, file);
	writeFileSync(path, `${JSON.stringify(esc(data), null, '\t')}\n`, 'utf8');
	console.log(`Wrote ${path}`);
}

const outlookVi = {
	header: {
		displayName: 'RM OUTLOOK AUTO',
		description: 'Tự động hóa Microsoft Outlook (COM)',
	},
	nodeView: {
		operation: {
			displayName: 'Thao tác',
			options: {
				connect: {
					displayName: 'Kết nối',
					description:
						'POST /outlook-auto/connect — gắn / mở Outlook COM với sessionId (GUID)',
					action: 'Kết nối Outlook',
				},
				disconnect: {
					displayName: 'Ngắt kết nối',
					description:
						'POST /outlook-auto/disconnect — gỡ session API (không Quit Outlook nếu attach)',
					action: 'Ngắt kết nối session',
				},
				sessionCheck: {
					displayName: 'Kiểm tra session',
					description: 'POST /outlook-auto/session/check — kiểm tra session còn active',
					action: 'Kiểm tra session',
				},
				functionList: {
					displayName: 'Danh sách hàm',
					description:
						'GET /outlook-auto/function/list — liệt kê hàm runtime (không bắt buộc api-key)',
					action: 'Liệt kê hàm Outlook',
				},
				killAllSessions: {
					displayName: 'Kill tất cả session',
					description:
						'POST /outlook-auto/session/kill-all — đóng hết session Outlook API. Không cần sessionId.',
					action: 'Kill tất cả session Outlook',
				},
				getSessionInfo: {
					displayName: 'Thông tin session',
					description:
						'Lấy thông tin session Outlook: profile, CurrentUser, store. Không cần param.',
					action: 'Lấy thông tin session',
				},
				listFolders: {
					displayName: 'Liệt kê thư mục',
					description: 'Liệt kê thư mục con. folderPath tùy chọn (mặc định Inbox).',
					action: 'Liệt kê thư mục',
				},
				openFolder: {
					displayName: 'Mở thư mục',
					description: 'Đặt CurrentFolder trên Explorer. folderPath bắt buộc.',
					action: 'Mở thư mục',
				},
				listMails: {
					displayName: 'Liệt kê mail',
					description:
						'Liệt kê mail trong folder. Tham số: folderPath, maxCount, unreadOnly, subjectContains.',
					action: 'Liệt kê mail',
				},
				searchMails: {
					displayName: 'Tìm mail',
					description:
						'Tìm mail theo filterOrSubject (bắt buộc). Tùy chọn folderPath, maxCount.',
					action: 'Tìm mail',
				},
				readMail: {
					displayName: 'Đọc mail',
					description: 'Đọc subject/body/html/attachments theo entryId (bắt buộc).',
					action: 'Đọc mail',
				},
				displayMail: {
					displayName: 'Hiển thị mail',
					description: 'Mở Inspector xem mail theo entryId.',
					action: 'Hiển thị mail',
				},
				captureMail: {
					displayName: 'Chụp mail',
					description:
						'Chụp ảnh 1 email (png; cũng hỗ trợ html/msg). Đường dẫn: savePath hoặc saveDirectory + fileName.',
					action: 'Chụp ảnh mail',
				},
				saveMail: {
					displayName: 'Lưu mail',
					description:
						'Lưu 1 email ra file .msg. Đường dẫn: savePath hoặc saveDirectory + fileName ({subject} {date} {time} {entryId}).',
					action: 'Lưu mail .msg',
				},
				getConversation: {
					displayName: 'Lấy hội thoại',
					description:
						'Liệt kê email nối (thread): entryId, maxCount tùy chọn. Trả Count, RelatedCount, Mails[].',
					action: 'Lấy hội thoại',
				},
				saveConversationMails: {
					displayName: 'Lưu hội thoại',
					description:
						'Lưu cả email nối ra .msg: saveDirectory + fileName (nên có {index}). Trả Count, RelatedCount, Files[].',
					action: 'Lưu hội thoại .msg',
				},
				captureConversation: {
					displayName: 'Chụp hội thoại',
					description:
						'Chụp ảnh cả thread (png). saveDirectory + fileName (nên có {index}), maxCount tùy chọn.',
					action: 'Chụp ảnh hội thoại',
				},
				getSelectedMail: {
					displayName: 'Mail đang chọn',
					description: 'Lấy mail đang chọn trên Explorer. Không cần param.',
					action: 'Lấy mail đang chọn',
				},
				sendMail: {
					displayName: 'Gửi mail',
					description:
						'Tạo & gửi mail. to bắt buộc; subject, body, htmlBody, cc, bcc, attachmentPaths, displayBeforeSend tùy chọn.',
					action: 'Gửi mail',
				},
				replyMail: {
					displayName: 'Trả lời mail',
					description: 'Trả lời mail theo entryId. body tùy chọn; replyAll, sendImmediately.',
					action: 'Trả lời mail',
				},
				forwardMail: {
					displayName: 'Chuyển tiếp mail',
					description:
						'Chuyển tiếp mail: entryId + to bắt buộc; body, sendImmediately tùy chọn.',
					action: 'Chuyển tiếp mail',
				},
				markAsRead: {
					displayName: 'Đánh dấu đã đọc',
					description: 'Đánh dấu đã đọc / chưa đọc theo entryId + isRead.',
					action: 'Đánh dấu đã đọc',
				},
				moveMail: {
					displayName: 'Di chuyển mail',
					description: 'Chuyển mail: entryId + destinationFolderPath bắt buộc.',
					action: 'Di chuyển mail',
				},
				deleteMail: {
					displayName: 'Xóa mail',
					description: 'Xóa mail theo entryId. permanent=true xóa vĩnh viễn.',
					action: 'Xóa mail',
				},
				saveAttachment: {
					displayName: 'Lưu đính kèm',
					description:
						'Lưu file đính kèm ra đĩa worker: entryId + attachmentKey + saveDirectory.',
					action: 'Lưu đính kèm',
				},
				activateOutlook: {
					displayName: 'Kích hoạt Outlook',
					description: 'Đưa cửa sổ Outlook lên trước. Không cần param.',
					action: 'Kích hoạt Outlook',
				},
				closeInspector: {
					displayName: 'Đóng Inspector',
					description:
						'Đóng cửa sổ email. entryId tùy chọn; saveOption: discard / save / prompt.',
					action: 'Đóng Inspector',
				},
				closeAllInspectors: {
					displayName: 'Đóng mọi Inspector',
					description: 'Đóng mọi Inspector. saveOption: discard / save / prompt.',
					action: 'Đóng mọi Inspector',
				},
				sendKeys: {
					displayName: 'Gửi phím',
					description: 'Gửi một chuỗi SendKeys (keys bắt buộc). activateFirst tùy chọn.',
					action: 'Gửi phím',
				},
				sendKeySequence: {
					displayName: 'Chuỗi phím',
					description:
						'Chuỗi bước cách || + {WAIT:ms}. sequence bắt buộc; activateFirst tùy chọn.',
					action: 'Gửi chuỗi phím',
				},
			},
		},
		branchOnSuccess: {
			displayName: 'Phân nhánh khi thành công',
			description:
				'Khi bật: node có 2 output — Success (response.Success === true) và Failed (còn lại). Khi tắt: một output.',
		},
		branchOnSuccessInfo: {
			displayName: 'Phân nhánh thành công',
			description:
				'Output Success: item có Success = true. Output Failed: Success = false, thiếu field Success, hoặc lỗi khi bật Continue On Fail.',
		},
		connectionFieldsSourceInfo: {
			displayName: 'Nguồn trường kết nối',
			description:
				'Bắt buộc từ JSON input item: baseUrl, apiKey. sessionId bắt buộc trừ Kill All và Function List. Tùy chọn: requestTimeoutSeconds (mặc định 600), logUrl.',
		},
		attachExisting: {
			displayName: 'Gắn instance có sẵn',
			description: 'Gắn Outlook đang chạy; nếu không có thì tạo process mới. Mặc định true.',
		},
		visible: {
			displayName: 'Hiện cửa sổ',
			description: 'true = hiện cửa sổ Outlook trên máy worker.',
		},
		profileName: {
			displayName: 'Tên profile',
			description: 'Profile MAPI tùy chọn (hiếm khi cần). Để trống = không gửi.',
			placeholder: 'Outlook',
		},
		idleTimeoutMinutes: {
			displayName: 'Timeout nhàn rỗi (phút)',
			description:
				'Phút không có request thì tự disconnect. Để trống = server mặc định 5 phút.',
			placeholder: 'Để trống = server mặc định 5 phút',
		},
		killAllReason: {
			displayName: 'Lý do',
			description: 'Ghi chú tùy chọn gửi trong body (reason) khi đóng hết session Outlook.',
			placeholder: 'cleanup',
		},
		commandParamsSourceInfo: {
			displayName: 'Nguồn tham số lệnh',
			description:
				'Tham số command có thể lấy từ JSON input item (ưu tiên hơn form). Ví dụ: entryId, folderPath, to, subject, body, …',
		},
		folderPath: {
			displayName: 'Đường dẫn thư mục',
			description: 'Đường dẫn thư mục Outlook (Inbox, Sent Items, …).',
			placeholder: 'Inbox, Sent, Inbox/SubFolder',
		},
		maxCount: {
			displayName: 'Số lượng tối đa',
			description: 'Số mail tối đa (List / Search / Conversation). Để trống = server mặc định.',
			placeholder: '20',
		},
		unreadOnly: {
			displayName: 'Chỉ chưa đọc',
			description: 'true = chỉ liệt kê mail chưa đọc (List Mails).',
		},
		subjectContains: {
			displayName: 'Subject chứa',
			description: 'Lọc subject chứa chuỗi (List Mails).',
		},
		filterOrSubject: {
			displayName: 'Filter / Subject',
			description: 'Filter hoặc subject tìm kiếm (Search Mails) — bắt buộc.',
		},
		entryId: {
			displayName: 'Entry ID',
			description: 'EntryID mail Outlook (Read, Capture, Save, Conversation, Reply, …).',
		},
		to: {
			displayName: 'Đến',
			description: 'Người nhận (Send Mail, Forward Mail).',
			placeholder: 'user@example.com',
		},
		subject: {
			displayName: 'Tiêu đề',
			description: 'Tiêu đề mail (Send Mail).',
		},
		body: {
			displayName: 'Nội dung',
			description: 'Nội dung text (Send / Reply / Forward).',
		},
		htmlBody: {
			displayName: 'Nội dung HTML',
			description: 'Nội dung HTML (Send Mail).',
		},
		cc: { displayName: 'CC', description: 'CC (Send Mail).' },
		bcc: { displayName: 'BCC', description: 'BCC (Send Mail).' },
		attachmentPaths: {
			displayName: 'Đường dẫn đính kèm',
			description: 'Đường dẫn file trên máy worker, nối bằng ; hoặc | (Send Mail).',
			placeholder: 'C:\\temp\\a.pdf;C:\\temp\\b.xlsx',
		},
		displayBeforeSend: {
			displayName: 'Hiện trước khi gửi',
			description: 'true = mở draft trước khi gửi (Send Mail).',
		},
		replyAll: {
			displayName: 'Trả lời tất cả',
			description: 'true = Reply All (Reply Mail).',
		},
		sendImmediately: {
			displayName: 'Gửi ngay',
			description: 'true = gửi ngay; false = mở draft (Reply / Forward).',
		},
		isRead: {
			displayName: 'Đã đọc',
			description: 'true = đánh dấu đã đọc; false = chưa đọc (Mark As Read).',
		},
		destinationFolderPath: {
			displayName: 'Thư mục đích',
			description: 'Thư mục đích khi Move Mail.',
			placeholder: 'Inbox/Archive',
		},
		permanent: {
			displayName: 'Xóa vĩnh viễn',
			description: 'true = xóa vĩnh viễn (Delete Mail).',
		},
		attachmentKey: {
			displayName: 'Khóa đính kèm',
			description: 'Tên file hoặc index đính kèm (Save Attachment).',
		},
		saveDirectory: {
			displayName: 'Thư mục lưu',
			description:
				'Thư mục lưu trên máy worker (Save Attachment / Save All / Capture Mail).',
			placeholder: 'C:\\temp\\attachments',
		},
		capturePathMode: {
			displayName: 'Kiểu đường dẫn',
			description:
				'Chọn một cách lưu — thư mục + tên file, hoặc đường dẫn file đầy đủ (Capture Mail / Save Mail).',
			options: {
				directory: { displayName: 'Thư mục + tên file' },
				fullPath: { displayName: 'Đường dẫn đầy đủ' },
			},
		},
		mailPathMode: {
			displayName: 'Kiểu đường dẫn',
			description:
				'Chọn một cách lưu — thư mục + tên file, hoặc đường dẫn file đầy đủ (Capture Mail / Save Mail).',
			options: {
				directory: { displayName: 'Thư mục + tên file' },
				fullPath: { displayName: 'Đường dẫn đầy đủ' },
			},
		},
		savePath: {
			displayName: 'Đường dẫn file',
			description: 'Đường dẫn file đầy đủ (Capture Mail / Save Mail).',
			placeholder: 'D:\\temp\\outlook-capture\\mail1.png',
		},
		fileName: {
			displayName: 'Tên file',
			description:
				'Tên file khi dùng Thư mục lưu. Placeholder: {subject} {date} {time} {entryId} (thread: thêm {index}).',
			placeholder: 'PR_check_{date}_{time}.png',
		},
		format: {
			displayName: 'Định dạng',
			description: 'Định dạng chụp: png (ảnh) / html / msg (Capture Mail / Capture Conversation).',
			options: {
				png: { displayName: 'PNG' },
				html: { displayName: 'HTML' },
				msg: { displayName: 'MSG' },
			},
		},
		overwrite: {
			displayName: 'Ghi đè file',
			description:
				'true = ghi đè file cùng tên. false = giữ file cũ, lưu bản mới thành ten_2.ext, ten_3.ext, …',
		},
		saveOption: {
			displayName: 'Tùy chọn lưu',
			description: 'Cách xử lý khi đóng Inspector: discard / save / prompt.',
			options: {
				discard: { displayName: 'Hủy' },
				save: { displayName: 'Lưu' },
				prompt: { displayName: 'Hỏi' },
			},
		},
		keys: {
			displayName: 'Phím',
			description: 'Chuỗi SendKeys (Send Keys).',
			placeholder: '%{F4}',
		},
		sequence: {
			displayName: 'Chuỗi bước',
			description: 'Chuỗi bước cách || + {WAIT:ms} (Send Key Sequence).',
			placeholder: '^{a}||{WAIT:500}||^{c}',
		},
		activateFirst: {
			displayName: 'Kích hoạt trước',
			description: 'true = ActivateOutlook trước khi gửi phím.',
		},
	},
};

const outlookZh = {
	header: {
		displayName: 'RM OUTLOOK AUTO',
		description: 'Microsoft Outlook 自动化 (COM)',
	},
	nodeView: {
		operation: {
			displayName: '操作',
			options: {
				connect: {
					displayName: '连接',
					description:
						'POST /outlook-auto/connect — 使用 sessionId (GUID) 附加/打开 Outlook COM',
					action: '连接 Outlook',
				},
				disconnect: {
					displayName: '断开连接',
					description:
						'POST /outlook-auto/disconnect — 解除 API 会话（若为附加则不退出 Outlook）',
					action: '断开会话',
				},
				sessionCheck: {
					displayName: '检查会话',
					description: 'POST /outlook-auto/session/check — 检查会话是否仍活跃',
					action: '检查会话',
				},
				functionList: {
					displayName: '函数列表',
					description:
						'GET /outlook-auto/function/list — 列出运行时函数（可不带 api-key）',
					action: '列出 Outlook 函数',
				},
				killAllSessions: {
					displayName: '结束全部会话',
					description:
						'POST /outlook-auto/session/kill-all — 关闭全部 Outlook API 会话。无需 sessionId。',
					action: '结束全部 Outlook 会话',
				},
				getSessionInfo: {
					displayName: '会话信息',
					description: '获取 Outlook 会话信息：配置文件、CurrentUser、存储。无需参数。',
					action: '获取会话信息',
				},
				listFolders: {
					displayName: '列出文件夹',
					description: '列出子文件夹。folderPath 可选（默认 Inbox）。',
					action: '列出文件夹',
				},
				openFolder: {
					displayName: '打开文件夹',
					description: '在 Explorer 上设置 CurrentFolder。folderPath 必填。',
					action: '打开文件夹',
				},
				listMails: {
					displayName: '列出邮件',
					description:
						'列出文件夹中的邮件。参数：folderPath、maxCount、unreadOnly、subjectContains。',
					action: '列出邮件',
				},
				searchMails: {
					displayName: '搜索邮件',
					description: '按 filterOrSubject（必填）搜索。可选 folderPath、maxCount。',
					action: '搜索邮件',
				},
				readMail: {
					displayName: '读取邮件',
					description: '按 entryId（必填）读取 subject/body/html/attachments。',
					action: '读取邮件',
				},
				displayMail: {
					displayName: '显示邮件',
					description: '按 entryId 打开 Inspector 查看邮件。',
					action: '显示邮件',
				},
				captureMail: {
					displayName: '截取邮件',
					description:
						'截取单封邮件图片（png；也支持 html/msg）。路径：savePath，或 saveDirectory + fileName。',
					action: '截取邮件图片',
				},
				saveMail: {
					displayName: '保存邮件',
					description:
						'将单封邮件保存为 .msg。路径：savePath，或 saveDirectory + fileName（{subject} {date} {time} {entryId}）。',
					action: '保存邮件 .msg',
				},
				getConversation: {
					displayName: '获取会话',
					description:
						'列出会话邮件：entryId，可选 maxCount。返回 Count、RelatedCount、Mails[]。',
					action: '获取会话',
				},
				saveConversationMails: {
					displayName: '保存会话邮件',
					description:
						'将会话全部保存为 .msg：saveDirectory + fileName（建议含 {index}）。返回 Count、RelatedCount、Files[]。',
					action: '保存会话 .msg',
				},
				captureConversation: {
					displayName: '截取会话',
					description:
						'截取整个会话图片（png）。saveDirectory + fileName（建议含 {index}），可选 maxCount。',
					action: '截取会话图片',
				},
				getSelectedMail: {
					displayName: '当前选中邮件',
					description: '获取 Explorer 上当前选中的邮件。无需参数。',
					action: '获取选中邮件',
				},
				sendMail: {
					displayName: '发送邮件',
					description:
						'创建并发送邮件。to 必填；subject、body、htmlBody、cc、bcc、attachmentPaths、displayBeforeSend 可选。',
					action: '发送邮件',
				},
				replyMail: {
					displayName: '回复邮件',
					description: '按 entryId 回复。body 可选；replyAll、sendImmediately。',
					action: '回复邮件',
				},
				forwardMail: {
					displayName: '转发邮件',
					description: '转发邮件：entryId + to 必填；body、sendImmediately 可选。',
					action: '转发邮件',
				},
				markAsRead: {
					displayName: '标记已读',
					description: '按 entryId + isRead 标记已读/未读。',
					action: '标记已读',
				},
				moveMail: {
					displayName: '移动邮件',
					description: '移动邮件：entryId + destinationFolderPath 必填。',
					action: '移动邮件',
				},
				deleteMail: {
					displayName: '删除邮件',
					description: '按 entryId 删除。permanent=true 为永久删除。',
					action: '删除邮件',
				},
				saveAttachment: {
					displayName: '保存附件',
					description: '将附件保存到 worker 磁盘：entryId + attachmentKey + saveDirectory。',
					action: '保存附件',
				},
				activateOutlook: {
					displayName: '激活 Outlook',
					description: '将 Outlook 窗口置于前台。无需参数。',
					action: '激活 Outlook',
				},
				closeInspector: {
					displayName: '关闭 Inspector',
					description: '关闭邮件窗口。entryId 可选；saveOption：discard / save / prompt。',
					action: '关闭 Inspector',
				},
				closeAllInspectors: {
					displayName: '关闭全部 Inspector',
					description: '关闭所有 Inspector。saveOption：discard / save / prompt。',
					action: '关闭全部 Inspector',
				},
				sendKeys: {
					displayName: '发送按键',
					description: '发送 SendKeys 字符串（keys 必填）。activateFirst 可选。',
					action: '发送按键',
				},
				sendKeySequence: {
					displayName: '按键序列',
					description: '步骤用 || 分隔，支持 {WAIT:ms}。sequence 必填；activateFirst 可选。',
					action: '发送按键序列',
				},
			},
		},
		branchOnSuccess: {
			displayName: '成功时分支',
			description:
				'启用时：节点有 2 个输出 — Success（response.Success === true）和 Failed（其余）。关闭时：一个输出。',
		},
		branchOnSuccessInfo: {
			displayName: '成功分支说明',
			description:
				'Success 输出：Success = true。Failed 输出：Success = false、缺少 Success，或 Continue On Fail 时的错误。',
		},
		connectionFieldsSourceInfo: {
			displayName: '连接字段来源',
			description:
				'必填：来自输入项 JSON 的 baseUrl、apiKey。除 Kill All 与 Function List 外需 sessionId。可选：requestTimeoutSeconds（默认 600）、logUrl。',
		},
		attachExisting: {
			displayName: '附加已有实例',
			description: '附加正在运行的 Outlook；若无则新建进程。默认 true。',
		},
		visible: {
			displayName: '显示窗口',
			description: 'true = 在 worker 上显示 Outlook 窗口。',
		},
		profileName: {
			displayName: '配置文件名',
			description: '可选 MAPI 配置文件（很少需要）。留空 = 不发送。',
			placeholder: 'Outlook',
		},
		idleTimeoutMinutes: {
			displayName: '空闲超时（分钟）',
			description: '无请求多少分钟后自动断开。留空 = 服务器默认 5 分钟。',
			placeholder: '留空 = 服务器默认 5 分钟',
		},
		killAllReason: {
			displayName: '原因',
			description: '可选备注，随 body（reason）发送以关闭全部 Outlook 会话。',
			placeholder: 'cleanup',
		},
		commandParamsSourceInfo: {
			displayName: '命令参数来源',
			description:
				'命令参数可从输入 JSON 读取（优先于表单）。例如：entryId、folderPath、to、subject、body …',
		},
		folderPath: {
			displayName: '文件夹路径',
			description: 'Outlook 文件夹路径（Inbox、Sent Items 等）。',
			placeholder: 'Inbox, Sent, Inbox/SubFolder',
		},
		maxCount: {
			displayName: '最大数量',
			description: '最大邮件数（List / Search / Conversation）。留空 = 服务器默认。',
			placeholder: '20',
		},
		unreadOnly: {
			displayName: '仅未读',
			description: 'true = 仅列出未读邮件（List Mails）。',
		},
		subjectContains: {
			displayName: '主题包含',
			description: '按主题包含字符串过滤（List Mails）。',
		},
		filterOrSubject: {
			displayName: '筛选 / 主题',
			description: '搜索用的筛选或主题（Search Mails）— 必填。',
		},
		entryId: {
			displayName: 'Entry ID',
			description: 'Outlook 邮件 EntryID（读取、截取、保存、会话、回复等）。',
		},
		to: {
			displayName: '收件人',
			description: '收件人（发送、转发）。',
			placeholder: 'user@example.com',
		},
		subject: {
			displayName: '主题',
			description: '邮件主题（发送）。',
		},
		body: {
			displayName: '正文',
			description: '纯文本正文（发送 / 回复 / 转发）。',
		},
		htmlBody: {
			displayName: 'HTML 正文',
			description: 'HTML 正文（发送）。',
		},
		cc: { displayName: '抄送', description: '抄送（发送）。' },
		bcc: { displayName: '密送', description: '密送（发送）。' },
		attachmentPaths: {
			displayName: '附件路径',
			description: 'worker 上的文件路径，用 ; 或 | 连接（发送）。',
			placeholder: 'C:\\temp\\a.pdf;C:\\temp\\b.xlsx',
		},
		displayBeforeSend: {
			displayName: '发送前显示',
			description: 'true = 发送前打开草稿（发送）。',
		},
		replyAll: {
			displayName: '全部回复',
			description: 'true = 全部回复（回复）。',
		},
		sendImmediately: {
			displayName: '立即发送',
			description: 'true = 立即发送；false = 打开草稿（回复 / 转发）。',
		},
		isRead: {
			displayName: '已读',
			description: 'true = 标记已读；false = 未读（标记已读）。',
		},
		destinationFolderPath: {
			displayName: '目标文件夹',
			description: '移动邮件时的目标文件夹。',
			placeholder: 'Inbox/Archive',
		},
		permanent: {
			displayName: '永久删除',
			description: 'true = 永久删除（删除邮件）。',
		},
		attachmentKey: {
			displayName: '附件键',
			description: '附件文件名或索引（保存附件）。',
		},
		saveDirectory: {
			displayName: '保存目录',
			description: 'worker 上的保存目录（保存附件 / 保存全部 / 截取邮件）。',
			placeholder: 'C:\\temp\\attachments',
		},
		capturePathMode: {
			displayName: '路径方式',
			description: '二选一 — 目录 + 文件名，或完整文件路径（截取邮件 / 保存邮件）。',
			options: {
				directory: { displayName: '目录 + 文件名' },
				fullPath: { displayName: '完整路径' },
			},
		},
		mailPathMode: {
			displayName: '路径方式',
			description: '二选一 — 目录 + 文件名，或完整文件路径（截取邮件 / 保存邮件）。',
			options: {
				directory: { displayName: '目录 + 文件名' },
				fullPath: { displayName: '完整路径' },
			},
		},
		savePath: {
			displayName: '完整路径',
			description: '完整文件路径（截取邮件 / 保存邮件）。',
			placeholder: 'D:\\temp\\outlook-capture\\mail1.png',
		},
		fileName: {
			displayName: '文件名',
			description:
				'配合保存目录使用。占位符：{subject} {date} {time} {entryId}（会话另加 {index}）。',
			placeholder: 'PR_check_{date}_{time}.png',
		},
		format: {
			displayName: '格式',
			description: '截取格式：png（图片）/ html / msg（截取邮件 / 截取会话）。',
			options: {
				png: { displayName: 'PNG' },
				html: { displayName: 'HTML' },
				msg: { displayName: 'MSG' },
			},
		},
		overwrite: {
			displayName: '覆盖文件',
			description:
				'true = 覆盖同名文件。false = 保留旧文件，新文件存为 ten_2.ext、ten_3.ext …',
		},
		saveOption: {
			displayName: '保存选项',
			description: '关闭 Inspector 时的处理：discard / save / prompt。',
			options: {
				discard: { displayName: '丢弃' },
				save: { displayName: '保存' },
				prompt: { displayName: '提示' },
			},
		},
		keys: {
			displayName: '按键',
			description: 'SendKeys 字符串（发送按键）。',
			placeholder: '%{F4}',
		},
		sequence: {
			displayName: '按键序列',
			description: '步骤用 || 分隔，支持 {WAIT:ms}（按键序列）。',
			placeholder: '^{a}||{WAIT:500}||^{c}',
		},
		activateFirst: {
			displayName: '先激活',
			description: 'true = 发送按键前先 ActivateOutlook。',
		},
	},
};

const copyVi = {
	header: {
		displayName: 'RM Copy Context',
		description: 'Copy dữ liệu từ một node khác trong workflow vào item hiện tại',
	},
	nodeView: {
		tips: {
			displayName: 'Gợi ý',
			description:
				'Chèn sau Code/Set/IF khi mất baseUrl/apiKey/sessionId. Gõ đúng tên node nguồn (vd. RM Init hoặc RM FILE AUTO). Copy Mode = Connection Fields chỉ lấy field kết nối RM.',
		},
		sourceNode: {
			displayName: 'Node nguồn',
			description:
				'Tên node đã chạy trong workflow (đúng như trên canvas). Ví dụ: RM Init — lấy baseUrl/apiKey/sessionId từ output node đó.',
			placeholder: 'RM Init',
		},
		copyMode: {
			displayName: 'Chế độ copy',
			description: 'Chọn phạm vi field cần copy từ node nguồn',
			options: {
				connectionFields: {
					displayName: 'Field kết nối (RM)',
					description:
						'Chỉ baseUrl, apiKey, sessionId, requestTimeoutSeconds, logUrl, rootDirectory (+ SAP nếu có)',
				},
				all: {
					displayName: 'Toàn bộ JSON',
					description: 'Copy toàn bộ json của source node',
				},
				custom: {
					displayName: 'Tên field tùy chọn',
					description: 'Chỉ các field liệt kê (phân cách bằng dấu phẩy)',
				},
			},
		},
		customFields: {
			displayName: 'Tên field',
			description: 'Danh sách tên field cần copy, phân cách bằng dấu phẩy',
			placeholder: 'baseUrl, apiKey, sessionId, rootDirectory',
		},
		mergeMode: {
			displayName: 'Chế độ merge',
			description: 'Cách gộp dữ liệu nguồn vào item hiện tại',
			options: {
				sourceWins: {
					displayName: 'Nguồn ghi đè',
					description: 'Giữ data hiện tại; field copy từ source ghi đè',
				},
				fillMissing: {
					displayName: 'Chỉ điền thiếu',
					description: 'Chỉ thêm field từ source khi item hiện tại thiếu / rỗng',
				},
				replace: {
					displayName: 'Chỉ nguồn (thay JSON)',
					description: 'Thay toàn bộ json bằng dữ liệu đã chọn từ source (bỏ data input)',
				},
			},
		},
		sourceItemMode: {
			displayName: 'Item nguồn',
			description:
				'Sau Code thường chọn First Item. Paired Item khi số item khớp và có pairedItem.',
			options: {
				paired: {
					displayName: 'Paired item (cùng index)',
					description: "Dùng $('Node').item — cùng paired item nếu có",
				},
				first: {
					displayName: 'Item đầu tiên',
					description: "Luôn lấy $('Node').first() — ổn định sau Code/aggregate",
				},
			},
		},
	},
};

const copyZh = {
	header: {
		displayName: 'RM Copy Context',
		description: '从工作流中另一个节点复制数据到当前 item',
	},
	nodeView: {
		tips: {
			displayName: '提示',
			description:
				'在 Code/Set/IF 之后插入，用于恢复丢失的 baseUrl/apiKey/sessionId。输入源节点的准确名称（如 RM Init）。Copy Mode = Connection Fields 仅复制 RM 连接字段。',
		},
		sourceNode: {
			displayName: '源节点',
			description:
				'工作流中已执行节点的名称（与画布上一致）。例如：RM Init — 从其输出读取 baseUrl/apiKey/sessionId。',
			placeholder: 'RM Init',
		},
		copyMode: {
			displayName: '复制模式',
			description: '选择要从源节点复制的字段范围',
			options: {
				connectionFields: {
					displayName: '连接字段 (RM)',
					description:
						'仅 baseUrl、apiKey、sessionId、requestTimeoutSeconds、logUrl、rootDirectory（及 SAP 相关字段）',
				},
				all: {
					displayName: '全部 JSON 字段',
					description: '复制源节点的全部 json',
				},
				custom: {
					displayName: '自定义字段名',
					description: '仅复制列出的字段（逗号分隔）',
				},
			},
		},
		customFields: {
			displayName: '字段名',
			description: '要复制的字段名列表，逗号分隔',
			placeholder: 'baseUrl, apiKey, sessionId, rootDirectory',
		},
		mergeMode: {
			displayName: '合并模式',
			description: '如何将源数据合并到当前 item',
			options: {
				sourceWins: {
					displayName: '源覆盖',
					description: '保留当前数据；来自源的字段覆盖同名字段',
				},
				fillMissing: {
					displayName: '仅补缺',
					description: '仅在当前 item 缺少/为空时从源添加字段',
				},
				replace: {
					displayName: '仅源（替换 JSON）',
					description: '用所选源数据替换全部 json（丢弃输入数据）',
				},
			},
		},
		sourceItemMode: {
			displayName: '源 Item',
			description:
				'Code 之后通常选 First Item。当 item 数量匹配且有 pairedItem 时用 Paired Item。',
			options: {
				paired: {
					displayName: '配对 Item（同索引）',
					description: "使用 $('Node').item — 若有则取同配对 item",
				},
				first: {
					displayName: '首个 Item',
					description: "始终取 $('Node').first() — Code/聚合后更稳定",
				},
			},
		},
	},
};

write('RmOutlookAutoWorkflow', 'vi', 'rmOutlookAutoWorkflow.json', outlookVi);
write('RmOutlookAutoWorkflow', 'zh', 'rmOutlookAutoWorkflow.json', outlookZh);
write('RMWorkflow', 'vi', 'rmCopyContext.json', copyVi);
write('RMWorkflow', 'zh', 'rmCopyContext.json', copyZh);
console.log('Translation write complete.');
