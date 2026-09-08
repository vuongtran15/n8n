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
| POST | `/outlook-auto/session/kill-all` | `api-key` |

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
  "visible": true,
  "profileName": null,
  "idleTimeoutMinutes": 10
}
```

| Field | Mặc định | Ý nghĩa |
|-------|----------|---------|
| `attachExisting` | `true` | Gắn Outlook đang chạy; nếu không có thì tạo process mới |
| `visible` | `true` | Hiện cửa sổ Outlook: set Visible, mở Explorer (Inbox) nếu đang chạy tray, rồi đưa cửa sổ lên trước |
| `profileName` | null | Tên **profile MAPI** (thường để trống). Không điền chữ "Outlook" trừ khi đó đúng tên profile trên Control Panel → Mail |
| `idleTimeoutMinutes` | 5 | Tự disconnect khi idle |

Mỗi lần **connect** sẽ **đóng mọi session Outlook HTTP** còn sót (kể cả cùng `sessionId`) rồi tạo session mới — Dispose đóng các **Inspector/form email** còn mở; không `Quit` Outlook nếu chỉ attach.

Disconnect **không** `Quit` Outlook nếu session chỉ attach vào instance user đang dùng.

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
| `ListMails` | `folderPath`, `maxCount`, `unreadOnly`, `subjectContains` |
| `ReadMail` | `entryId` → subject/body/html/attachments |
| `DisplayMail` | Mở Inspector |
| `SendMail` | `to`, `subject`, `body`, `cc`, `bcc`, `htmlBody`, `attachmentPaths` (`;` / `|`), `displayBeforeSend` (`false` = gửi ngay). Sau gửi thành công: `EntryId` lấy từ bản trong **Sent Items** (Save trước Send). |
| `ReplyMail` | `entryId`, `body`, `replyAll`, `sendImmediately` |
| `ForwardMail` | `entryId`, `to`, `body`, `sendImmediately` |
| `MarkAsRead` | `entryId`, `isRead` |
| `MoveMail` | `entryId`, `destinationFolderPath` |
| `DeleteMail` | `entryId`, `permanent` |
| `SaveAttachment` | `entryId`, `attachmentKey` (index 1-based hoặc tên file), `saveDirectory`, `overwrite` |
| `SaveAllAttachments` | `entryId`, `saveDirectory`, `skipEmbedded`, `overwrite`. Trả `SavedFiles[]`, `SavedCount` |
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

### Lưu attachment — `overwrite`

Áp dụng cho cả **`SaveAttachment`** và **`SaveAllAttachments`**. Quyết định khi trên đĩa worker **đã có file cùng tên** trong `saveDirectory`.

| `overwrite` | Mặc định | Hành vi |
|-------------|----------|---------|
| `true` | **Có** | Ghi đè file cùng tên (cập nhật bản mới từ mail) |
| `false` | — | **Không** ghi đè: giữ file cũ, lưu bản mới thành `ten_2.ext`, `ten_3.ext`, … |

### Ví dụ `SaveAttachment` (một file)

| Param | Bắt buộc | Mặc định | Mô tả |
|-------|----------|----------|--------|
| `entryId` | Có | — | Mail chứa đính kèm |
| `attachmentKey` | Có | — | Index **1-based** hoặc **tên file** |
| `saveDirectory` | Có | — | Thư mục trên **máy worker** |
| `overwrite` | Không | `true` | Ghi đè / đổi tên khi trùng |

Ghi đè (mặc định):

```json
{
  "sessionId": "...",
  "function": "SaveAttachment",
  "paramObject": {
    "entryId": "...",
    "attachmentKey": "1",
    "saveDirectory": "D:\\Data\\OutlookAttachments",
    "overwrite": "true"
  }
}
```

Không ghi đè — nếu `bao-cao.xlsx` đã tồn tại → lưu `bao-cao_2.xlsx`:

```json
{
  "sessionId": "...",
  "function": "SaveAttachment",
  "paramObject": {
    "entryId": "...",
    "attachmentKey": "bao-cao.xlsx",
    "saveDirectory": "D:\\Data\\OutlookAttachments",
    "overwrite": "false"
  }
}
```

### Ví dụ `SaveAllAttachments` (tất cả file)

| Param | Bắt buộc | Mặc định | Mô tả |
|-------|----------|----------|--------|
| `entryId` | Có | — | Mail nguồn |
| `saveDirectory` | Có | — | Thư mục đích trên worker |
| `skipEmbedded` | Không | `true` | `true` = bỏ ảnh OLE / chữ ký inline |
| `overwrite` | Không | `true` | Giống bảng trên |

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

Giữ file cũ, thêm bản mới với hậu tố `_2`, `_3`, …:

```json
{
  "sessionId": "...",
  "function": "SaveAllAttachments",
  "paramObject": {
    "entryId": "...",
    "saveDirectory": "D:\\temp\\outlook-att",
    "skipEmbedded": "true",
    "overwrite": "false"
  }
}
```

`Result` điển hình:

```json
{
  "Success": true,
  "Message": "OK",
  "SavedCount": 2,
  "SavedFiles": [
    "D:\\temp\\outlook-att\\a.pdf",
    "D:\\temp\\outlook-att\\b.xlsx"
  ]
}
```

Với `overwrite: false` và file đã tồn tại, path trong `SavedFiles` sẽ là bản `_2` / `_3` thực tế đã ghi.

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
3. `ReadMail` / `ReplyMail` / `MoveMail` / …
4. `POST /outlook-auto/disconnect` khi xong

Gateway: cùng path trên `http://<gateway-host>:8080/...` (proxy tới worker).
