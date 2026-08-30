# Hướng dẫn cài đặt n8n (kito-n8n)

Hướng dẫn chạy n8n local từ source trên Windows, kèm Postgres + Redis qua Docker.

Tài liệu này nằm trong `.kito-docs/` (root repo).

## Yêu cầu

| Tool | Phiên bản |
|------|-----------|
| Node.js | `>= 24` |
| pnpm | `>= 11.22.0` (theo `packageManager` trong `package.json`) |
| Git | Có sẵn |
| Docker Desktop | Cần cho Postgres/Redis |

### Docker trên Windows

1. Bật ảo hóa trong BIOS (thường đã sẵn).
2. Bật **Virtual Machine Platform** + **Windows Subsystem for Linux** (PowerShell Admin):

```powershell
wsl.exe --install --no-distribution
```

3. Restart máy, mở lại Docker Desktop đến khi Engine sẵn sàng.

Kiểm tra:

```powershell
docker info
(Get-CimInstance Win32_ComputerSystem).HypervisorPresent   # phải True
```

## 1. Clone & cài dependency

```powershell
cd E:\CODE\N8N\n8n
git checkout kito-n8n

pnpm install --frozen-lockfile
pnpm build
```

> `pnpm agent:setup` trên Windows có thể lỗi `spawn pnpm ENOENT` — chạy tay `install` + `build` như trên.

## 2. Chạy Postgres + Redis

```powershell
docker compose -f docker/kito-n8n/docker-compose.yml up -d
copy docker\kito-n8n\n8n.env packages\cli\bin\.env
```

### Tài khoản Postgres

| | |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `n8n_db` |
| User | `ktuser` |
| Password | `kt123qwe***` |

Connection string:

```
postgresql://ktuser:kt123qwe***@localhost:5432/n8n_db
```

> Nếu container Postgres đã tạo trước đó với user cũ, cần recreate volume để áp dụng user mới:
> `docker compose -f docker/kito-n8n/docker-compose.yml down -v` rồi `up -d` lại.

### Redis

| | |
|---|---|
| Host | `localhost` |
| Port | `6379` |

Env Redis trong `n8n.env` bật `EXECUTIONS_MODE=queue` (cần worker — xem bước 4).

## 3. Chạy n8n ở chế độ dev

> Note ngắn dùng hàng ngày: **[huong-dan-chay.md](./huong-dan-chay.md)**

Mở terminal:

```powershell
# Terminal 1 — backend (http://localhost:5678)
pnpm dev:be

# Terminal 2 — frontend hot reload (http://localhost:8080)
pnpm dev:fe:editor

# Terminal 3 — worker (bắt buộc vì Redis/queue)
cd packages\cli
pnpm run dev:worker
```

Không dùng `pnpm dev` ở root (đã bỏ).

Lần đầu mở http://localhost:5678 để tạo **Owner** (admin). User Postgres `ktuser` không phải login n8n.

## 5. Chỉ dùng SQLite (không Docker)

Không copy `n8n.env`, không cần Postgres/Redis:

```powershell
pnpm --filter n8n-containers services:clean   # nếu còn container cũ
# xoá packages/cli/bin/.env nếu có
pnpm dev:be
```

## Lệnh hữu ích

```powershell
# Trạng thái container
docker compose -f docker/kito-n8n/docker-compose.yml ps

# Dừng Postgres/Redis
docker compose -f docker/kito-n8n/docker-compose.yml down

# Xoá luôn volume (mất data DB)
docker compose -f docker/kito-n8n/docker-compose.yml down -v
```

## Cấu trúc liên quan

```
.kito-docs/                    # tài liệu + ghi chú custom
  README.md
  huong-dan-cai-dat.md
  custom.md

docker/kito-n8n/               # stack Docker local
  docker-compose.yml           # network: kito-n8n-net (172.28.10.0/24)
  n8n.env
  .gitignore
```

`packages/cli/bin/.env` đã được gitignore — không commit file này.

Network `kito-n8n-net` dùng subnet cố định để không đụng bridge mặc định / testcontainers (`n8n-svc-*`). Host vẫn nối qua `localhost:5432` / `localhost:6379`.

## Lỗi thường gặp

| Hiện tượng | Cách xử lý |
|------------|------------|
| `localhost refused to connect` (:5678) | Chưa chạy `pnpm dev:be` |
| Docker: *Virtualization support not detected* | Bật Virtual Machine Platform + restart |
| `spawn pnpm ENOENT` với `agent:setup` | Dùng `pnpm install` / `pnpm build` thủ công |
| PowerShell: `--services=postgres,redis` bị lỗi | Bọc quotes: `--services='postgres,redis'` |
| Workflow không chạy | Thiếu `pnpm run dev:worker` khi queue mode |
| Không thấy `.kito-docs` trong Explorer | Bật “Show hidden items” (folder bắt đầu bằng `.`) |
