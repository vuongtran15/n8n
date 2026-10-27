# Hướng dẫn HTTP API Outlook Automation

Điều khiển **Microsoft Outlook desktop** (COM) qua worker **`RMIV.WF.CLIENT`**, cùng process với SAP / Web / File. Gateway chỉ proxy — gọi `/outlook-auto/*` trên cổng LAN (thường **8080**) hoặc worker loopback (**18080**).

**Yêu cầu:** Windows + Outlook desktop đã cài; worker chạy STA (mặc định). Mọi lệnh Outlook được marshal lên UI thread giống SAP.

**Danh sách hàm live:** [http://127.0.0.1:8080/outlook-auto/function/list](http://127.0.0.1:8080/outlook-auto/function/list) (không bắt buộc `api-key`).

**Tài liệu này qua HTTP:** [http://127.0.0.1:8080/docs/HUONG-DAN-API-OUTLOOK.md](http://127.0.0.1:8080/docs/HUONG-DAN-API-OUTLOOK.md)

---

## Route

| Method | Path | Auth |
|--------|------|------|
| GET | `/outlook-auto/function/list` (alias `/outlook-auto/list`) | Public |
| GET | `/docs/HUONG-DAN-API-OUTLOOK.md` | Public |
| POST | `/outlook-auto/connect` | `api-key` |
| POST | `/outlook-auto/command` | `api-key` |
| POST | `/outlook-auto/disconnect` | `api-key` |
| POST | `/outlook-auto/session/check` | `api-key` |
| GET | `/outlook-auto/session/list` (alias `/outlook-auto/sessions`) | `api-key` |
| POST | `/outlook-auto/session/kill-all` | `api-key` — đóng mọi session **và tắt Outlook.exe** (`Quit` + kill process) |

Header: `api-key: <key trong server-config.txt>`  
Body JSON UTF-8. `sessionId` = GUID.

Idle mặc định **5 phút** (giống web). Gửi `idleTimeoutMinutes` khi connect để ghi đè. `MaxOutlookSessions` mặc định **3**.

---

## 1) Connect

```http
POST /outlook-auto/connect
api-key: YOUR_KEY
Content-Type: application/json

{
  "sessionId": "11111111-1111-1111-1111-111111111111",
  "attachExisting": true,
  "visible": false,
  "profileName": null,
  "idleTimeoutMinutes": 10
}
```

| Field | Mặc định | Ý nghĩa |
|-------|----------|---------|
| `attachExisting` | `true` | Gắn Outlook đang chạy; nếu không có thì tạo process mới |
| `visible` | `false` | `true` = hiện cửa sổ đã có (không tạo Explorer mới nếu đang soạn mail). Muốn hiện UI: gửi `visible: true` hoặc gọi `ActivateOutlook` |
| `profileName` | null | Tên **profile MAPI** (thường để trống). Không điền chữ "Outlook" trừ khi đó đúng tên profile trên Control Panel → Mail |
| `idleTimeoutMinutes` | 5 | Tự disconnect khi idle |

Mỗi lần **connect** sẽ **đóng mọi session Outlook HTTP** còn sót (kể cả cùng `sessionId`) rồi tạo session mới. Disconnect / cleanup khi **attach** chỉ nhả COM — **không** đóng Inspector/compose của user và **không** `Quit` Outlook.

Disconnect **không** `Quit` Outlook nếu session chỉ attach vào instance user đang dùng. `disconnect` khi session đã tắt (sau `kill-all` / cleanup) trả **Success** (`already disconnected`) — không Fail.

---

## 2) Command

```http
POST /outlook-auto/command
api-key: YOUR_KEY
Content-Type: application/json

{
  "sessionId": "11111111-1111-1111-1111-111111111111",
  "function": "ListMails",
  "paramObject": {
    "folderPath": "Inbox",
    "maxCount": "20",
    "unreadOnly": "true"
  }
}
```

Hoặc `params: ["Inbox", "20", "true"]` theo thứ tự tham số.

Response: `{ "Success": true, "Message": "OK", "Result": { ... } }`.

---

## 3) Functions chính (`OutlookAutomationManager`)

| Function | Mô tả |
|----------|--------|
| `GetSessionInfo` | Profile, user, store |
| `ListFolders` | `folderPath` tùy chọn (mặc định Inbox) |
| `ListMails` | `folderPath`, `maxCount`, `unreadOnly`, `subjectContains`. Mỗi mail: `SenderEmail` (SMTP), `ToEmails`/`CcEmails`, `ConversationId` |
| `ReadMail` | `entryId` → SMTP fields + `ConversationId` + `ConversationCount` (số mail trong thread) |
| `DisplayMail` | Mở Inspector |
| `CaptureMail` | Chụp **ảnh** 1 email (`png`; cũng hỗ trợ `html`/`msg`). Dùng khi cần screenshot |
| `SaveMail` | **API lưu email** ra file `.msg` (mặc định) — dễ nhận biết. `saveDirectory`+`fileName` hoặc `savePath` |
| `SaveConversationMails` | Lưu **cả email nối** ra `.msg`: `Count`, `RelatedCount`, `Files[]`. `fileName` nên có `{index}` |
| `CaptureConversation` | Chụp ảnh cả thread (png). Chỉ cần `.msg` → dùng `SaveConversationMails` |
| `GetConversation` | Chỉ liệt kê email nối: `Count`, `RelatedCount`, `Mails[]` |
| `SendMail` | `to`, `subject`, `body`, `cc`, `bcc`, `htmlBody`, `attachmentPaths` (`;` / `|`), `displayBeforeSend` (`false` = gửi ngay). Sau gửi thành công: `EntryId` lấy từ bản trong **Sent Items** (Save trước Send). |
| `ReplyMail` | `entryId`, `body`, `replyAll`, `sendImmediately` |
| `ForwardMail` | `entryId`, `to`, `body`, `sendImmediately` |
| `MarkAsRead` | `entryId`, `isRead` |
| `MoveMail` | `entryId`, `destinationFolderPath` |
| `DeleteMail` | `entryId`, `permanent` |
| `SaveAttachment` | `entryId`, `attachmentKey`, `saveDirectory`, `overwrite` (mặc định `true` = ghi đè; `false` = tạo `file_2`…) |
| `SaveAllAttachments` | `entryId`, `saveDirectory`, `skipEmbedded` (mặc định `true`), `overwrite` (mặc định `true` = cập nhật cùng tên; `false` = không ghi đè). Trả `SavedFiles[]` |
| `SearchMails` | `filterOrSubject`, `folderPath`, `maxCount` |
| `GetSelectedMail` | Mail đang chọn trên Explorer |
| `OpenFolder` | Đặt `CurrentFolder` trên Explorer |
| `ActivateOutlook` | Đưa cửa sổ lên trước (ưu tiên Inspector / email đang mở) |
| `CloseInspector` | Đóng cửa sổ email đang mở (không tắt Outlook). `entryId` tùy chọn; `saveOption`: `discard` / `save` / `prompt` |
| `CloseAllInspectors` | Đóng mọi cửa sổ Inspector; Outlook vẫn chạy |
| `SendKeys` | Phím / tổ hợp (.NET SendKeys): `{ENTER}`, `^s`, `%{F4}`, … |
| `SendKeySequence` | Chuỗi cách nhau `\|\|`; token `{WAIT:ms}` |

**Không có `CloseOutlook` / `Quit` qua command** — `disconnect` chỉ gỡ session API; nếu session chỉ attach thì **không** tắt Outlook của user. Muốn đóng email đang mở → dùng `CloseInspector`.

### Thư mục quen thuộc

`Inbox`, `Sent` / `Sent Items`, `Drafts`, `Deleted` / `Deleted Items`, `Outbox`, `Junk` — hoặc đường dẫn `Inbox/SubFolder`.

### Ví dụ SaveMail (.msg)

```json
{
  "sessionId": "...",
  "function": "SaveMail",
  "paramObject": {
    "entryId": "<EntryId>",
    "saveDirectory": "D:\\temp\\outlook-msg",
    "fileName": "PR_{subject}_{date}.msg",
    "overwrite": "true"
  }
}
```

### Ví dụ SaveConversationMails (email nối → .msg)

```json
{
  "sessionId": "...",
  "function": "SaveConversationMails",
  "paramObject": {
    "entryId": "<EntryId bất kỳ trong thread>",
    "saveDirectory": "D:\\temp\\outlook-msg\\thread1",
    "fileName": "mail_{index}_{subject}.msg",
    "maxCount": "20",
    "overwrite": "true"
  }
}
```

### Ví dụ CaptureMail (đặt tên ảnh)

```json
{
  "sessionId": "...",
  "function": "CaptureMail",
  "paramObject": {
    "entryId": "<EntryId>",
    "saveDirectory": "D:\\temp\\outlook-capture",
    "fileName": "PR_check_{date}_{time}.png",
    "format": "png",
    "overwrite": "true"
  }
}
```

Hoặc `savePath`: `"D:\\temp\\outlook-capture\\mail1.png"`. Placeholder: `{subject}`, `{date}`, `{time}`, `{entryId}`.

### Ví dụ CaptureConversation (email nối)

```json
{
  "sessionId": "...",
  "function": "CaptureConversation",
  "paramObject": {
    "entryId": "<EntryId bất kỳ trong thread>",
    "saveDirectory": "D:\\temp\\outlook-capture\\thread1",
    "fileName": "mail_{index}_{subject}.png",
    "format": "png",
    "maxCount": "20",
    "overwrite": "true"
  }
}
```

- `Count` = tổng mail trong hội thoại; `RelatedCount` = số mail nối (Count−1)
- File lần lượt: `mail_01_....png`, `mail_02_....png`, …

### Ví dụ lưu tất cả attachment

```json
{
  "sessionId": "...",
  "function": "SaveAllAttachments",
  "paramObject": {
    "entryId": "<EntryId từ ListMails/ReadMail>",
    "saveDirectory": "D:\\temp\\outlook-att",
    "skipEmbedded": "true",
    "overwrite": "true"
  }
}
```

- `overwrite: true` — ghi đè file cùng tên (cập nhật bản mới nhất)
- `overwrite: false` — giữ file cũ, tạo `ten_2.xlsx`, `ten_3.xlsx`, …

### Ví dụ gửi mail

```json
{
  "sessionId": "...",
  "function": "SendMail",
  "paramObject": {
    "to": "user@example.com",
    "subject": "Test RMIV",
    "body": "Hello from outlook-auto",
    "attachmentPaths": "D:\\temp\\a.pdf;D:\\temp\\b.xlsx",
    "displayBeforeSend": "false"
  }
}
```

### Ví dụ phím tắt (Ctrl+N → đợi → Enter)

```json
{
  "sessionId": "...",
  "function": "SendKeySequence",
  "paramObject": {
    "sequence": "^n||{WAIT:400}||{ENTER}",
    "activateFirst": "true"
  }
}
```

| Cú pháp SendKeys | Nghĩa |
|------------------|--------|
| `{ENTER}` | Enter |
| `{ESC}` | Escape |
| `^s` | Ctrl+S |
| `^n` | Ctrl+N |
| `%{F4}` | Alt+F4 (đóng cửa sổ đang focus — không nên dùng nếu sợ đóng nhầm) |
| `^+{ENTER}` | Ctrl+Shift+Enter |

Chỉ Enter:

```json
{
  "sessionId": "...",
  "function": "SendKeys",
  "paramObject": { "keys": "{ENTER}", "activateFirst": "true" }
}
```

### Đóng cửa sổ email đang mở (không tắt Outlook)

```json
{
  "sessionId": "...",
  "function": "CloseInspector",
  "paramObject": {
    "saveOption": "discard"
  }
}
```

Đóng Inspector của một mail cụ thể:

```json
{
  "sessionId": "...",
  "function": "CloseInspector",
  "paramObject": {
    "entryId": "...",
    "saveOption": "discard"
  }
}
```

Đóng tất cả cửa sổ email đang mở:

```json
{
  "sessionId": "...",
  "function": "CloseAllInspectors",
  "paramObject": { "saveOption": "discard" }
}
```

---

## 4) Luồng tích hợp ngắn

1. `POST /outlook-auto/connect` → giữ `sessionId`
2. `ListMails` / `SearchMails` → lấy `entryId`
3. `ReadMail` / `SaveMail` / `CaptureMail` / `SaveConversationMails` / …
4. `POST /outlook-auto/disconnect` khi xong

Gateway: cùng path trên `http://<gateway-host>:8080/...` (proxy tới worker).
