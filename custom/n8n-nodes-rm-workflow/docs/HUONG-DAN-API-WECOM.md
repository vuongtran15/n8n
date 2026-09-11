# N8N WeCom API

API gửi tin nhóm WeCom qua portal RMAI.  
**Không cần đăng nhập / Bearer.** Server tự xử lý base64+MD5 (ảnh) và `upload_media` (file).

| | |
|---|---|
| Host | `https://ros.reginamiracle.com:200` |
| Base | `https://ros.reginamiracle.com:200/api/n8n/wecom` |
| Controller | `RMIV.RMAI.API/Controllers/N8NShareController.cs` |
| Auth | Không |

---

## 1) Gửi text

```
POST https://ros.reginamiracle.com:200/api/n8n/wecom/send-text
Content-Type: application/json
```

**Body**

```json
{
  "webhook": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "content": "Nội dung plain text",
  "mentionedList": ["A123456", "@all"],
  "mentionedMobileList": ["@all"]
}
```

| Field | Bắt buộc | Ghi chú |
|--------|----------|---------|
| `webhook` / `key` / `id` | 1 trong 3 | Bot key (UUID) hoặc full URL `https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=…` |
| `content` / `text` | 1 trong 2 | Plain text — không markdown / HTML |
| `mentionedList` | không | Chỉ EmpId + `@all` |
| `mentionedMobileList` | không | Chỉ EmpId + `@all` (SĐT bị loại) |

**Response OK**

```json
{
  "success": true,
  "errCode": 0,
  "message": "Đã gửi tin nhắn WeCom."
}
```

**curl**

```bash
curl -X POST "https://ros.reginamiracle.com:200/api/n8n/wecom/send-text" \
  -H "Content-Type: application/json" \
  -d "{\"webhook\":\"YOUR-BOT-KEY\",\"content\":\"Hello from n8n\"}"
```

---

## 2) Gửi markdown

Endpoint riêng — **không** đụng `send-text`. WeCom `msgtype: markdown`.

```
POST https://ros.reginamiracle.com:200/api/n8n/wecom/send-markdown
Content-Type: application/json
```

**Body**

```json
{
  "webhook": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "content": "实时新增用户反馈<font color=\"warning\">132例</font>，请相关同事注意。\n>类型:<font color=\"comment\">用户反馈</font>"
}
```

| Field | Bắt buộc | Ghi chú |
|--------|----------|---------|
| `webhook` / `key` / `id` | 1 trong 3 | Bot key (UUID) hoặc full URL webhook |
| `content` / `text` / `markdown` | 1 trong 3 | Markdown WeCom (≤ ~4096 bytes) |
| Mention | — | Không có `mentionedList`. @ trong content: `<@userid>` |

**Response OK**

```json
{
  "success": true,
  "errCode": 0,
  "message": "Đã gửi markdown WeCom."
}
```

**curl**

```bash
curl -X POST "https://ros.reginamiracle.com:200/api/n8n/wecom/send-markdown" \
  -H "Content-Type: application/json" \
  -d "{\"webhook\":\"YOUR-BOT-KEY\",\"content\":\"**Bold** và <font color=\\\"info\\\">info</font>\"}"
```

---

## 3) Gửi ảnh (JPG / PNG ≤ 2 MB)


```
POST https://ros.reginamiracle.com:200/api/n8n/wecom/send-image
Content-Type: multipart/form-data
```

| Field | Type | Bắt buộc |
|--------|------|----------|
| `webhook` / `key` / `id` | text | có |
| `image` / `file` | binary | có — JPG hoặc PNG, ≤ 2 MB |

n8n: HTTP Request → **Form-Data** → `webhook` = String, `image` = Binary File.  
Không cần tự base64 / MD5.

**Response OK**

```json
{
  "success": true,
  "errCode": 0,
  "message": "Đã gửi ảnh WeCom."
}
```

**curl**

```bash
curl -X POST "https://ros.reginamiracle.com:200/api/n8n/wecom/send-image" \
  -F "webhook=YOUR-BOT-KEY" \
  -F "image=@./chart.png"
```

---

## 4) Gửi file (Excel / PDF / … ≤ 20 MB)

```
POST https://ros.reginamiracle.com:200/api/n8n/wecom/send-file
Content-Type: multipart/form-data
```

| Field | Type | Bắt buộc |
|--------|------|----------|
| `webhook` / `key` / `id` | text | có |
| `file` / `media` | binary | có — ≤ 20 MB |
| `filename` | text | không — tên hiển thị trên WeCom |

n8n: HTTP Request → **Form-Data** → `webhook` = String, `file` = Binary File.  
Không cần tự gọi `upload_media`.

**Response OK**

```json
{
  "success": true,
  "errCode": 0,
  "message": "Đã gửi file WeCom.",
  "mediaId": "..."
}
```

**curl**

```bash
curl -X POST "https://ros.reginamiracle.com:200/api/n8n/wecom/send-file" \
  -F "webhook=YOUR-BOT-KEY" \
  -F "file=@./report.xlsx" \
  -F "filename=bao-cao.xlsx"
```

---

## Flow n8n

1. (Tuỳ chọn) `send-text` hoặc `send-markdown`  
2. `send-image` hoặc `send-file` — binary  

Không có bước login.

---

## Lỗi

| HTTP | Ý nghĩa |
|------|---------|
| `400` | Thiếu webhook/content, ảnh không phải JPG/PNG, vượt size, WeCom `errcode != 0` |
| `502` | Server không gọi được WeCom |

---

## Lưu ý

- Dùng `/api/n8n/wecom/...` — **không** dùng `/api/portal/share/wecom` (bản Share cần Bearer).
- Chỉ gọi host portal; không gọi `qyapi.weixin.qq.com` từ n8n.
- Bot key lưu biến/credential n8n — không hardcode vào repo.
