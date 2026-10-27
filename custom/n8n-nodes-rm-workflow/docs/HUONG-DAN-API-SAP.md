# Hướng dẫn tạo và sử dụng HTTP API cho SAP Automation

Tài liệu này hướng dẫn **người vận hành và tích hợp** cách **bật máy chủ HTTP** trong ứng dụng **`RMIV.WF.CLIENT`** (WinForms), cấu hình bảo mật, và gọi các endpoint **`/sap-auto/*`** để điều khiển SAP GUI qua một tiến trình SAP connector trên máy chạy client.

Đặc tả đầy đủ các hàm trên connector (`ISapConnector`, focus/caret, v.v.) nằm tại **`RMIV.DLL.SAP/README.md`**.

**Danh sách command + bảng tham số:** [§18 — Phụ lục: danh sách command](#18-phụ-lục-danh-sách-command-và-biến-tham-số).

**Danh sách hàm trực tiếp từ API (JSON):** khi đã bật HTTP server trên máy chạy `RMIV.WF.CLIENT`, mở link sau trong trình duyệt (hoặc Ctrl+click trong VS Code / Cursor). Mặc định port **8080** — đổi cho khớp ô **Port** trên form.

[http://127.0.0.1:8080/sap-auto/function/list](http://127.0.0.1:8080/sap-auto/function/list)

Gọi từ máy khác trong LAN: thay `127.0.0.1` bằng IP hoặc hostname máy host (ví dụ `http://192.168.1.50:8080/sap-auto/function/list`). Route này **không bắt buộc** header `api-key` (xem §7).

---

## Mục lục nhanh

| Nội dung | Mục |
|----------|-----|
| Thiết lập server, bảo mật, endpoint | §1–§10 |
| Trường JSON, `open-and-connect`, `command` | §10–§14 |
| Luồng tích hợp, lỗi, mở rộng | §15–§17 |
| **Bảng đầy đủ command / tham số** | **§18** |
| **Click: JSON toàn bộ hàm** | [http://127.0.0.1:8080/sap-auto/function/list](http://127.0.0.1:8080/sap-auto/function/list) |

---

## 1. Kiến trúc ngắn gọn

1. Máy **A** chạy **SAP GUI** + **`RMIV.WF.CLIENT`** với HTTP server **bật**.
2. Máy **B** (hoặc script trên A) gửi request HTTP tới A: mở SAP, giữ `sessionId`, gọi lệnh reflection (`ExecuteTCode`, `SetText`, …), cuối cùng `disconnect`.
3. Mỗi `sessionId` (GUID) gắn với **một** instance `SAPConnector` đã `OpenAndConnect` trên máy A.

---

## 2. Điều kiện trước khi dùng

| Yêu cầu | Ghi chú |
|--------|---------|
| Windows, .NET Framework 4.8 | Theo project client. |
| SAP GUI for Windows + **Scripting bật** | Trong SAP: tùy chọn cho phép scripting; user cần quyền đăng nhập hệ thống đích. |
| Build **x86** khi tích hợp SAP GUI 32-bit | Đồng bộ với hướng dẫn trong `RMIV.DLL.SAP/README.md`. |
| Chạy **`RMIV.WF.CLIENT`** | Đây là host HTTP (xem `Main.cs`, `HttpAutomationApiHost`). |

---

## 3. Bật máy chủ HTTP từ giao diện

Ứng dụng **`RMIV.WF.CLIENT`** cung cấp form có:

- **API key**: tối thiểu **10 ký tự** (validation khi Start).
- **Port**: số nguyên **lớn hơn 8001** và **nhỏ hơn 16000** (validation khi Start).
- **Delay (ms)**: số nguyên **≥ 0** — sau mỗi response JSON, server **chờ thêm delay** đó trước khi trả về (`CommandDelayMs`); dùng để giảm tải khi SAP còn đang refresh.
- **Start / Stop**: mở/đóng `HttpListener` trên **`http://+:<port>/`** (nghe **mọi interface** của máy).

Khi Stop hoặc đóng form, server gọi **`DisconnectAllSessions`** — mọi phiên SAP HTTP sẽ bị ngắt.

---

## 4. File cấu hình `server-config.txt`

Cùng thư mục với executable (thư mục chạy app), file **`server-config.txt`** được tạo/ghi khi khởi động hoặc sau khi Start thành công:

```text
apiKey=<chuỗi>
ipAddress=<IP hiển thị/ghi nhận>
port=<8080,...>
commandDelayMs=< ví dụ 500 >
```

- **`apiKey`**: được load lên ô API key khi mở app (lần đầu có thể tự sinh GUID dạng `N`).
- **`ipAddress`**: chủ yếu để hiển thị; IP LAN thực tế được cập nhật theo adapter (logic trong `Main.cs` — có ưu tiên dải `172.*`).
- Mỗi lần **Start** thành công, cấu hình hiện tại được ghi lại.

---

## 5. Quyền Windows (HTTP.sys) — làm **một lần** nếu lỗi khi Start

Listener dùng prefix **`http://+:<port>/`**. Nếu Windows báo thiếu quyền (thường **mã lỗi 5**), cần gán URL ACL cho **user** đang chạy app (**không** nhất thiết phải chạy WinForms luôn bằng Administrator sau khi đã gán).

Mở **PowerShell hoặc CMD Run as Administrator** (thay `PORT` và `DOMAIN\Username` đúng máy của bạn — app có thể hiện sẵn lệnh `netsh`):

```text
netsh http add urlacl url=http://+:PORT/ user="DOMAIN\UserName"
```

Sau đó **Start** lại server trong app.

---

## 6. Tường lửa và mạng LAN

- Máy gọi API cần **đường đi tới** IP/hostname của máy chạy `RMIV.WF.CLIENT`: **TCP port** đã chọn (ví dụ 8080).
- Trên máy chủ có thể cần luật **Windows Defender Firewall**: cho phép **inbound** TCP tới port đó **chỉ** khi tin cậy mạng nội bộ.
- App log có thể gợi ý URL dạng `http://<hostname>:<port>/` và `http://<LAN_IP>:<port>/`.

---

## 7. Bảo mật và header `api-key`

| Route | Header `api-key` |
|-------|------------------|
| `GET` / `POST` **`/sap-auto/function/list`** | **Không bắt buộc** — endpoint được xử lý công khai trong code (`HttpAutomationApiHost`). Vẫn nên chỉ expose mạng tin cậy. |
| Mọi route **`/sap-auto/*`** còn lại | **Bắt buộc**; giá trị phải **khớp** API key trong ô cấu hình của WinForms (**so khớp chuỗi chính xác** — `Ordinal`). |

Gửi:

```http
api-key: <giá tri giống trên ô API key của app đang chạy>
```

Nếu thiếu hoặc sai: response **400** với JSON `ApiResponse` (`Success: false`, `Message` giải thích).

---

## 8. Endpoint SAP Automation

Base URL ví dụ: `http://192.168.1.50:8080`

| Endpoint | Method | Body JSON | Header `api-key` |
|----------|--------|-----------|------------------|
| `/sap-auto/function/list` | GET hoặc POST | không cần | không bắt buộc |
| `/sap-auto/open-and-connect` | **POST** | **bắt buộc** | bắt buộc |
| `/sap-auto/command` | **POST** | **bắt buộc** | bắt buộc |
| `/sap-auto/disconnect` | **POST** | **bắt buộc** | bắt buộc |

Các route POST trên chỉ nhận **`POST`** kèm **JSON body có nội dung** (`Content-Type: application/json` khuyến nghị). Query string **không** được dùng để thay cho body cho các POST này (parser chỉ merge body cho nhánh SAP POST).

Route không khớp: **404**.

---

## 9. Chuẩn response

Mọi trả về được serialize dạng:

```json
{
  "Success": true,
  "Message": "OK",
  "Result": null
}
```

- **`Result`**: kiểu tùy lệnh (chuỗi, số, object, mảng, …).
- **`GetOptions`** (qua `/sap-auto/command`): kết quả dictionary được **chuẩn hoá** thành mảng `{ "key": "...", "text": "..." }`.
- **`Success: false`**: đọc `Message` để biết lỗi validation / SAP / reflection.

---

## 10. Trường JSON dùng chung (`AutoApiRequest`)

Tên khóa **không phân biệt hoa thường** cho nhiều field (implementation chuẩn hoá `paramObject`, v.v.).

| Trường | Ý nghĩa |
|--------|---------|
| `sessionId` | **GUID chuẩn** (string): bắt buộc với **`open-and-connect`**, **`command`**, **`disconnect`**. |
| `function` | Tên method trên **`ISapConnector`** (reflection), ví dụ `ExecuteTCode`, `SetText`, `SetFocus`. |
| `param` | Một tham số `string` (single). |
| `params` | Mảng string theo **thứ tự** tham số của overload. |
| `paramObject` | Object key/value: map **tên tham số VB** → giá trị string (converter parse int/bool/GUID/enum). |
| `server`, `client`, `username`, `password`, `language` | Dùng cho **`open-and-connect`** (xem §11). |
| `multiLogonAction` | Tùy chọn, chỉ **`open-and-connect`**: cách xử lý popup **đăng nhập trùng** (multi-logon). Xem §11. |
| `idleTimeoutMinutes` | Tùy chọn: số nguyên **dương**. Nếu có: sau khoảng thời gian không có request tới session, server **tự disconnect** phiên SAP đó (`CleanupIdleSessions` mỗi phút). Không gửi field này → không có auto-idle disconnect theo timer. |

**Lưu ý:**

- **`open-and-connect` qua HTTP** truyền hành vi multi-logon qua **`multiLogonAction`** (mặc định **`opt2`** = tiếp tục, giữ session khác). Gọi trực tiếp DLL `OpenAndConnect` không tham số thì mặc định VB là **OPT1** — khác HTTP nếu không gửi field.
- **Giới hạn phiên SAP**: `HttpAutomationApiHost.MaxSapSessions` mặc định **`5`** — có thể tăng bằng code nếu cần.
- **`language`** khi không gửi được coi **`EN`** trong kết nối HTTP API (mapping `SapConnectionSettings`).

---

## 11. `/sap-auto/open-and-connect`

**Mục đích:** khởi chạy/đảm bảo SAP Logon, mở connection theo **`server`** (tên trong SAP Logon), đăng nhập, gắn instance với **`sessionId`**.

**Body JSON tối thiểu:**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "server": "SAP_PROD",
  "client": "800",
  "username": "USER01",
  "password": "your-password",
  "language": "EN"
}
```

**Tùy chọn:**

| Field | Giá trị | Popup SAP (thứ tự trên màn hình) |
|-------|---------|-----------------------------------|
| *(bỏ trống)* | — | **OPT2** — tiếp tục đăng nhập, **không** kết thúc session khác |
| `multiLogonAction` | `opt1` hoặc `1` | **OPT1** — tiếp tục và **kết thúc** session khác |
| `multiLogonAction` | `opt2` hoặc `2` | **OPT2** (giống mặc định) |
| `multiLogonAction` | `opt3` hoặc `3` | **OPT3** — hủy / terminate logon tại đây |

Tên enum VB tương ứng: `ContinueEndOtherLogins`, `ContinueKeepOtherLogins`, `CancelCloseThisSession`. Giá trị không hợp lệ → HTTP **200** với `"Success": false` và message `multiLogonAction must be opt1, opt2, opt3...`.

- `"idleTimeoutMinutes": 30`
- `"multiLogonAction": "opt1"` — khi cần ưu tiên máy này và đóng session SAP đang mở ở nơi khác

**Ví dụ body dùng OPT1:**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "server": "SAP_PROD",
  "client": "800",
  "username": "USER01",
  "password": "your-password",
  "language": "EN",
  "multiLogonAction": "opt1"
}
```

**Ví dụ PowerShell:**

```powershell
$body = @{
  sessionId = [guid]::NewGuid().ToString()
  server    = "SAP_PROD"
  client    = "800"
  username  = "USER01"
  password  = "secret"
  language  = "EN"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://127.0.0.1:8080/sap-auto/open-and-connect" `
  -Method Post -Body $body -ContentType "application/json; charset=utf-8" `
  -Headers @{ "api-key" = "your-api-key-at-least-10-chars" }
```

Nếu `sessionId` đã tồn tại, **cùng** `server`/`client`/`username`/`password`/`language` và SAP còn sống (`IsSessionAlive`): trả **200** ngay, `message`: `"Already connected"` — **không** đóng/mở lại (tránh vòng lặp khi client gửi lại cùng lệnh). Chỉ khi phiên chết hoặc đổi thông tin đăng nhập: server ngắt phiên cũ rồi `OpenAndConnect` lại (`"Connected"` / `"Connected (replaced existing session)"`). Các request trùng `sessionId` được **xếp hàng** (không chạy song song).

---

## 12. `/sap-auto/command`

**Mục đích:** gọi bất kỳ method public trên **`ISapConnector`** nếu reflection tìm được overload khớp tham số.

**Body bắt buộc:** `sessionId`, `function`.

**Truyền tham số** (một trong các cách):

1. **`params`**: mảng theo thứ tự.
2. **`param`**: một string (một tham số).
3. **`paramObject`**: object theo tên parameter (tốt cho nhiều tham số hoặc `SetTexts` với dictionary).

**Ví dụ — chạy transaction:**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "ExecuteTCode",
  "params": ["MM60"]
}
```

**Ví dụ — điền ô:**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "SetText",
  "paramObject": {
    "id": "wnd[0]/usr/ctxtMATNR-LOW",
    "value": "10000001"
  }
}
```

**Ví dụ — focus + caret** (xem `RMIV.DLL.SAP/README.md` mục §2a):

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "SetCaretPosition",
  "paramObject": {
    "id": "wnd[0]/usr/ctxtMATNR-LOW",
    "position": "0"
  }
}
```

**`SetTexts`:** gửi một object map `id` → text qua `paramObject` (hoặc cấu trúc mà parser map sang `Dictionary<string,string>` — xem `SapMethodReflection`).

---

## 13. `/sap-auto/disconnect`

**Body:**

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44"
}
```

Xóa session khỏi dictionary và ngắt SAP connector tương ứng.

---

## 14. `/sap-auto/function/list`

**Mục đích:** liệt kê mọi lệnh có thể gọi qua reflection + metadata overload/parameter (phục vụ Postman/script tự sinh client).

**Mở trong trình duyệt (JSON):** [http://127.0.0.1:8080/sap-auto/function/list](http://127.0.0.1:8080/sap-auto/function/list) — đổi host/port nếu cần; response nằm trong `Result.Commands` (cấu trúc xem phản hồi thực tế).

Không yêu cầu **`sessionId`**. **`api-key` không bắt buộc** (như §7).

Ví dụ:

```powershell
Invoke-RestMethod -Uri "http://127.0.0.1:8080/sap-auto/function/list" -Method Get
```

Hai command quản trị **`open-and-connect`** và **`disconnect`** xuất hiện trong `Commands` kèm `HttpRoute`; các method reflection có `HttpRoute: null`.

Response thực tế là nguồn động — để bảng tham số đọc offline, xem **§18** (đồng bộ với `ISapConnector` trong `RMIV.DLL.SAP`).

---

## 15. Luồng làm việc gợi ý cho tích hợp

1. **`GET`** `/sap-auto/function/list` (hoặc bỏ qua nếu đã biết danh sách).
2. **Sinh **`sessionId`** mới (`Guid.NewGuid()`).
3. **`POST`** `/sap-auto/open-and-connect` với thông tin hệ thống + user/pass.
4. Lặp **`POST`** `/sap-auto/command`: `ExecuteTCode`, `WaitForSap` (reflection), `SetText`, `Click`, đọc `GetStatusText`, v.v.
5. **`POST`** `/sap-auto/disconnect` khi xong (hoặc để **`idleTimeoutMinutes`** quét nếu quên disconnect).

Luôn xử lý **`Success`** và **`Message`**; với SAP, nên chờ và kiểm tra status bar trong script phía caller khi business yêu cầu.

---

## 16. Mã HTTP thường gặp

| Mã | Ý nghĩa tóm tắt |
|----|----------------|
| **200** | Server xử lý xong; kiểm tra `Success` trong JSON. |
| **400** | Thiếu/sai api-key (route bắt buộc), thiếu `sessionId` / không phải GUID, sai POST body, overload không khớp, v.v. |
| **404** | Path không hợp lệ (so với các route được liệt kê trong §8). |
| **500** | Lỗi runtime (SAP, reflection, exception nội bộ). |

---

## 17. Mở rộng (“tạo API” kiểu lập trình)

Nếu ý của bạn là **thêm hành động mới** chứ không chỉ HTTP:

1. Thêm hoặc sửa trên **`ISapConnector`** / **`SAPConnector`** trong **`RMIV.DLL.SAP`**.
2. Build lại **`RMIV.DLL.SAP`** và **`RMIV.WF.CLIENT`** — reflection lấy method từ `ISapConnector` + interface kế thừa (`SapMethodReflection.GetAllSapConnectorMethods`).
3. Gọi tên method mới qua **`POST /sap-auto/command`** với `function` và tham số đúng chữ ký.

File nguồn tham chiếu HTTP:

- `RMIV.WF.CLIENT/HttpAutomation/HttpAutomationApiHost.cs`
- `RMIV.WF.CLIENT/HttpAutomation/SapMethodReflection.cs`
- `RMIV.WF.CLIENT/HttpAutomation/AutoApiRequestParser.cs`
- `RMIV.WF.CLIENT/Main.cs`

---

## 18. Phụ lục: danh sách command và biến (tham số)

Nguồn: interface **`ISapConnector`** (`RMIV.DLL.SAP/SAP/Abstractions/ISapConnector.vb`) + hai lệnh HTTP **`open-and-connect`** / **`disconnect`**. Gọi qua **`POST /sap-auto/command`** với **`function`** = tên Command (reflection), trừ route riêng (§18.1). Trong §18.4, cột **Required** / **Optional** ghi **`tên` · kiểu .NET/VB** (String, Int32, Boolean, …); cột cuối thêm kiểu **trả về** (sub / function) khi có.

### 18.1. Command dùng route riêng (không qua `function` trong `/sap-auto/command`)

| Command | Route | **Required** (body JSON: tên · kiểu) | **Optional** (tên · kiểu) | Mô tả |
|---------|--------|----------------------------------------|---------------------------|--------|
| **open-and-connect** | `POST /sap-auto/open-and-connect` | `sessionId` · **String** (định dạng GUID); `server` · **String**; `client` · **String**; `username` · **String**; `password` · **String** | `language` · **String** (mặc định `EN`); `multiLogonAction` · **String** (`opt1`/`1`, `opt2`/`2`, `opt3`/`3` — mặc định **`opt2`**); `idleTimeoutMinutes` · **Int32** (phải **> 0** nếu gửi) | Mở/kết nối SAP Logon, đăng nhập, gán connector với `sessionId`. Popup multi-logon theo `multiLogonAction` (§11). Header **`api-key`** bắt buộc. |
| **disconnect** | `POST /sap-auto/disconnect` | `sessionId` · **String** (GUID) | — | Ngắt phiên SAP và xóa khỏi máy chủ. Header **`api-key`** bắt buộc. |

### 18.2. Quy tắc truyền tham số cho `/sap-auto/command`

| Cách | Mô tả |
|------|--------|
| **`paramObject`** | Object `key` = **tên tham số VB** (bảng dưới), `value` = chuỗi; server parse `Int32`, `Boolean`, `Double`, `Guid`, enum. **Khuyến nghị** cho nhiều tham số. |
| **`params`** | Mảng chuỗi theo **đúng thứ tự** tham số của overload (xem `/sap-auto/function/list`). |
| **`param`** | Một chuỗi — chỉ khi overload có **một** tham số bắt buộc. |

**`SetTexts`:** một tham số kiểu `Dictionary<string,string>` — gửi **`paramObject`** là map **id control → text** (toàn bộ body map được coi là `items` khi overload khớp); xem `SapMethodReflection.TryInvokeByNamedParams`.

### 18.3. Hạn chế quan trọng (HTTP + reflection)

1. **Trùng chữ ký giữa `ISapGrid` và `ISapTableControl`:** `GetRowCount(String)` và `ScrollToRow(String, Int32)` trùng hệ thống kiểu. Code reflection **gom theo chữ ký** và chỉ giữ **một** `MethodInfo` — lệnh HTTP có thể chỉ ánh xạ tới **một** triển khai (thực tế thường là **grid**). Với **TableControl**, cần dùng các API khác biệt rõ: `GetCellValue` bản **3 tham số cuối là `Int32` (cột số)**, `GetTableRows`, v.v.
2. **Delegate / generic:** `WaitUntil(Func<...>)`, `GetGridAllPages` (callback), `GetGridWhere` (predicate/transform), overload `GetGridAs` có `Func`/`Action`, `FindAs(Of T)` — **không thể** truyền từ JSON; gọi qua HTTP sẽ không khớp overload hoặc lỗi runtime. Dùng các hàm thay thế (`WaitForElement`, `GetAllRows`, …) hoặc gọi từ VB.NET.
3. **`SelectRows(gridId, rows)`** với `IEnumerable(Of Integer)` — **không** có định dạng chuẩn từ mảng string đơn giản; thực tế HTTP **khó/không** dùng được trừ khi mở rộng parser.
4. **Kết quả COM** (ví dụ `GetSession` → `GuiSession`): serialize JSON có thể **lỗi hoặc vô nghĩa**; ưu tiên dùng API trả về chuỗi/số/cấu trúc đơn giản.

### 18.4. Bảng command theo nhóm (tên `function` + tham số)

**Quy ước cột:**

| Thuật ngữ | Ý nghĩa |
|-----------|--------|
| **Required** | Liệt kê **`tên` · Kiểu** phải truyền qua `paramObject` / `params` / `param` đúng tên; giá trị JSON thường là chuỗi rồi parse sang kiểu. |
| **Optional** | **`tên` · Kiểu** có thể bỏ qua; mặc định ghi trong ô (VB). |

**Điều kiện chung — mọi lệnh `POST /sap-auto/command` đều phải có trong JSON body:**

| Field | Required | Kiểu (.NET / JSON) |
|-------|----------|-------------------|
| **`sessionId`** | Có | **String** (định dạng GUID) — trong JSON là chuỗi. |
| **`function`** | Có | **String** — tên lệnh reflection (vd. `SetText`). |

HTTP header **`api-key`**: **String** (§7).

Các bảng nhóm §18.4 chỉ là tham số của **method** (không lặp `sessionId`/`function`). **Kiểu ghi trong cột là .NET/VB**; trên HTTP vẫn thường gửi **chuỗi** trong JSON, server parse (**`SapMethodReflection.ConvertStringArg`**: `Int32`, `Boolean`, `Double`, `Guid`, enum, …).

#### Kết nối phiên (`ISapConnection`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `Connect` | — | — | Gắn phiên SAP nếu session hiện tại không còn sống. Trả **void**. |
| `Login` | `client` · String; `username` · String; `password` · String | `language` · String (mặc định `EN`) | Điền form login; multi-logon **ContinueEndOtherLogins**. Trả **void**. |
| `Logout` | — | — | Gọi `Disconnect`. **void**. |
| `GetSession` | — | — | **GuiSession** (COM) — serialize JSON vấn đề — §18.3. |
| `IsSessionAlive` | — | — | Trả **Boolean**. |
| `Reconnect` | — | — | `AttachSession` mặc định nếu cần. **void**. |

#### Element (`ISapElement`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `Find` | `id` · String | — | SAP path; không thấy → exception. Trả **GuiComponent**. |
| `TryFind` | `id` · String | — | Trả **GuiComponent** hoặc không serialize được như COM. |
| `Exists` | `id` · String | — | Trả **Boolean**. |
| `FindAs` | `id` · String | — | Generic **`T`** — HTTP không ổn định (§18.3). |
| `FindIds` | `idPattern` · String | — | Pattern path (hỗ trợ `...`), vd. `wnd[0]/usr/.../cmbEKKO_CI-POADDR`. Trả **List(String)** các id relative bắt đầu bằng `wnd[` (walk cây COM, không `FindById` đơn). |

#### Nhập liệu (`ISapInput`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `SetText` | `id` · String; `value` · String | — | Gán Text. **void**. |
| `SetTexts` | `items` · **Dictionary**(String,String) — trong JSON là object keys/values (`paramObject`) | — | Gán nhiều ô. **void**. |
| `GetText` | `id` · String | — | Trả **String**. |
| `Clear` | `id` · String | — | **void**. |
| `SetTextAndEnter` | `id` · String; `value` · String | — | **void**. |
| `SetFocus` | `id` · String | — | **void**. |
| `GetCaretPosition` | `id` · String | — | Trả **Int32**. |
| `SetCaretPosition` | `id` · String; `position` · **Int32** | — | **void**. |

#### Hành động (`ISapAction`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `Click` | `id` · String | — | **void**. |
| `DoubleClick` | `id` · String | — | **void**. Double-click element theo `id` (COM `DoubleClick`). |
| `SendEnter` | — | — | **void**. |
| `SendVKey` | `vKey` · **Int32** | — | Mã SAP virtual key. **void**. |
| `PressToolbarButton` | `toolbarId` · String; `buttonIndex` · **Int32** | — | **void**. Nút trên `tbar` theo chỉ số (`toolbarId/btn[index]`). |
| `PressShellButton` | `shellId` · String; `buttonId` · String | — | **void**. Nút trên **GuiShell** — tương đương recorder `pressButton "COPY"`. Thử COM `PressButton` rồi `PressToolbarButton`. |
| `ClickByTooltip` | `tooltip` · String | — | **void**. |
| `ScrollPage` | `containerId` · String | `position` · **Int32** (mặc định **-1**) | Recorder: `findById("wnd[0]/usr").verticalScrollbar.position = …`. `position` ≥ 0 = đặt tuyệt đối; &lt; 0 = +`PageSize` (hoặc +1). Trả **`SapScrollPageResult`**: `Position`, `Maximum`, `Minimum`, `PageSize`, `CanContinue` (còn kéo xuống được), `Moved`. |
| `ResetScroll` | `containerId` · String | — | Đặt `verticalScrollbar.position = 0` (về đầu). Trả **`SapScrollPageResult`** như `ScrollPage`. |

**Ví dụ `PressShellButton`** (recorder: `shell[0].pressButton "COPY"`):

```json
POST /sap-auto/command
{
  "sessionId": "00000000-0000-0000-0000-000000000001",
  "function": "PressShellButton",
  "paramObject": {
    "shellId": "wnd[0]/shellcont/shell/shellcont[1]/shell[0]",
    "buttonId": "COPY"
  }
}
```

`PressGridToolbarButton` vẫn dùng được trên cùng shell/grid; nội bộ gọi `PressShellButton`.

#### Checkbox / Radio (`ISapCheckbox`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `SetCheckbox` | `id` · String; `value` · **Boolean** | — | **void**. |
| `GetCheckbox` | `id` · String | — | Trả **Boolean**. |
| `SelectRadio` | `id` · String | — | **void**. |

#### Combo box (`ISapComboBox`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `SelectByKey` | `id` · String; `key` · String | — | **void**. |
| `SelectByText` | `id` · String; `text` · String | — | **void**. |
| `GetSelectedKey` | `id` · String | — | **String**. |
| `GetSelectedText` | `id` · String | — | **String**. |
| `GetOptions` | `id` · String | — | **Dictionary**(String,String) — JSON được chuẩn hoá thành `{ key, text }[]`. |

#### Điều hướng (`ISapNavigation`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `ExecuteTCode` | `tcode` · String | — | **void**. |
| `SelectTab` | `tabStripId` · String; `tabId` · String | — | **void**. `tabStripId` có thể `""` khi `tabId` là path đầy đủ. Gọi COM `Select` (recorder `.select` trên `tabp...`) — **không** dùng `Click`. |

**Ví dụ** (recorder: `tabpTABHDT11.select`):

```json
POST /sap-auto/command
{
  "sessionId": "...",
  "function": "SelectTab",
  "paramObject": {
    "tabStripId": "",
    "tabId": "wnd[0]/usr/subSUB0:SAPLMEGUI:0020/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT11"
  }
}
```

Hoặc tách strip + tab: `tabStripId` = `.../tabsHEADER_DETAIL`, `tabId` = `tabpTABHDT11`.
| `ResetToMainMenu` | — | — | **void**. |
| `GoBack` | — | — | **void**. |
| `OpenNewSession` | — | — | **void**. |

#### Lưới ALV — `ISapGrid`

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `GetCellValue` | `gridId` · String; `row` · **Int32**; `columnName` · String | — | Trả **String**. Khác Table: `col` là **Int32**. |
| `SetCellValue` | `gridId` · String; `row` · **Int32**; `columnName` · String; `value` · String | — | **void**. Tự cuộn hàng vào viewport rồi ghi ô. |
| `GetRowCount` | `gridId` · String | — | Trả **Int32**. ⚠️ Trùng chữ ký Table — §18.3. |
| `GetColumnNames` | `gridId` · String | — | **List**(String) — tên kỹ thuật cột (`POSNR`, `S0001`, …). |
| `GetColumnHeaders` | `gridId` · String | — | **List**(`SapGridColumnHeader`: `Name`, `Title`) — `Title` là header text trên UI (`Item`, `E85`, …). |
| `GetAllRows` | `gridId` · String | — | **List** phần tử **Dictionary**(String,String) — key = tên kỹ thuật. |
| `GetAllRowsWithHeaders` | `gridId` · String | — | **`SapGridRowsWithHeaders`**: `Headers` (Name+Title theo thứ tự cột) + `Rows` (giống `GetAllRows`). |
| `SelectRow` | `gridId` · String; `row` · **Int32** | — | **void**. |
| `SelectRows` | `gridId` · String; `rows` · **IEnumerable**(Int32) | — | HTTP khó truyền — §18.3. **void**. |
| `ClickCurrentCell` | `gridId` · String; `row` · **Int32**; `columnName` · String | — | **void**. |
| `DoubleClickRow` | `gridId` · String; `row` · **Int32**; `columnName` · String | — | **void**. |
| `ScrollToRow` | `gridId` · String; `row` · **Int32** | — | **void**. ⚠️ Trùng Table — §18.3. |
| `PressGridToolbarButton` | `gridId` · String; `buttonId` · String | — | **void**. Alias của `PressShellButton` trên shell/grid ALV. |
| `GetGridAsDataTable` | `gridId` · String | — | **DataTable** (serialize tùy host). |

**Thêm:**

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `GetGridPage` | `gridId` · String; `pageIndex` · **Int32** | `pageSize` · **Int32** (mặc định **100**) | **List** phần tử **Dictionary**(String,String). |

**Không gọi HTTP được (delegate / generic):** `GetGridAs`, `GetGridAllPages`, `GetGridWhere`. Chi tiết: `/sap-auto/function/list`.

#### Cây điều hướng — `ISapTree` (GuiTree / shell tree)

Dùng cho control kiểu **GuiTree** (`.../shell` trong recorder). Có **hai kiểu** chọn node:

| Recorder | API | Khi nào |
|----------|-----|---------|
| `selectedNode = "F01"` | **`SelectTreeNode`** | Cây hierarchy (text types, variant tree, …) |
| `selectItem " 2", "&Hierarchy"` | **`SelectTreeItem`** | Column tree — cần thêm `columnName` |

**`Click(id)` không thay thế được** cho cả hai kiểu trên.

**`nodeKey` và khoảng trắng:** với `SelectTreeItem`, API **tự pad** khi `nodeKey` chỉ gồm chữ số (`"2"` → `"          2"`). Key dạng `"F01"` / mã hierarchy — copy nguyên từ recorder.

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `SelectTreeNode` | `treeId` · String; `nodeKey` · String | — | **void**. Gán COM `SelectedNode` (recorder `selectedNode = "F01"`). |
| `GetTreeSelectedNode` | `treeId` · String | — | **String**. Đọc `SelectedNode` hiện tại. |
| `SelectTreeItem` | `treeId` · String; `nodeKey` · String; `columnName` · String | — | **void**. Gọi COM `SelectItem`. `nodeKey` số được chuẩn hoá pad 11 ký tự. |
| `EnsureTreeItemVisible` | `treeId` · String; `nodeKey` · String; `columnName` · String | — | **void**. Gọi COM `EnsureVisibleHorizontalItem`. |
| `DoubleClickTreeItem` | `treeId` · String; `nodeKey` · String; `columnName` · String | — | **void**. Gọi COM `DoubleClickItem`. |
| `GetTreeItemText` | `treeId` · String; `nodeKey` · String; `columnName` · String | — | **String**. Gọi COM `GetItemText` nếu control hỗ trợ. |

**Ví dụ `SelectTreeNode`** (recorder: `selectedNode = "F01"`):

```json
POST /sap-auto/command
{
  "sessionId": "00000000-0000-0000-0000-000000000001",
  "function": "SelectTreeNode",
  "paramObject": {
    "treeId": "wnd[0]/usr/subSUB0:SAPLMEGUI:0010/subSUB1:SAPLMEVIEWS:1100/subSUB2:SAPLMEVIEWS:1200/subSUB1:SAPLMEGUI:1102/tabsHEADER_DETAIL/tabpTABHDT3/ssubTABSTRIPCONTROL2SUB:SAPLMEGUI:1230/subTEXTS:SAPLMMTE:0100/cntlTEXT_TYPES_0100/shell",
    "nodeKey": "F01"
  }
}
```

**Ví dụ `SelectTreeItem`** (column tree):

```json
POST /sap-auto/command
{
  "sessionId": "00000000-0000-0000-0000-000000000001",
  "function": "SelectTreeItem",
  "paramObject": {
    "treeId": "wnd[0]/shellcont/shell/shellcont[1]/shell[1]",
    "nodeKey": "2",
    "columnName": "&Hierarchy"
  }
}
```

Thường gọi `EnsureTreeItemVisible` trước `SelectTreeItem` nếu node nằm ngoài vùng nhìn thấy.

#### Bảng điều khiển (`ISapTableControl`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `GetCellValue` | `tableId` · String; `row` · **Int32**; `col` · **Int32** | — | Trả **String** (cột bằng chỉ số). |
| `SetCellValue` | `tableId` · String; `row` · **Int32**; `col` · **Int32**; `value` · String | — | **void**. `value` có thể `""` (xóa ô). HTTP cũng nhận alias từ node Grid: `gridId`→`tableId`, `columnName` số →`col`. ME21N item table là **`tbl…` (GuiTableControl)**, không phải grid `shell`. Path cha (`subSUB…:SAPLMEGUI:00xx`) hay đổi — nên dùng `wnd[0]/usr/.../tblSAPLMEGUITC_1211` hoặc path dump đầy đủ (Find tự fallback theo tên `tbl…`). |
| `GetRowCount` | `tableId` · String | — | **Int32**. ⚠️ Trùng grid — §18.3. |
| `ScrollToRow` | `tableId` · String; `row` · **Int32** | — | **void**. ⚠️ Trùng grid — §18.3. |
| `GetTableRows` | `tableId` · String | — | **List** phần tử **Dictionary**(String,String). |

#### Multiple Selection — popup SAPLALDB (`ISapMultipleSelection`)

Dùng cho dialog **Multiple Selection** (recorder: bấm `btn%_..._%_VALU_PUSH`, nhập nhiều giá trị vào bảng `tblSAPLALDBSINGLE/ctxtRSCSEL-SLOW_I[row,col]`, cuộn `verticalScrollbar`, xác nhận `tbar[0]/btn[0]` + `btn[8]`).

**Khác `SetCellValue` / `SetText` từng ô:** hàm này nhận **một chuỗi danh sách**, tự đặt từng giá trị vào ô theo quy tắc **`scrollPosition + col = index`** (index 0-based), cuộn bảng cha khi cần, gửi **Enter** trên `wnd[n]` khi chuyển sang vùng cuộn mới, rồi bấm các nút xác nhận trên toolbar.

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `FillMultipleSelectionValues` | `cellIdBase` · String; `items` · String | `dataRow` · **Int32** (mặc định **1**); `openButtonId` · String; `windowIndex` · **Int32** (mặc định **1**); `sendEnterOnScroll` · **Boolean** (mặc định **true**); `confirmButtonIndices` · String (mặc định **`0,8`**) | **void**. |

**`cellIdBase`:** path tới ô nhập (không kèm `[row,col]`), ví dụ `wnd[1]/usr/.../tblSAPLALDBSINGLE/ctxtRSCSEL-SLOW_I`.

**`items`:** các giá trị cách nhau bởi dấu **phẩy** hoặc **chấm phẩy** (cũng chấp nhận xuống dòng / tab).

**`openButtonId`:** nếu gửi, bấm nút này trước (mở popup), chờ `wnd[windowIndex]` xuất hiện, rồi mới điền.

**`confirmButtonIndices`:** danh sách chỉ số nút trên `wnd[n]/tbar[0]` (cách nhau bởi `,` hoặc `;`). Chuỗi rỗng = không bấm xác nhận.

**Ví dụ — popup đã mở sẵn:**

```json
POST /sap-auto/command
{
  "sessionId": "00000000-0000-0000-0000-000000000001",
  "function": "FillMultipleSelectionValues",
  "paramObject": {
    "cellIdBase": "wnd[1]/usr/tabsTAB_STRIP/tabpSIVA/ssubSCREEN_HEADER:SAPLALDB:3010/tblSAPLALDBSINGLE/ctxtRSCSEL-SLOW_I",
    "items": "1,2,3,4,5,6,7,8,9,10,11,12,13",
    "dataRow": 1,
    "windowIndex": 1
  }
}
```

**Ví dụ — tự mở popup rồi điền + xác nhận** (recorder đầy đủ):

```json
POST /sap-auto/command
{
  "sessionId": "00000000-0000-0000-0000-000000000001",
  "function": "FillMultipleSelectionValues",
  "paramObject": {
    "openButtonId": "wnd[0]/usr/btn%_BA_MATNR_%_APP_%-VALU_PUSH",
    "cellIdBase": "wnd[1]/usr/tabsTAB_STRIP/tabpSIVA/ssubSCREEN_HEADER:SAPLALDB:3010/tblSAPLALDBSINGLE/ctxtRSCSEL-SLOW_I",
    "items": "1;2;3;4;5;6;7;8;9;10;11;12;13",
    "confirmButtonIndices": "0,8"
  }
}
```

#### Chờ / đồng bộ (`ISapWait`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `WaitForElement` | `id` · String | `timeoutSeconds` · **Int32** (mặc định **10**) | **void**. |
| `WaitUntilGone` | `id` · String | `timeoutSeconds` · **Int32** (mặc định **10**) | **void**. |
| `WaitUntil` | — | — | Tham số kiểu **Func**(Boolean) — **không HTTP**. |
| `WaitForSap` | — | `timeoutSeconds` · **Int32** (mặc định **30**) | **void**. |
| `Sleep` | `milliseconds` · **Int32** | — | **void**. |

#### Popup (`ISapPopup`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `IsPopupOpen` | — | — | **Boolean**. |
| `GetPopupTitle` | — | — | **String**. |
| `GetPopupMessage` | — | — | **String**. |
| `HandlePopup` | `action` · String | — | **void**. |
| `ConfirmPopup` | — | — | **void**. |
| `CancelPopup` | — | — | **void**. |
| `ContinuePopup` | — | — | **void**. |

#### Status bar (`ISapStatusBar`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `GetStatusText` | — | — | **String**. |
| `GetStatusType` | — | — | **String**. |
| `HasError` | — | — | **Boolean**. |
| `IsSuccess` | — | — | **Boolean**. |
| `ThrowIfError` | — | — | **void** (hoặc throw **Exception**). |

#### Export (`ISapExport`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `ExportGridToExcel` | `gridId` · String; `savePath` · String | — | **void**. |
| `ExportGridToText` | `gridId` · String; `savePath` · String | — | **void**. |
| `HandleSaveFileDialog` | `savePath` · String | — | **void**. |
| `SelectLocalFileExport` | `savePath` · String | `fileType` · String (mặc định `XLSX`; **chưa dùng** trong code) | **void**. |

#### Gỡ lỗi (`ISapDebug`)

| function | Required (tên · kiểu) | Optional · kiểu | Mô tả hành vi |
|----------|----------------------|-----------------|---------------|
| `CaptureScreen` | `savePath` · String | — | **void**. |
| `ContainsText` | `text` · String | — | **Boolean**. |
| `GetWindowTitle` | — | — | **String**. |
| `DumpElementTree` | — | — | **String**. Dump mọi `wnd[n]`; với grid/table **cuộn** rồi lấy hết hàng (tối đa 10000). |
| `DumpElementTreeBasic` | — | — | **String**. Dump cơ bản (kiểu đầu): chỉ `wnd[0]`, cây `Children` `Id \| Type \| Text` — **không** scroll/đọc ô grid/table. Không dùng chung code với `DumpElementTree`. |
| `DumpUserAreaTexts` | — | `userAreaId` · String (mặc định `wnd[1]/usr`) | **List**(String). Chỉ đúng cửa sổ trong `userAreaId` (không fallback `wnd[1]`→`wnd[0]`). Không có popup → mảng rỗng. Có scroll grid/table. |
| `GetCurrentTCode` | — | — | **String**. |

#### `ISapGridReader` / contract khác

- **`ISapGridReader(Of T)`** không nằm trong **`ISapConnector`** → **không** có trong `/sap-auto/function/list`.

---

### 18.5. Liệt kê tên `function` (tra cứu nhanh, gần theo Alphabet)

`CancelPopup`, `CaptureScreen`, `Clear`, `Click`, `ClickByTooltip`, `ClickCurrentCell`, `ConfirmPopup`, `Connect`, `ContainsText`, `ContinuePopup`, `DoubleClick`, `DoubleClickRow`, `DoubleClickTreeItem`, `DumpElementTree`, `DumpElementTreeBasic`, `DumpUserAreaTexts`, `EnsureTreeItemVisible`, `ExecuteTCode`, `Exists`, `ExportGridToExcel`, `ExportGridToText`, `FillMultipleSelectionValues`, `Find`, `FindAs`, `FindIds`, `GetAllRows`, `GetAllRowsWithHeaders`, `GetCaretPosition`, `GetCellValue`, `GetCheckbox`, `GetColumnHeaders`, `GetColumnNames`, `GetCurrentTCode`, `GetGridAsDataTable`, `GetGridPage`, `GetOptions`, `GetPopupMessage`, `GetPopupTitle`, `GetRowCount`, `GetSelectedKey`, `GetSelectedText`, `GetSession`, `GetStatusText`, `GetStatusType`, `GetTableRows`, `GetText`, `GetTreeItemText`, `GetTreeSelectedNode`, `GetWindowTitle`, `GoBack`, `HandlePopup`, `HandleSaveFileDialog`, `HasError`, `IsPopupOpen`, `IsSessionAlive`, `IsSuccess`, `Login`, `Logout`, `OpenNewSession`, `PressGridToolbarButton`, `PressShellButton`, `PressToolbarButton`, `Reconnect`, `ResetScroll`, `ResetToMainMenu`, `ScrollPage`, `ScrollToRow`, `SelectByKey`, `SelectByText`, `SelectLocalFileExport`, `SelectRadio`, `SelectRow`, `SelectRows`, `SelectTab`, `SelectTreeItem`, `SelectTreeNode`, `SendEnter`, `SendVKey`, `SetCaretPosition`, `SetCellValue`, `SetCheckbox`, `SetFocus`, `SetText`, `SetTexts`, `SetTextAndEnter`, `Sleep`, `ThrowIfError`, `TryFind`, `WaitForElement`, `WaitForSap`, `WaitUntil`, `WaitUntilGone`

**Không có trong `/sap-auto/command`** (route + body riêng): **`open-and-connect`**, **`disconnect`**.

---

*Tài liệu phản ánh hành vi code tại thời điểm chỉnh sửa; nếu thay đổi validation port, idle session, hay quyền public của `function/list`, cập nhật song song file này.*
