# API File-auto — xử lý file & Excel

Tài liệu tham chiếu HTTP **`/file-auto/*`** trên worker **RMIV.WF.CLIENT** (Gateway proxy). Gồm:

- **Toàn bộ hàm xử lý file / thư mục** (`FileAccessManager`)
- **Excel `.xlsx`** (`WriteExcel` / `ReadExcel`, EPPlus 4.5.3.3)

| | |
|--|--|
| **HTTP (public)** | `GET /docs/HUONG-DAN-API-FILE.md` |
| **Function list** | `GET /file-auto/function/list` |
| **Command** | `POST /file-auto/command` · `function` = tên hàm |
| **Gateway** | thường `:8081` · Worker loopback `:18080` |

---

## Mục lục

### A. Chung
1. [Luồng & xác thực](#1-luồng--xác-thực)
2. [Route](#2-route)
3. [Cách gọi command](#3-cách-gọi-command)
4. [Bảng tổng hợp hàm](#4-bảng-tổng-hợp-hàm)
5. [Kiểu Result](#5-kiểu-result)

### B. Hàm xử lý file
6. [Tồn tại / thư mục](#6-tồn-tại--thư-mục)
7. [Đọc / ghi text & bytes](#7-đọc--ghi-text--bytes)
8. [Xóa / copy / move](#8-xóa--copy--move)
9. [ListDirectory](#9-listdirectory)
10. [ExportPathForApi](#10-exportpathforapi)
11. [DownloadFromUrl](#11-downloadfromurl)
12. [TryResolvePath](#12-tryresolvepath)

### C. Excel
13. [WriteExcel — tổng quan](#13-writeexcel--tổng-quan)
14. [Tham số WriteExcel](#14-tham-số-writeexcel)
15. [operationsJson](#15-operationsjson)
16. [type = table](#16-type--table)
17. [type = cells](#17-type--cells)
18. [type = range](#18-type--range)
19. [type = style / sheetStyle](#19-type--style--sheetstyle)
20. [Object style](#20-object-style)
21. [overwrite](#21-overwrite)
22. [ReadExcel](#22-readexcel)

### D. Vận hành
23. [Response & lỗi](#23-response--lỗi)
24. [Gắn node n8n](#24-gắn-node-n8n)

---

## 1) Luồng & xác thực

```
n8n / client
  │  POST /file-auto/connect     { sessionId, rootDirectory }
  │  POST /file-auto/command     { sessionId, function, paramObject }
  │  POST /file-auto/disconnect  { sessionId }
  ▼
Gateway  ──proxy──►  Worker  ──►  FileAccessManager
```

```http
api-key: <key Gateway / server-config>
Content-Type: application/json
```

(Docs + `/file-auto/function/list` **không** bắt buộc `api-key`.)

**Quy tắc path**

- Mọi path phải nằm trong `rootDirectory` (sandbox, chặn traversal).
- Path tương đối nối với root; path tuyệt đối vẫn phải thuộc root.
- Excel: đuôi bắt buộc `.xlsx`.

---

## 2) Route

| Method | Path | Auth | Mô tả |
|--------|------|------|--------|
| `GET` | `/docs/HUONG-DAN-API-FILE.md` | Public | Tài liệu này |
| `GET`/`POST` | `/file-auto/function/list` (alias `/file-auto/list`) | Public | Liệt kê hàm runtime |
| `POST` | `/file-auto/connect` | `api-key` | Mở session |
| `POST` | `/file-auto/command` | `api-key` | Gọi hàm |
| `POST` | `/file-auto/disconnect` | `api-key` | Đóng session |
| `POST` | `/file-auto/session/check` | `api-key` | Kiểm tra session |

### Connect

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "rootDirectory": "D:\\Data\\Sandbox"
}
```

| Field | Bắt buộc | Mô tả |
|-------|----------|--------|
| `sessionId` | Có | GUID (n8n tự tạo) |
| `rootDirectory` | Có | Thư mục gốc **trên máy worker** (phải tồn tại) |
| `idleTimeoutMinutes` | Không | Số phút idle thì tự disconnect session; **không gửi** = không auto-idle |

Cùng `sessionId` không đổi được `rootDirectory` cho đến khi `disconnect`.  
`MaxFileSessions` mặc định **10**.

### Disconnect / session check

```json
{ "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44" }
```

---

## 3) Cách gọi command

```json
{
  "sessionId": "6b4c0d13-cf0d-4d30-b2fc-a1a31f252d44",
  "function": "WriteAllText",
  "paramObject": {
    "relativeOrAbsolutePath": "out\\note.txt",
    "content": "hello",
    "encoding": "utf-8",
    "createParentDirectories": "true"
  }
}
```

| Cách truyền tham số | Ghi chú |
|---------------------|---------|
| **`paramObject`** | Khuyến nghị — named, không phụ thuộc thứ tự |
| `params` | Mảng theo thứ tự overload |
| `param` | Một tham số đơn |

**Ép kiểu qua HTTP**

| Kiểu C# | Cách gửi |
|---------|----------|
| `string` | Chuỗi |
| `bool` | `true` / `"true"` |
| `int` | Số hoặc `"10"` |
| `byte[]` | **Base64** string |
| `Encoding` | Tên: `"utf-8"` (rỗng → mặc định API) |
| `TimeSpan?` | Số **giây** hoặc chuỗi parse được |
| JSON phức tạp (Excel) | **Stringify** (`dataJson`, `operationsJson`, …) |

---

## 4) Bảng tổng hợp hàm

| `function` | Nhóm | Tóm tắt |
|------------|------|---------|
| `FileExists` | Check | File có tồn tại? → `bool` |
| `DirectoryExists` | Check | Thư mục có tồn tại? → `bool` |
| `EnsureDirectory` | Thư mục | Tạo thư mục (cả cây) |
| `ListDirectory` | Thư mục | Liệt kê 1 cấp |
| `ReadAllText` | Đọc | Đọc text (UTF-8 mặc định) |
| `ReadAllBytes` | Đọc | Đọc bytes |
| `WriteAllText` | Ghi | Ghi/đè text |
| `WriteAllBytes` | Ghi | Ghi/đè bytes (Base64) |
| `AppendAllText` | Ghi | Nối text |
| `DeleteFile` | Xóa | Xóa file |
| `DeleteDirectory` | Xóa | Xóa thư mục (`recursive`) |
| `CopyFile` | Copy/Move | Copy file |
| `MoveFile` | Copy/Move | Di chuyển / đổi tên |
| `ExportPathForApi` | Export | File → Base64; thư mục → zip Base64 |
| `DownloadFromUrl` | Network | Tải HTTP(S) vào trong root |
| `TryResolvePath` | Utility | Resolve path an toàn (thường dùng nội bộ) |
| **`WriteExcel`** | Excel | Ghi `.xlsx` (table/cells/range/style) |
| **`ReadExcel`** | Excel | Đọc sheet → JSON |

> `DownloadFromUrlAsync` **không** expose qua HTTP — dùng `DownloadFromUrl`.  
> Property `RootDirectory` không gọi qua command.

---

## 5) Kiểu Result

Envelope:

```json
{
  "Success": true,
  "Message": "OK",
  "Result": { }
}
```

| Kiểu Result | Field chính |
|-------------|-------------|
| `bool` | Giá trị trực tiếp (Exists) |
| `FileAccessResponse` | `Success`, `Message` |
| `FileReadResponse` | + `Content` (string) |
| `FileBytesResponse` | + `Data` (byte[] / Base64 trong JSON) |
| `FileDownloadResponse` | + `SavedFullPath` |
| `DirectoryListResponse` | + `Files`, `Directories` (full path) |
| `PathExportForApiResponse` | + `Kind`, `EntryName`, `RelativePath`, `ContentBase64`, `ContentByteLength` |

Với thao tác file/Excel trả `FileAccessResponse`: **kiểm tra `Result.Success`**.

---

## 6) Tồn tại / thư mục

### `FileExists` / `DirectoryExists`

```json
{
  "function": "FileExists",
  "paramObject": { "relativeOrAbsolutePath": "exports\\a.xlsx" }
}
```

`Result`: `true` / `false` (path ngoài root → `false`).

### `EnsureDirectory`

```json
{
  "function": "EnsureDirectory",
  "paramObject": { "relativeOrAbsolutePath": "exports\\2026\\09" }
}
```

Tạo cả cây nếu thiếu. `Result`: `FileAccessResponse`.

---

## 7) Đọc / ghi text & bytes

### `ReadAllText`

| Param | Mặc định | Mô tả |
|-------|----------|--------|
| `relativeOrAbsolutePath` | — | Path file |
| `encoding` | UTF-8 | vd `"utf-8"`, `"utf-16"` |

```json
{
  "function": "ReadAllText",
  "paramObject": {
    "relativeOrAbsolutePath": "out\\note.txt",
    "encoding": "utf-8"
  }
}
```

`Result.Content` = nội dung text.

### `ReadAllBytes`

```json
{
  "function": "ReadAllBytes",
  "paramObject": { "relativeOrAbsolutePath": "bin\\data.bin" }
}
```

`Result.Data` = bytes (JSON thường Base64).

### `WriteAllText`

| Param | Mặc định |
|-------|----------|
| `relativeOrAbsolutePath` | — |
| `content` | — |
| `encoding` | UTF-8 |
| `createParentDirectories` | `true` |

```json
{
  "function": "WriteAllText",
  "paramObject": {
    "relativeOrAbsolutePath": "out\\note.txt",
    "content": "hello",
    "encoding": "utf-8",
    "createParentDirectories": "true"
  }
}
```

### `WriteAllBytes`

| Param | Mặc định |
|-------|----------|
| `relativeOrAbsolutePath` | — |
| `bytes` | Base64 string |
| `createParentDirectories` | `true` |

```json
{
  "function": "WriteAllBytes",
  "paramObject": {
    "relativeOrAbsolutePath": "bin\\data.bin",
    "bytes": "AQIDBA==",
    "createParentDirectories": "true"
  }
}
```

### `AppendAllText`

Giống `WriteAllText` nhưng **nối** cuối file (tạo file nếu chưa có).

```json
{
  "function": "AppendAllText",
  "paramObject": {
    "relativeOrAbsolutePath": "logs\\app.txt",
    "content": "line\n",
    "encoding": "utf-8"
  }
}
```
---

## 8) Xóa / copy / move

### `DeleteFile`

```json
{
  "function": "DeleteFile",
  "paramObject": { "relativeOrAbsolutePath": "tmp\\old.txt" }
}
```

### `DeleteDirectory`

| Param | Mô tả |
|-------|--------|
| `relativeOrAbsolutePath` | Thư mục |
| `recursive` | `true` = xóa cả cây; `false` = chỉ thư mục rỗng |

```json
{
  "function": "DeleteDirectory",
  "paramObject": {
    "relativeOrAbsolutePath": "tmp\\batch1",
    "recursive": "true"
  }
}
```

### `CopyFile`

| Param | Mặc định |
|-------|----------|
| `sourceRelativeOrAbsolute` | — |
| `destinationRelativeOrAbsolute` | — |
| `overwrite` | `false` |

Tự tạo thư mục đích. Đích đã tồn tại + `overwrite=false` → lỗi.

```json
{
  "function": "CopyFile",
  "paramObject": {
    "sourceRelativeOrAbsolute": "in\\a.txt",
    "destinationRelativeOrAbsolute": "out\\a.txt",
    "overwrite": "true"
  }
}
```

### `MoveFile`

Cùng tham số như `CopyFile`. `overwrite=false` + đích tồn tại → lỗi.

```json
{
  "function": "MoveFile",
  "paramObject": {
    "sourceRelativeOrAbsolute": "in\\a.txt",
    "destinationRelativeOrAbsolute": "out\\a.txt",
    "overwrite": "true"
  }
}
```

---

## 9) ListDirectory

| Param | Mặc định | Mô tả |
|-------|----------|--------|
| `relativeOrAbsolutePath` | — | Thư mục |
| `searchPattern` | `*` | Chỉ áp dụng cho **file** (1 cấp) |

```json
{
  "function": "ListDirectory",
  "paramObject": {
    "relativeOrAbsolutePath": "exports",
    "searchPattern": "*.xlsx"
  }
}
```

`Result.Files` / `Result.Directories`: danh sách **full path**.

---

## 10) ExportPathForApi

Đưa nội dung ra JSON để client tải về.

| Path là | `Kind` | `ContentBase64` |
|---------|--------|-----------------|
| File | `file` | Nội dung file |
| Thư mục | `directory` | Zip toàn bộ cây con trong root |

```json
{
  "function": "ExportPathForApi",
  "paramObject": {
    "relativeOrAbsolutePath": "exports\\report.xlsx"
  }
}
```

`Result`: `Kind`, `EntryName`, `RelativePath`, `ContentBase64`, `ContentByteLength`, `Success`, `Message`.

Payload lớn → Base64 ~+33%; cần đủ RAM. Serializer `MaxJsonLength = int.MaxValue`.

---

## 11) DownloadFromUrl

Tải URL **http/https** vào thư mục trong root.

| Param | Mặc định | Mô tả |
|-------|----------|--------|
| `url` | — | http/https |
| `destinationFolderRelativeOrAbsolute` | — | Thư mục đích trong root |
| `fileName` | null | Tên file; null → Content-Disposition / URL / `download` |
| `timeout` | 300 giây | Số giây hoặc chuỗi TimeSpan |
| `overwrite` | `false` | Đích tồn tại → lỗi nếu false |

```json
{
  "function": "DownloadFromUrl",
  "paramObject": {
    "url": "https://example.com/a.pdf",
    "destinationFolderRelativeOrAbsolute": "downloads",
    "fileName": "a.pdf",
    "timeout": "300",
    "overwrite": "true"
  }
}
```

`Result.SavedFullPath` = full path file đã lưu.

---

## 12) TryResolvePath

```json
{
  "function": "TryResolvePath",
  "paramObject": {
    "relativeOrAbsolutePath": "exports\\a.xlsx"
  }
}
```

Reflection có thể khó map `out` params — ưu tiên dùng các hàm ở trên. Chủ yếu cho tích hợp nội bộ.

---

## 13) WriteExcel — tổng quan

```json
{
  "function": "WriteExcel",
  "paramObject": { }
}
```

| Chế độ | Cách dùng |
|--------|-----------|
| Một operation | `type` + field tương ứng |
| Nhiều sheet / nhiều type | `operationsJson` = mảng (stringify) |

| `type` | Việc | Field chính |
|--------|------|-------------|
| `table` | Bảng header + rows | `dataJson`, `headersJson`, `startCell` |
| `cells` | Từng ô `A1`, `B1`… | `cellsJson` |
| `range` | Khối 2D | `range` + `dataJson` |
| `style` | Chỉ style | `style` + `range`/`cells` |
| `sheetStyle` | Style mặc định sheet | `style` |

Alias: `cell`→`cells`, `sheet-style`→`sheetStyle`. Engine: EPPlus 4.5.3.3 · chỉ `.xlsx`.

---

## 14) Tham số WriteExcel

| Param | Mặc định | Bắt buộc | Mô tả |
|-------|----------|----------|--------|
| `relativeOrAbsolutePath` | — | **Có** | Path `.xlsx` trong root |
| `type` | `table` | Không | Một operation |
| `operationsJson` | null | Không | Batch nhiều op |
| `sheetName` | `Sheet1` | Không | ≤ 31 ký tự |
| `startCell` | `A1` | Không | Góc table |
| `dataJson` | null | Theo type | Data table/range |
| `headersJson` | null | Không | Header tùy chỉnh |
| `cellsJson` | null | Theo type | Map ô |
| `range` | null | Theo type | `A1` / `A1:C3` |
| `style` / `styleJson` | null | Không | Style vùng |
| `headerStyle` | null | Không | Style hàng header |
| `overwrite` | `true` | Không | [§21](#21-overwrite) |
| `createParentDirectories` | `true` | Không | Tạo thư mục cha |

Trong `operationsJson`, mỗi phần tử dùng `data`/`headers`/`cells`/`style` (object) **hoặc** `*Json` (string).

---

## 15) operationsJson

Chạy tuần tự; cùng `sheetName` = cùng sheet; nhiều `sheetName` = nhiều sheet một file.

Thứ tự khuyến nghị: `sheetStyle` → ghi data (`table`/`range`/`cells`) → `style`.

### Schema operation

```ts
{
  sheetName?: string;      // alias: sheet
  type: "table" | "cells" | "range" | "style" | "sheetStyle";
  startCell?: string;
  headers?: string[] | Record<string, string>;
  data?: any[] | any[][];
  cells?: Record<string, any>;
  range?: string;          // "A1" hoặc "A1:C10" — chỉ lấy ô bắt đầu làm góc
  style?: StyleObject;
  headerStyle?: StyleObject;
}
```

### Ví dụ

```json
[
  {
    "sheetName": "DoanhSo",
    "type": "sheetStyle",
    "style": { "fontName": "Arial", "fontSize": 11 }
  },
  {
    "sheetName": "DoanhSo",
    "type": "table",
    "startCell": "A1",
    "headers": ["Mã KH", "Tên", "Doanh thu"],
    "data": [["KH001", "Nguyễn A", 1500000], ["KH002", "Trần B", 900000]],
    "style": { "border": "thin" },
    "headerStyle": {
      "bold": true,
      "fillColor": "#4472C4",
      "color": "#FFFFFF",
      "horizontalAlignment": "center"
    }
  },
  {
    "sheetName": "DoanhSo",
    "type": "cells",
    "cells": { "E1": { "value": "OK", "style": { "bold": true } } }
  },
  {
    "sheetName": "TongHop",
    "type": "range",
    "range": "A1",
    "data": [["Chỉ tiêu", "Giá trị"], ["Tổng", 2400000]]
  }
]
```

```json
{
  "function": "WriteExcel",
  "paramObject": {
    "relativeOrAbsolutePath": "exports\\tong-hop.xlsx",
    "overwrite": "true",
    "operationsJson": "<JSON.stringify(mảng)>"
  }
}
```

---

## 16) type = table

Header tại `startCell` (mặc định `A1`); data ngay hàng dưới.

### 16.1 Header tùy chỉnh + mảng dòng *(khuyến nghị)*

```json
{
  "type": "table",
  "startCell": "A1",
  "headersJson": "[\"Mã KH\",\"Tên khách hàng\",\"Doanh thu (VND)\"]",
  "dataJson": "[[\"KH001\",\"Nguyễn Văn A\",1500000],[\"KH002\",\"Trần Thị B\",900000]]"
}
```

### 16.2 Object + map field → chữ header

```json
{
  "type": "table",
  "headersJson": "{\"code\":\"Mã KH\",\"name\":\"Tên\",\"amount\":\"Doanh thu\"}",
  "dataJson": "[{\"code\":\"KH001\",\"name\":\"An\",\"amount\":100}]"
}
```

### 16.3 Không headersJson (key = header)

```json
{
  "type": "table",
  "dataJson": "[{\"Name\":\"A\",\"Amount\":100}]"
}
```

Không headers + mảng mảng: hàng đầu = header.

### Request mẫu

```json
{
  "function": "WriteExcel",
  "paramObject": {
    "relativeOrAbsolutePath": "exports\\doanh-so.xlsx",
    "type": "table",
    "sheetName": "DoanhSo",
    "startCell": "A1",
    "headersJson": "[\"Mã\",\"Tên\",\"Tiền\"]",
    "dataJson": "[[\"KH001\",\"An\",100]]",
    "overwrite": "true",
    "headerStyleJson": "{\"bold\":true,\"fillColor\":\"#4472C4\",\"color\":\"#FFFFFF\"}",
    "styleJson": "{\"border\":\"thin\"}"
  }
}
```

---

## 17) type = cells

```json
{
  "function": "WriteExcel",
  "paramObject": {
    "relativeOrAbsolutePath": "exports\\report.xlsx",
    "type": "cells",
    "cellsJson": "{\"A1\":\"Tiêu đề\",\"B1\":123,\"C1\":{\"value\":\"OK\",\"style\":{\"bold\":true}}}"
  }
}
```

File đã có → mở cập nhật (không xóa sheet khác). `style` ở operation áp mọi ô vừa ghi.

**Giá trị từng ô**

| Dạng | Ý nghĩa |
|------|---------|
| Scalar (`"text"`, `123`) | Ghi trực tiếp |
| `{ "value": ... }` | Ghi value (alias key: `v`, `text`) |
| `{ "value": ..., "style": { } }` | Ghi + style riêng ô |
---

## 18) type = range

```json
{
  "function": "WriteExcel",
  "paramObject": {
    "relativeOrAbsolutePath": "exports\\report.xlsx",
    "type": "range",
    "range": "A1",
    "dataJson": "[[\"Mã\",\"Tên\"],[\"SP01\",\"Áo\"]]",
    "styleJson": "{\"border\":\"thin\"}"
  }
}
```

`range`: `A1` hoặc `A1:C10` — chỉ lấy ô **bắt đầu**. Kích thước theo `data`.

---

## 19) type = style / sheetStyle

### `style` — tô vùng / ô (không ghi data)

```json
{
  "type": "style",
  "sheetName": "DoanhSo",
  "range": "A2:C10",
  "style": { "fillColor": "#FFF2CC", "border": "thin" }
}
```

hoặc `"cells": ["E1","E2"]`.

### `sheetStyle` — mặc định cả sheet

```json
{
  "type": "sheetStyle",
  "sheetName": "DoanhSo",
  "style": { "fontName": "Arial", "fontSize": 11 }
}
```

Gọi trước khi ghi data.

---

## 20) Object style

Áp cho `style` / `headerStyle` trên operation, hoặc style lồng trong từng ô (`cells`).

### Font & chữ

| Key (alias) | Ví dụ | Mô tả |
|-------------|--------|--------|
| `fontName` (`font`, `fontFamily`) | `"Arial"` | Font |
| `fontSize` (`size`) | `12` | Cỡ chữ |
| `bold` | `true` | Đậm |
| `italic` | `true` | Nghiêng |
| `underline` | `true` | Gạch chân |
| `color` (`fontColor`, `textColor`) | `"#FFFFFF"` | Màu chữ |

### Nền

| Key (alias) | Ví dụ | Mô tả |
|-------------|--------|--------|
| `fillColor` (`backgroundColor`, `bgColor`, `fill`) | `"#4472C4"` | Màu nền (solid fill) |

### Border (4 cạnh cùng lúc)

| Key (alias) | Ví dụ | Mô tả |
|-------------|--------|--------|
| `border` (`borderStyle`) | xem bảng dưới | Kiểu viền |
| `borderColor` | `"#000000"` | Màu viền |

**Giá trị `border`**

| Giá trị | Kiểu viền |
|---------|-----------|
| `true` / `"1"` / `"thin"` | Thin (mặc định khi bật) |
| `"medium"` | Medium |
| `"thick"` | Thick |
| `"hair"` | Hair |
| `"dotted"` | Dotted |
| `"dashed"` | Dashed |
| `"double"` | Double |
| `false` / `"0"` / `"none"` | Không viền |

> Hiện **không** hỗ trợ viền từng cạnh riêng (`borderTop` / `borderLeft`…). Một lần set = cả 4 cạnh của ô/vùng.

### Căn lề & wrap

| Key (alias) | Ví dụ | Mô tả |
|-------------|--------|--------|
| `horizontalAlignment` (`align`, `hAlign`) | `"left"` \| `"center"` \| `"centre"` \| `"right"` \| `"justify"` | Căn ngang |
| `verticalAlignment` (`vAlign`, `valign`) | `"top"` \| `"center"` \| `"middle"` \| `"bottom"` | Căn dọc |
| `wrapText` (`wrap`) | `true` | Xuống dòng trong ô |

### Kích thước dòng / cột

| Key (alias) | Ví dụ | Mô tả |
|-------------|--------|--------|
| `rowHeight` (`height`) | `22` | Chiều cao dòng (điểm) — áp các hàng trong vùng |
| `columnWidth` (`width`, `colWidth`) | `15` | Độ rộng cột — áp các cột trong vùng |

**Mặc định:** mọi sheet Excel dùng chiều cao dòng **`22`** (`DefaultRowHeight` + các dòng vừa ghi table/range/cells). Ghi đè bằng `rowHeight` trong `style` nếu cần.

### Màu

- `#RRGGBB` hoặc `RRGGBB`
- `AARRGGBB` (8 hex)
- Tên màu hệ thống (`Red`, `Black`, …)

### Thứ tự áp style (table)

1. Ghi header + data  
2. `style` → cả khối (gồm header)  
3. `headerStyle` → **ghi đè** lại hàng header  

### Ví dụ border + màu

```json
{
  "style": {
    "border": "thin",
    "borderColor": "#000000",
    "fontSize": 11
  },
  "headerStyle": {
    "bold": true,
    "fillColor": "#4472C4",
    "color": "#FFFFFF",
    "border": "medium",
    "borderColor": "#1F4E79",
    "horizontalAlignment": "center"
  }
}
```
---

## 21) overwrite

| Tình huống | `overwrite=true` | `overwrite=false` |
|------------|------------------|-------------------|
| Một `table` | Workbook mới (ghi đè file) | Lỗi nếu file tồn tại |
| `operationsJson` | Xóa file cũ → workbook mới → ops | File có → mở cập nhật |
| `cells` / `range` / `style` | Mở nếu có / tạo nếu không | Giống |

---

## 22) ReadExcel

```json
{
  "function": "ReadExcel",
  "paramObject": {
    "relativeOrAbsolutePath": "exports\\doanh-so.xlsx",
    "sheetName": "DoanhSo",
    "hasHeader": "true"
  }
}
```

| Param | Mặc định | Mô tả |
|-------|----------|--------|
| `relativeOrAbsolutePath` | — | File `.xlsx` |
| `sheetName` | sheet đầu | Tên sheet |
| `hasHeader` | `true` | object[] theo header / `false` = matrix |

`Result.Content` = JSON string.

---

## 23) Response & lỗi

Luôn kiểm tra `Result.Success` khi Result là `FileAccessResponse` / `FileReadResponse` / …

| Message | Nguyên nhân |
|---------|-------------|
| `api-key header is required` / `Invalid api-key` | Thiếu/sai key |
| `File session not found` | Chưa connect |
| `rootDirectory is required` | Thiếu khi connect |
| `function is required` | Thiếu `function` |
| `Path must end with .xlsx` | Sai đuôi Excel |
| `dataJson is required for type=table` | Thiếu data |
| `Destination file already exists` | table + overwrite false |
| `File not found.` | Đọc path không tồn tại |
| `File already exists.` | Download/copy không overwrite |
| Path ngoài root | Traversal / sai sandbox |

---

## 24) Gắn node n8n

### Workflow chuẩn

| # | Node | Việc |
|---|------|------|
| 1 | HTTP | `POST /file-auto/connect` |
| 2 | Code / HTTP | Hàm file và/hoặc `WriteExcel` |
| 3 | IF | `Result.Success` |
| 4 | HTTP | `POST /file-auto/disconnect` |

### Mapping UI → API

| UI | API |
|----|-----|
| Session GUID | `sessionId` |
| Root trên worker | `rootDirectory` (connect) |
| Tên hàm | `function` |
| Tham số | `paramObject` |
| Excel batch | `operationsJson` = `JSON.stringify(ops)` |
| Excel headers/rows | `headersJson` / `dataJson` = stringify |
| Bytes | Base64 |
| api-key | Header |

### Code mẫu — ghi text rồi Excel

```javascript
const sessionId = $json.sessionId;
const rows = items.map(i => [i.json.code, i.json.name, i.json.amount]);

return [{
  json: {
    sessionId,
    function: 'WriteExcel',
    paramObject: {
      relativeOrAbsolutePath: 'exports\\tong-hop.xlsx',
      overwrite: 'true',
      operationsJson: JSON.stringify([
        {
          sheetName: 'DoanhSo',
          type: 'table',
          startCell: 'A1',
          headers: ['Mã', 'Tên', 'Tiền'],
          data: rows,
          headerStyle: { bold: true, fillColor: '#4472C4', color: '#FFFFFF' },
          style: { border: 'thin' }
        }
      ])
    }
  }
}];
```

### Credentials

- Header `api-key`
- Base URL: `http://<gateway-ip>:8081`

---

## Phụ lục — File vs Excel

| Nhu cầu | Hàm |
|---------|-----|
| Đọc/ghi `.txt`, log, JSON text | `ReadAllText` / `WriteAllText` / `AppendAllText` |
| Binary / Base64 | `ReadAllBytes` / `WriteAllBytes` / `ExportPathForApi` |
| Copy, move, xóa, list | `CopyFile`, `MoveFile`, `Delete*`, `ListDirectory` |
| Tải từ internet | `DownloadFromUrl` |
| Báo cáo / bảng Excel thật | `WriteExcel` |
| Đọc lại Excel | `ReadExcel` |

---

*Source: `RMIV.DLL.FILEMANAGER.FileAccessManager` · HTTP: `RMIV.WF.CLIENT` · Docs: `/docs/HUONG-DAN-API-FILE.md`.*
