# WEB AUTOMATION API

Tài liệu **Web Automation** cho `RMIV.DLL.WEB` (Playwright) và HTTP API **`/web-auto/*`** trên `RMIV.WF.CLIENT`.

Thư viện C# (.NET Framework 4.8) điều khiển trình duyệt qua **Microsoft.Playwright**. Dùng trực tiếp qua `WebAutomationManager` hoặc qua HTTP `web-auto` (session + command).

**Danh sách command runtime (JSON):** `GET http://<host>:<port>/web-auto/function/list` (không cần `api-key`).

## Mục lục

| Nội dung | Mục |
|----------|-----|
| Cài đặt Playwright | [1) Cài đặt](#1-cài-đặt-playwright) |
| Khởi tạo session | [2) Khởi tạo](#2-khởi-tạo-và-cấu-hình-launch) |
| Kiểu kết quả | [3) Response types](#3-kiểu-kết-quả) |
| API `WebAutomationManager` | [4) API chi tiết](#4-api-webautomationmanager) |
| HTTP `web-auto` | [5) HTTP API](#5-http-api-web-auto) |
| Bảng input `command` | [5.10) Bảng function](#510-bảng-input-từng-function-web-autocommand) |
| Quản lý session | [5.11) Session](#511-quản-lý-session) |

Cấu hình HTTP server chung (port, firewall, `server-config.txt`): `RMIV.WF.CLIENT/docs/HUONG-DAN-API-SAP.md` §3–§7.

---

## 1) Cài đặt Playwright

Project tham chiếu NuGet **`Microsoft.Playwright`**. Trên máy chạy worker (`RMIV.WF.CLIENT`), cần cài browser binary **một lần** sau khi build.

### Cách 1 — Windows PowerShell (khuyến nghị, **không cần `pwsh`**)

Từ thư mục chứa `RMIV.WF.CLIENT.exe` (sau build, thường `RMIV.WF.CLIENT\bin\Debug\`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\playwright.ps1 install chromium
```

Cài thêm engine khác:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\playwright.ps1 install firefox
powershell -NoProfile -ExecutionPolicy Bypass -File .\playwright.ps1 install webkit
powershell -NoProfile -ExecutionPolicy Bypass -File .\playwright.ps1 install
```

(`install` không tham số = cài chromium + firefox + webkit.)

**Lưu ý:** File là `playwright.ps1` **cạnh** `Microsoft.Playwright.dll` / `.exe`, không nằm trong `.playwright\`.

### Cách 2 — Script trong repo

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-PlaywrightBrowsers.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\Install-PlaywrightBrowsers.ps1 -Browsers chromium,firefox
```

### Cách 3 — Node.js (nếu đã cài Node)

Trong thư mục output worker (có thư mục `.playwright\package`):

```powershell
node .playwright\package\cli.js install chromium
```

Hoặc (cần `npm i -D playwright` trong project Node riêng):

```powershell
npx playwright install chromium
```

### Cách 4 — Cài PowerShell 7 (`pwsh`) tùy chọn

Chỉ khi muốn dùng đúng lệnh trong tài liệu Playwright upstream:

```powershell
winget install Microsoft.PowerShell
pwsh .\playwright.ps1 install chromium
```

Browser được tải về `%LOCALAPPDATA%\ms-playwright\`. Nếu thiếu browser, `/web-auto/connect` sẽ lỗi khi launch.

---

## 2) Khởi tạo và cấu hình launch

```csharp
var options = new WebLaunchOptions
{
    BrowserType = "chromium",   // chromium | firefox | webkit
    Headless = false,
    StartUrl = "https://example.com",
    ViewportWidth = 1280,
    ViewportHeight = 720,
    SlowMo = null,              // ms giữa thao tác (debug)
    UserAgent = null,
    DefaultTimeoutMs = 30000
};

using (var web = WebAutomationManager.Create(options))
{
  web.Fill("#user", "admin");
  web.Click("button[type=submit]");
}
```

| Thuộc tính `WebLaunchOptions` | Mặc định | Mô tả |
|-------------------------------|----------|--------|
| `BrowserType` | `chromium` | Engine Playwright |
| `Headless` | `false` | `true` = không hiện cửa sổ |
| `StartUrl` | `null` | Mở URL ngay sau launch |
| `ViewportWidth` / `ViewportHeight` | `null` | Kích thước viewport (cả hai cùng có giá trị mới áp dụng) |
| `SlowMo` | `null` | Làm chậm thao tác (ms) |
| `UserAgent` | `null` | User-Agent tùy chỉnh |
| `DefaultTimeoutMs` | `null` | Timeout mặc định cho selector/navigation |

Mỗi instance `WebAutomationManager` = **một browser + một context + một hoặc nhiều tab** (`IPage`). Tab đang active dùng cho mọi lệnh (trừ `NewPage`, `ClosePage`, `SwitchPage`, `ListPages`).

---

## 3) Kiểu kết quả

| Type | Thuộc tính chính |
|------|------------------|
| `WebAccessResponse` | `Success`, `Message` — thao tác không trả payload |
| `WebTextResponse` | thêm `Value` (string) |
| `WebBoolResponse` | thêm `Value` (bool) |
| `WebBytesResponse` | `ContentBase64`, `ContentByteLength` — ảnh chụp màn hình |
| `WebScriptResponse` | `ResultJson` — kết quả `Evaluate` / `RunJavaScript` / `RunScript` (JSON string) |
| `WebListResponse` | `Values` (mảng string), `Count` — danh sách kết quả tìm element |
| `WebDownloadHtmlResponse` | `SavedFullPath`, `ContentByteLength` — lưu HTML ra file |
| `WebApiResponse` | `StatusCode`, `StatusText`, `ContentType`, `Body`, `HeadersJson` — HTTP request qua session browser |

Factory: `WebAccessResponse.Ok()`, `WebAccessResponse.Fail(message)`.

Qua HTTP, object `Result` trong `ApiResponse` phản ánh các field trên. Ảnh chụp: giải mã `ContentBase64` ở phía client.

---

## 4) API WebAutomationManager

**Quy ước cột bảng**

| Cột | Ý nghĩa |
|-----|---------|
| **Input** | Tên tham số (C# / `paramObject` qua HTTP) |
| **Kiểu** | Kiểu dữ liệu |
| **Bắt buộc** | Có / Không |
| **Mặc định** | Giá trị khi bỏ qua |
| **Mô tả** | Ý nghĩa và ví dụ |

**Selector** (dùng chung): chuỗi Playwright — CSS (`#id`, `.class`), `text=Đăng nhập`, `xpath=//button`, v.v.

### Kiểm tra element trước khi thực hiện lệnh

Mọi lệnh dùng `selector` hoặc `queryType` / `queryValue` (id, class, xpath, css, tag) đều **kiểm tra element có tồn tại trên trang trước**, rồi mới thực hiện thao tác. Mục tiêu: tránh chờ timeout dài (mặc định ~30s) khi element không có — đặc biệt với lệnh đọc giá trị (`GetText`, `GetInputValue`, `FindElements`, …).

| Loại lệnh | `timeoutMs` = `null` hoặc `≤ 0` | `timeoutMs` > 0 |
|-----------|--------------------------------|-----------------|
| **Đọc giá trị** (`GetText`, `GetInputValue`, `GetAttribute`, `ScreenshotElement`, …) | Không tìm thấy → **lỗi ngay** (`Success=false`, message `Element not found for selector: ...`) | Chờ tối đa `timeoutMs` cho element xuất hiện, rồi đọc |
| **Tương tác** (`Click`, `Fill`, `Check`, …) | Không tìm thấy → **lỗi ngay** (giống lệnh đọc) | Chờ tối đa `timeoutMs`, rồi thao tác |
| **Query list** (`FindElements`, `GetHtml`) | Không tìm thấy → **`Values` rỗng**, `Count=0` (không lỗi) | Chờ element đầu tiên, rồi trả list |
| **Kiểm tra bool** (`IsVisible`, `IsChecked`, `IsEnabled`) | Không tìm thấy → `Value=false` (không lỗi) | Chờ element, rồi kiểm tra |

Muốn chờ element render chậm khi **đọc** giá trị: truyền `timeoutMs` rõ ràng, ví dụ `"timeoutMs": "5000"`.

**`queryType` + `queryValue`** (dùng cho `FindElements`, `GetHtml`):

| `queryType` | `queryValue` ví dụ | Mô tả |
|-------------|-------------------|--------|
| `id` | `main-content` | Element có `id` |
| `class` | `btn-primary` | Element chứa class token |
| `xpath` | `//div[@data-id='1']` | Biểu thức XPath |
| `css` | `div.item > a` | CSS selector tùy ý |
| `tag` / `element` | `table`, `a` | Tên thẻ HTML |

**`timeoutMs`**: timeout chờ element / navigation (millisecond). `null` = dùng `DefaultTimeoutMs` lúc `connect`, hoặc timeout mặc định Playwright.

Qua HTTP (`/web-auto/command`), truyền input bằng **`paramObject`** (khuyến nghị) hoặc **`params`** theo thứ tự overload. Kiểu `int?` / `bool` thường gửi dạng chuỗi (`"30000"`, `"true"`).

---

### 4.1 Điều hướng

#### `Navigate`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `url` | `string` | **Có** | — | URL đích, ví dụ `https://example.com/path` |
| `timeoutMs` | `int?` | Không | `null` | Timeout tải trang (ms) |

**Output:** `WebAccessResponse` (`Success`, `Message`).

---

#### `GoBack`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `timeoutMs` | `int?` | Không | `null` | Timeout thao tác (ms) |

**Output:** `WebAccessResponse`.

---

#### `GoForward`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `timeoutMs` | `int?` | Không | `null` | Timeout thao tác (ms) |

**Output:** `WebAccessResponse`.

---

#### `Reload`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `timeoutMs` | `int?` | Không | `null` | Timeout tải lại (ms) |

**Output:** `WebAccessResponse`.

---

### 4.2 Tương tác element

#### `Click`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element cần click |
| `timeoutMs` | `int?` | Không | `null` | Chờ element (ms) |
| `force` | `bool` | Không | `false` | `true` = click kể cả element bị che / không actionable |

**Output:** `WebAccessResponse`.

---

#### `DoubleClick`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element cần double-click |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `Fill`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | `input`, `textarea`, `[contenteditable]` |
| `value` | `string` | **Có** | — | Nội dung điền (xóa giá trị cũ trước khi ghi) |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `Type`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element nhận phím |
| `text` | `string` | **Có** | — | Chuỗi gõ lần lượt từng ký tự |
| `delayMs` | `int?` | Không | `null` | Độ trễ giữa các ký tự (ms) |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `Press`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element focus trước khi gửi phím |
| `key` | `string` | **Có** | — | Tên phím: `Enter`, `Tab`, `ArrowDown`, `Control+A`, … |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `SelectOption`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Thẻ `<select>` |
| `value` | `string` | **Có** | — | `value` hoặc label option cần chọn |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `Check`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Checkbox / radio |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `Uncheck`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Checkbox |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `Hover`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element cần hover |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

#### `SetInputFiles`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | `input[type=file]` |
| `filePath` | `string` | **Có** | — | Đường dẫn file **trên máy worker** (absolute hoặc relative) |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay, không có element → lỗi (không chờ ~30s) |

**Output:** `WebAccessResponse`.

---

### 4.3 Đọc dữ liệu

#### `GetText`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element cần đọc |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = không chờ; không có element → lỗi ngay (xem [Kiểm tra element](#kiểm-tra-element-trước-khi-thực-hiện-lệnh)) |

**Output:** `WebTextResponse` — `Value` = text content (có thể `null` nếu không có node text).

---

#### `GetInnerText`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element cần đọc |
| `timeoutMs` | `int?` | Không | `null` | Chờ element (ms) |

**Output:** `WebTextResponse` — `Value` = inner text hiển thị.

---

#### `GetInputValue`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | `input`, `textarea`, `select` |
| `timeoutMs` | `int?` | Không | `null` | Chờ element (ms) |

**Output:** `WebTextResponse` — `Value` = giá trị hiện tại của control.

---

#### `GetAttribute`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element |
| `attributeName` | `string` | **Có** | — | Tên attribute: `href`, `src`, `value`, `class`, … |
| `timeoutMs` | `int?` | Không | `null` | Chờ element (ms) |

**Output:** `WebTextResponse` — `Value` = giá trị attribute (hoặc `null`).

---

#### `GetTitle`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| *(không có)* | — | — | — | Đọc tab đang active |

**Output:** `WebTextResponse` — `Value` = `document.title`.

---

#### `GetUrl`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| *(không có)* | — | — | — | Đọc tab đang active |

**Output:** `WebTextResponse` — `Value` = URL hiện tại.

---

#### `GetContent`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| *(không có)* | — | — | — | Lấy HTML toàn trang |

**Output:** `WebTextResponse` — `Value` = chuỗi HTML (`page.content()`).

---

#### `DownloadFullHtml`

Lưu toàn bộ HTML document ra file trên **máy worker** (khác `GetContent` chỉ trả về trong response).

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `filePath` | `string` | **Có** | — | Đường dẫn file đích (tự tạo thư mục cha nếu cần) |
| `encodingName` | `string` | Không | `"utf-8"` | Encoding ghi file: `utf-8`, `utf-16`, … |

**Output:** `WebDownloadHtmlResponse` — `SavedFullPath`, `ContentByteLength`.

---

#### `FindElements`

Tìm **tất cả** element khớp `queryType` / `queryValue`; trả **list** giá trị đọc được.

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `queryType` | `string` | **Có** | — | `id`, `class`, `xpath`, `css`, `tag` |
| `queryValue` | `string` | **Có** | — | Giá trị tương ứng (xem bảng `queryType` ở trên) |
| `valueKind` | `string` | Không | `"innerText"` | Loại giá trị lấy ra (mỗi element một phần tử trong `Values`) |
| `timeoutMs` | `int?` | Không | `null` | Chờ element đầu tiên xuất hiện (ms) |

**`valueKind` hỗ trợ:** `innerText`, `text` / `textContent`, `innerHtml`, `outerHtml`, `value`, hoặc tên attribute (`href`, `src`, `class`, …).

**Output:** `WebListResponse` — `Values` = `["...", "..."]`, `Count`.

**Ví dụ HTTP** — lấy text mọi link trong class `nav-item`:

```json
{
  "sessionId": "...",
  "function": "FindElements",
  "paramObject": {
    "queryType": "class",
    "queryValue": "nav-item",
    "valueKind": "innerText"
  }
}
```

---

#### `GetHtml`

Lấy HTML bên trong (hoặc bao gồm chính element) của mọi element khớp query.

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `queryType` | `string` | **Có** | — | `id`, `class`, `xpath`, `css`, `tag` |
| `queryValue` | `string` | **Có** | — | Giá trị query |
| `outerHtml` | `bool` | Không | `false` | `false` = `innerHTML`; `true` = `outerHTML` |
| `timeoutMs` | `int?` | Không | `null` | Chờ element đầu tiên (ms) |

**Output:** `WebListResponse` — mỗi phần tử `Values` là HTML của một element khớp.

**Ví dụ** — HTML trong `#content`:

```json
{
  "function": "GetHtml",
  "paramObject": {
    "queryType": "id",
    "queryValue": "content",
    "outerHtml": "false"
  }
}
```

---

### 4.4 Kiểm tra trạng thái

#### `IsVisible`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element kiểm tra |
| `timeoutMs` | `int?` | Không | `null` | Chờ element (ms) |

**Output:** `WebBoolResponse` — `Value` = `true` nếu visible.

---

#### `IsChecked`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Checkbox / radio |
| `timeoutMs` | `int?` | Không | `null` | Chờ element (ms) |

**Output:** `WebBoolResponse`.

---

#### `IsEnabled`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element kiểm tra |
| `timeoutMs` | `int?` | Không | `null` | Chờ element (ms) |

**Output:** `WebBoolResponse`.

---

### 4.5 Chờ

#### `WaitForSelector`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Selector chờ |
| `state` | `string` | Không | `"visible"` | `visible`, `attached`, `detached`, `hidden` |
| `timeoutMs` | `int?` | Không | `null` | Thời gian chờ tối đa (ms) |

**Output:** `WebAccessResponse`.

---

#### `WaitForLoadState`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `state` | `string` | Không | `"load"` | `load`, `domcontentloaded`, `networkidle` |
| `timeoutMs` | `int?` | Không | `null` | Timeout (ms) |

**Output:** `WebAccessResponse`.

---

#### `WaitForTimeout`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `milliseconds` | `int` | **Có** | — | Số ms chờ cố định (≥ 0) |

**Output:** `WebAccessResponse`.

---

### 4.6 HTTP request qua session trình duyệt

#### `FetchApi`

Gửi HTTP(S) request **dùng cookie/session của Chrome (browser context) hiện tại**. Dùng sau khi đã `Navigate` + login — request tự mang cookie đã lưu, không cần copy token thủ công.

Playwright `context.Request` chia sẻ cookie với tab đang active; tự follow redirect.

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `url` | `string` | **Có** | — | URL API đầy đủ, ví dụ `https://portal.example.com/api/orders` |
| `method` | `string` | Không | `"GET"` | `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD` |
| `headersJson` | `string` | Không | `null` | JSON object header, ví dụ `{"Content-Type":"application/json","X-Requested-With":"XMLHttpRequest"}` |
| `body` | `string` | Không | `null` | Body request (JSON/text). Bỏ qua với `GET`/`HEAD` |
| `timeoutMs` | `int?` | Không | `null` | Timeout request (ms) |
| `failOnHttpError` | `bool` | Không | `false` | `true` = lỗi khi HTTP status không phải 2xx/3xx |

**Output:** `WebApiResponse` — `StatusCode`, `StatusText`, `ContentType`, `Body` (nội dung response), `HeadersJson`.

**Ví dụ C#** — GET API sau login:

```csharp
var api = web.FetchApi("https://portal.example.com/api/user/profile");
// api.Body = JSON string
```

**Ví dụ HTTP** — POST JSON:

```json
{
  "sessionId": "...",
  "function": "FetchApi",
  "paramObject": {
    "url": "https://portal.example.com/api/search",
    "method": "POST",
    "headersJson": "{\"Content-Type\":\"application/json\"}",
    "body": "{\"keyword\":\"RMIV\",\"page\":1}",
    "timeoutMs": "30000"
  }
}
```

**Lưu ý:** Với POST JSON cần set `Content-Type: application/json` trong `headersJson`. Cookie session lấy từ trình duyệt — gọi `FetchApi` **cùng `sessionId`** sau khi đã login trên tab đó.

---

### 4.7 Ảnh chụp & JavaScript

#### Ảnh chụp màn hình

`Screenshot` và `ScreenshotElement` trả về **PNG** qua `WebBytesResponse` (`ContentBase64`, `ContentByteLength`). Qua HTTP, giải mã Base64 ở phía client để lưu file hoặc nhúng ảnh.

**Luồng xử lý trước khi chụp (cả hai hàm):**

1. Chờ font trên trang sẵn sàng (`document.fonts.ready`).
2. Nếu `delayMs` > 0 — chờ thêm số ms đó.
3. Gọi Playwright screenshot (viewport / full page / clip element) với tùy chọn animation tương ứng `disableAnimations`.

---

#### `Screenshot`

Chụp **tab đang active**: mặc định chỉ vùng viewport; `fullPage=true` chụp toàn bộ chiều cao trang cuộn.

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `fullPage` | `bool` | Không | `false` | `true` = chụp cả trang cuộn; `false` = chỉ viewport hiện tại |
| `delayMs` | `int?` | Không | `null` | Chờ thêm (ms) **sau bước chờ font**, trước khi chụp. `null` hoặc `≤ 0` = không chờ thêm. Dùng khi biểu đồ / canvas vẽ chậm (vd. `1000`) |
| `disableAnimations` | `bool` | Không | `false` | `false` = Playwright `Animations.Allow` (animation chạy tự nhiên). `true` = `Animations.Disabled` — tua nhanh animation hữu hạn, animation vô hạn reset về frame đầu |

**Output:** `WebBytesResponse` — `ContentBase64` (PNG), `ContentByteLength`.

**Biểu đồ (Highcharts, ECharts, Chart.js, …):** data label (số %, giá trị điểm) thường vẽ **sau** animation series. Nếu chụp quá sớm, ảnh có thể chỉ còn đường line mà thiếu số. Khuyến nghị:

- `disableAnimations=false` (mặc định) — để animation hoàn tất.
- `delayMs` khoảng `800`–`1500` tùy độ phức tạp biểu đồ, hoặc gọi `WaitForTimeout` / `WaitForLoadState` trước `Screenshot`.
- Tránh `disableAnimations=true` khi cần data label — Playwright có thể tua animation trước khi label được vẽ.

**Ví dụ HTTP** — viewport:

```json
{
  "function": "Screenshot",
  "paramObject": {}
}
```

**Ví dụ HTTP** — toàn trang + chờ biểu đồ:

```json
{
  "function": "Screenshot",
  "paramObject": {
    "fullPage": "true",
    "delayMs": "1000",
    "disableAnimations": "false"
  }
}
```

`Result.ContentBase64` = PNG mã hóa Base64; `Result.ContentByteLength` = kích thước file (byte).

---

#### `ScreenshotElement`

Chụp **một element** theo Playwright selector — ảnh crop theo bounding box của element (chỉ phần đang hiển thị trong viewport nếu element nằm trong vùng scroll).

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `selector` | `string` | **Có** | — | Element cần chụp (CSS, `text=...`, `xpath=...`) |
| `timeoutMs` | `int?` | Không | `null` | Chờ element xuất hiện (ms). `null` = kiểm tra ngay — không có element → lỗi (xem [Kiểm tra element](#kiểm-tra-element-trước-khi-thực-hiện-lệnh)) |
| `delayMs` | `int?` | Không | `null` | Chờ thêm (ms) sau font, trước khi chụp — cùng ý nghĩa `Screenshot` |
| `disableAnimations` | `bool` | Không | `false` | Cùng ý nghĩa `Screenshot` |

**Output:** `WebBytesResponse` — `ContentBase64` (PNG), `ContentByteLength`.

**Lưu ý selector:**

- Chọn **container biểu đồ đủ lớn** (bao gồm data label phía trên điểm), tránh phần tử con bị `overflow: hidden` làm cắt mất số.
- Element bị element khác che hoàn toàn có thể không hiển thị đúng trên ảnh clip.

**Ví dụ HTTP:**

```json
{
  "function": "ScreenshotElement",
  "paramObject": {
    "selector": "#chart-container",
    "timeoutMs": "5000",
    "delayMs": "1000"
  }
}
```

---

#### `Evaluate`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `script` | `string` | **Có** | — | Hàm JS, ví dụ `() => document.title` hoặc `(arg) => arg.x + 1` |
| `argJson` | `string` | Không | `null` | JSON object/array truyền làm đối số thứ hai của script |

**Output:** `WebScriptResponse` — `ResultJson` = kết quả serialize JSON.

---

#### `RunJavaScript`

Giống `Evaluate` — chạy chuỗi JavaScript trong context trình duyệt (tab đang active).

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `script` | `string` | **Có** | — | Mã JS (thường là hàm: `() => { ... }`) |
| `argJson` | `string` | Không | `null` | JSON đối số truyền vào script |

**Output:** `WebScriptResponse`.

---

#### `RunJavaScriptFile`

Đọc file `.js` trên **máy worker** rồi chạy trên trang.

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `filePath` | `string` | **Có** | — | Đường dẫn file `.js` local (worker) |
| `argJson` | `string` | Không | `null` | JSON đối số cho script |

**Output:** `WebScriptResponse`.

**Ví dụ HTTP:**

```json
{
  "function": "RunJavaScriptFile",
  "paramObject": {
    "filePath": "D:\\scripts\\scrape.js",
    "argJson": "{\"maxRows\":100}"
  }
}
```

---

#### `RunScript`

Chạy mã **như gõ trong DevTools Console** (`eval` trên trang). Không cần bọc `() => { ... }`.

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `code` | `string` | **Có** | — | Biểu thức hoặc câu lệnh JS |
| `argJson` | `string` | Không | `null` | JSON truyền vào; trong `code` dùng biến `__arg` |

**Output:** `WebScriptResponse` — `ResultJson` = giá trị trả về của `eval`.

| Hàm | Cách viết |
|-----|-----------|
| `RunJavaScript` / `Evaluate` | Hàm: `() => document.title` |
| `RunScript` | Console: `document.title` hoặc `const n = document.querySelectorAll('a').length; n` |

**Ví dụ HTTP:**

```json
{
  "function": "RunScript",
  "paramObject": {
    "code": "document.querySelectorAll('table tr').length"
  }
}
```

```json
{
  "function": "RunScript",
  "paramObject": {
    "code": "__arg.selector + ' => ' + document.querySelector(__arg.selector)?.innerText",
    "argJson": "{\"selector\":\"#title\"}"
  }
}
```

---

### 4.8 Quản lý tab

#### `NewPage`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `url` | `string` | Không | `null` | Nếu có — mở URL trên tab mới; tab mới trở thành active |

**Output:** `WebAccessResponse` — `Message` có thể chứa `Page index: N`.

---

#### `ClosePage`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `pageIndex` | `int` | **Có** | — | Chỉ số tab (0-based), xem `ListPages` |

**Output:** `WebAccessResponse`. Nếu đóng tab active, chuyển sang tab cuối còn lại.

---

#### `SwitchPage`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| `pageIndex` | `int` | **Có** | — | Chỉ số tab (0-based) |

**Output:** `WebAccessResponse`.

---

#### `ListPages`

| Input | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-------|------|----------|----------|--------|
| *(không có)* | — | — | — | Liệt kê mọi tab trong session |

**Output:** `WebTextResponse` — `Value` = JSON array:

```json
[
  { "index": 0, "url": "https://...", "active": true },
  { "index": 1, "url": "https://...", "active": false }
]
```

---

### 4.9 Không gọi qua HTTP `command`

| Hàm | Input | Ghi chú |
|-----|-------|---------|
| `Dispose()` | — | Server gọi khi `/web-auto/disconnect`, idle timeout, hoặc shutdown |
| `WebAutomationManager.Create(options)` | `WebLaunchOptions` | Thay bằng `/web-auto/connect` |

---

## 5) HTTP API `web-auto`

### 5.1 Kiến trúc

1. Máy **A** chạy **`RMIV.WF.CLIENT`**, HTTP server **bật**.
2. Máy **B** gửi HTTP: `connect` → giữ `sessionId` (GUID) → `command` → `disconnect`.
3. Mỗi `sessionId` = một browser Playwright trên máy A (headless hoặc có UI).

### 5.2 Bảo mật `api-key`

| Route | Header `api-key` |
|-------|------------------|
| `GET` / `POST` `/web-auto/function/list`, `/web-auto/list` | **Không bắt buộc** |
| Mọi route `/web-auto/*` còn lại | **Bắt buộc**; khớp API key trên form Gateway / worker |

```http
api-key: <giá trị API key>
Content-Type: application/json
```

### 5.3 Base URL

`http://<ip>:<port>/` (ví dụ `http://192.168.1.50:8081`)

### 5.4 Route

| Route | Method | Ghi chú |
|-------|--------|---------|
| `/web-auto/function/list` | GET hoặc POST | Liệt kê command + overload (reflection trên `WebAutomationManager`) và các mục HTTP `connect` / `disconnect` / `session/check`. **Không** cần `api-key` (giống `/sap-auto/function/list`). |
| `/web-auto/list` | GET hoặc POST | Alias của `/web-auto/function/list`. |
| `/web-auto/connect` | POST + JSON body | Mở browser; bắt buộc `sessionId` (GUID). |
| `/web-auto/disconnect` | POST + JSON body | Đóng browser; bắt buộc `sessionId`. |
| `/web-auto/session/check` | POST + JSON body | Kiểm tra session còn active. |
| `/web-auto/session/list` | GET | Liệt kê tất cả session web đang mở (cần `api-key`). |
| `/web-auto/sessions` | GET | Alias của `/web-auto/session/list`. |
| `/web-auto/session/kill-all` | POST + JSON body (tùy chọn) | Đóng hết browser web — headless và có UI (cần `api-key`). |
| `/web-auto/command` | POST + JSON body | Bắt buộc `sessionId`, `function`. |

Payload chung: `sessionId`, `function`, `param`, `params`, `paramObject`, `logUrl`, `idleTimeoutMinutes`.

**Input từng `function`:** [§5.10](#510-bảng-input-từng-function-web-autocommand) (tóm tắt) hoặc [§4](#4-api-webautomationmanager) (chi tiết output/ví dụ).

### 5.5 Trường JSON cho `connect`

| Field | Bắt buộc | Mô tả |
|-------|----------|--------|
| `sessionId` | Có | GUID |
| `browserType` | Không | `chromium` / `firefox` / `webkit` |
| `headless` | Không | `true` / `false` (mặc định `false`) |
| `startUrl` | Không | URL mở ngay sau launch |
| `viewportWidth` / `viewportHeight` | Không | Số nguyên |
| `slowMo` | Không | ms |
| `userAgent` | Không | Chuỗi |
| `defaultTimeoutMs` | Không | Timeout mặc định (ms) |
| `idleTimeoutMinutes` | Không | Web: mặc định **5** phút idle tự đóng; gửi số khác để ghi đè. |

### 5.6 Ví dụ `connect`

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "browserType": "chromium",
  "headless": false,
  "startUrl": "https://example.com/login",
  "viewportWidth": 1280,
  "viewportHeight": 720,
  "idleTimeoutMinutes": 30
}
```

Response thành công (`Result`):

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "browserType": "chromium",
  "headless": false,
  "currentUrl": "https://example.com/login",
  "idleTimeoutMinutes": 5
}
```

> **`headless: true`** — browser chạy ẩn trên **máy worker**, không hiện cửa sổ trên máy gọi API. Muốn thấy UI: `headless: false` và xem trên màn hình / RDP máy server.

### 5.7 Ví dụ `command` — điền form và click

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "Fill",
  "paramObject": {
    "selector": "#username",
    "value": "admin"
  }
}
```

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "Click",
  "paramObject": {
    "selector": "button[type=submit]"
  }
}
```

### 5.8 Ví dụ `command` — chờ và đọc text

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "WaitForSelector",
  "paramObject": {
    "selector": ".result",
    "state": "visible",
    "timeoutMs": "15000"
  }
}
```

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "GetInnerText",
  "paramObject": {
    "selector": ".result"
  }
}
```

Kết quả trong `Result`: `{ "Success": true, "Value": "..." }`.

### 5.9 Ví dụ `command` — chụp màn hình / JavaScript / disconnect

**Chụp viewport (mặc định):**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "Screenshot",
  "paramObject": {}
}
```

**Chụp toàn trang + chờ biểu đồ render:**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "Screenshot",
  "paramObject": {
    "fullPage": "true",
    "delayMs": "1000",
    "disableAnimations": "false"
  }
}
```

**Chụp một element (biểu đồ):**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "ScreenshotElement",
  "paramObject": {
    "selector": "#sales-chart",
    "timeoutMs": "5000",
    "delayMs": "1000"
  }
}
```

`Result.ContentBase64` = PNG mã hóa Base64; `Result.ContentByteLength` = kích thước byte.

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "Evaluate",
  "paramObject": {
    "script": "() => document.title",
    "argJson": null
  }
}
```

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44"
}
```

```http
POST /web-auto/disconnect
```

### Luồng tích hợp điển hình

1. `POST /web-auto/connect` — tạo `sessionId` (GUID).
2. Lặp `POST /web-auto/command` — `Navigate`, `Fill`, `Click`, …
3. `POST /web-auto/disconnect` — hoặc để **idle timeout** (mặc định 5 phút), hoặc `POST /web-auto/session/kill-all` (đóng hết web), hoặc `POST /sap-auto/admin/disconnect-all` (đóng SAP + file + web).

### 5.10) Bảng input từng `function` (`/web-auto/command`)

Tên field trong **`paramObject`** trùng tên tham số C#. Cột **Bắt buộc** = phải có trong `paramObject` (hoặc `params` đúng thứ tự).

| `function` | Input | Kiểu | Bắt buộc | Mặc định | Mô tả ngắn |
|------------|-------|------|----------|----------|------------|
| **Navigate** | `url` | string | Có | — | URL đích |
| | `timeoutMs` | int | Không | null | Timeout load (ms) |
| **GoBack** | `timeoutMs` | int | Không | null | |
| **GoForward** | `timeoutMs` | int | Không | null | |
| **Reload** | `timeoutMs` | int | Không | null | |
| **Click** | `selector` | string | Có | — | Playwright selector |
| | `timeoutMs` | int | Không | null | |
| | `force` | bool | Không | false | Click kể cả bị che |
| **DoubleClick** | `selector` | string | Có | — | |
| | `timeoutMs` | int | Không | null | |
| **Fill** | `selector` | string | Có | — | input/textarea |
| | `value` | string | Có | — | Nội dung điền |
| | `timeoutMs` | int | Không | null | |
| **Type** | `selector` | string | Có | — | |
| | `text` | string | Có | — | Gõ từng ký tự |
| | `delayMs` | int | Không | null | Trễ giữa ký tự (ms) |
| | `timeoutMs` | int | Không | null | |
| **Press** | `selector` | string | Có | — | |
| | `key` | string | Có | — | `Enter`, `Tab`, … |
| | `timeoutMs` | int | Không | null | |
| **SelectOption** | `selector` | string | Có | — | `<select>` |
| | `value` | string | Có | — | value/label option |
| | `timeoutMs` | int | Không | null | |
| **Check** / **Uncheck** | `selector` | string | Có | — | |
| | `timeoutMs` | int | Không | null | |
| **Hover** | `selector` | string | Có | — | |
| | `timeoutMs` | int | Không | null | |
| **SetInputFiles** | `selector` | string | Có | — | `input[type=file]` |
| | `filePath` | string | Có | — | Path trên **máy worker** |
| | `timeoutMs` | int | Không | null | |
| **GetText** / **GetInnerText** / **GetInputValue** | `selector` | string | Có | — | → `Result.Value` |
| | `timeoutMs` | int | Không | null | |
| **GetAttribute** | `selector`, `attributeName` | string | Có | — | `href`, `value`, … |
| | `timeoutMs` | int | Không | null | |
| **GetTitle** / **GetUrl** / **GetContent** | — | — | — | — | Không input |
| **DownloadFullHtml** | `filePath` | string | Có | — | Lưu HTML ra file worker |
| | `encodingName` | string | Không | utf-8 | |
| **FindElements** | `queryType`, `queryValue` | string | Có | — | id / class / xpath / css / tag |
| | `valueKind` | string | Không | innerText | innerText, href, … |
| | `timeoutMs` | int | Không | null | |
| **GetHtml** | `queryType`, `queryValue` | string | Có | — | |
| | `outerHtml` | bool | Không | false | false=inner, true=outer |
| | `timeoutMs` | int | Không | null | |
| **FetchApi** | `url` | string | Có | — | HTTP qua cookie session browser |
| | `method` | string | Không | GET | POST, PUT, … |
| | `headersJson` | string | Không | null | JSON object header |
| | `body` | string | Không | null | Body POST/PUT |
| | `timeoutMs` | int | Không | null | |
| | `failOnHttpError` | bool | Không | false | Lỗi khi status ≠ 2xx/3xx |
| **IsVisible** / **IsChecked** / **IsEnabled** | `selector` | string | Có | — | → bool |
| | `timeoutMs` | int | Không | null | |
| **WaitForSelector** | `selector` | string | Có | — | |
| | `state` | string | Không | `visible` | `attached`, `hidden`, … |
| | `timeoutMs` | int | Không | null | |
| **WaitForLoadState** | `state` | string | Không | `load` | `networkidle`, … |
| | `timeoutMs` | int | Không | null | |
| **WaitForTimeout** | `milliseconds` | int | Có | — | Chờ cố định (ms) |
| **Screenshot** | `fullPage` | bool | Không | false | `true` = toàn trang cuộn → `Result.ContentBase64` (PNG) |
| | `delayMs` | int | Không | null | Chờ thêm sau font, trước chụp (ms) |
| | `disableAnimations` | bool | Không | false | `true` = tắt/tua animation Playwright |
| **ScreenshotElement** | `selector` | string | Có | — | Clip theo bounding box element |
| | `timeoutMs` | int | Không | null | Chờ element (ms) |
| | `delayMs` | int | Không | null | Chờ thêm sau font (ms) |
| | `disableAnimations` | bool | Không | false | Giống `Screenshot` |
| **Evaluate** / **RunJavaScript** | `script` | string | Có | — | Hàm JS |
| | `argJson` | string | Không | null | JSON đối số |
| **RunJavaScriptFile** | `filePath` | string | Có | — | File .js trên worker |
| | `argJson` | string | Không | null | |
| **RunScript** | `code` | string | Có | — | Mã kiểu DevTools Console |
| | `argJson` | string | Không | null | Biến `__arg` |
| **NewPage** | `url` | string | Không | null | Tab mới |
| **ClosePage** / **SwitchPage** | `pageIndex` | int | Có | — | 0-based |
| **ListPages** | — | — | — | — | → JSON array tab |

**Output chung:** `ApiResponse.Result` chứa `Success`, `Message`, và `Value` / `ContentBase64` / `ResultJson` / `Body` + `StatusCode` (FetchApi) tùy hàm.

**Kiểu số/bool qua HTTP:** gửi chuỗi `"30000"`, `"true"` trong `paramObject` — server tự parse.

### 5.11) Quản lý session

| Hành vi | Chi tiết |
|---------|----------|
| `MaxWebSessions` | Mặc định **5** session web đồng thời |
| Idle timeout | **Mặc định 5 phút** không có request (`command`, `connect`…) → tự đóng browser. Ghi đè bằng `idleTimeoutMinutes` khi connect. Timer quét mỗi **1 phút**. |
| `GET /web-auto/session/list` | Liệt kê mọi session (headless + có UI). Cần `api-key`. |
| `GET /web-auto/sessions` | Alias của `session/list`. |
| `POST /web-auto/session/kill-all` | Đóng **hết** browser web; body tùy chọn `{ "reason": "..." }`. |
| `POST /web-auto/session/check` | Kiểm tra một `sessionId`. |
| `POST /sap-auto/admin/disconnect-all` | Đóng **cả** SAP, file và web |

Cùng `sessionId` đã connect: gọi lại `connect` trả `Already connected` (không launch browser mới).

**Liệt kê session:**

```http
GET /web-auto/session/list
api-key: <key>
```

```json
{
  "Success": true,
  "Result": {
    "totalSessions": 2,
    "maxSessions": 5,
    "sessions": [
      {
        "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
        "active": true,
        "browserType": "chromium",
        "headless": true,
        "currentUrl": "https://example.com/",
        "lastUsedUtc": "2026-07-10T14:30:00.0000000Z",
        "idleTimeoutMinutes": 5
      }
    ]
  }
}
```

**Đóng tất cả browser web:**

```http
POST /web-auto/session/kill-all
api-key: <key>
Content-Type: application/json

{ "reason": "cleanup" }
```

```json
{
  "Success": true,
  "Message": "Closed 2 web session(s)",
  "Result": { "sessionsClosed": 2, "reason": "cleanup" }
}
```

### Mã lỗi thường gặp

| HTTP / `Success` | Nguyên nhân |
|------------------|-------------|
| `400` | Thiếu/sai `api-key`, thiếu `sessionId`, GUID sai, thiếu `function` |
| `404` | Sai path (ví dụ `/webauto/` thay vì `/web-auto/`) |
| `500` | Playwright chưa cài, thiếu `System.Text.Json.dll`, selector timeout |
| `Success: false` khi connect | Chưa `playwright.ps1 install chromium` trên máy worker |

Message lỗi Playwright nằm trong `ApiResponse.Message` hoặc `Result.Message`.

### Ghi chú kỹ thuật

- Các method `WebAutomationManager` là **đồng bộ** (bọc async Playwright) — phù hợp reflection HTTP.
- Mỗi session có `SyncRoot` — không gọi song song hai `command` trên cùng `sessionId`.
- Selector: CSS, `text=...`, `xpath=...` (cú pháp Playwright).
- `filePath` / upload: đường dẫn trên **máy worker**, không phải máy gọi API.

---

## Liên quan

- SAP automation: `RMIV.WF.CLIENT/docs/HUONG-DAN-API-SAP.md`
- File automation: `RMIV.DLL.FILEMANAGER/README.md`
- Cài browser: `scripts/Install-PlaywrightBrowsers.ps1`
