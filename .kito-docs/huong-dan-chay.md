# Hướng dẫn chạy n8n (dev)

Checklist ngắn khi đã cài xong (xem [huong-dan-cai-dat.md](./huong-dan-cai-dat.md)).

## Trước khi chạy

```powershell
# Postgres + Redis
docker compose -f docker/kito-n8n/docker-compose.yml ps
# nếu chưa Up:
docker compose -f docker/kito-n8n/docker-compose.yml up -d

# Env cho n8n (Postgres/Redis)
copy docker\kito-n8n\n8n.env packages\cli\bin\.env
```

## Chạy dev (3 terminal)

```powershell
# Terminal 1 — backend → http://localhost:5678
pnpm dev:be

# Terminal 2 — UI hot reload → http://localhost:8080 (tuỳ chọn)
pnpm dev:fe:editor

# Terminal 3 — worker (bắt buộc vì Redis/queue)
cd packages\cli
pnpm run dev:worker
```

| Lệnh | Việc gì |
|------|---------|
| `pnpm dev:be` | Backend + editor từ dist |
| `pnpm dev:fe:editor` | Frontend hot reload |
| `pnpm run dev:worker` (trong `packages/cli`) | Chạy execution khi queue mode |

**Không** dùng `pnpm dev` ở root (đã bỏ).

## Tài khoản admin (owner)

- **Lần đầu:** mở http://localhost:5678 → màn hình setup Owner (email + mật khẩu).
- Lưu trong **Postgres**, không phải user Docker `ktuser`.
- `ktuser` / `kt123qwe***` chỉ là tài khoản **database**.

Pre-seed qua env (tuỳ chọn): `N8N_INSTANCE_OWNER_EMAIL` + `N8N_INSTANCE_OWNER_PASSWORD_HASH` (bcrypt) trong `.env` — xem docs n8n instance owner.

## URL nhanh

| | |
|---|---|
| n8n | http://localhost:5678 |
| Editor hot reload | http://localhost:8080 |
| Postgres | `localhost:5432` |
| Redis | `localhost:6379` |
| LAN (ví dụ) | `http://192.168.1.15:5678` |

## Ẩn node nhà cung cấp ngoài

### Community (verified npm)
```env
N8N_COMMUNITY_PACKAGES_ENABLED=false
N8N_VERIFIED_PACKAGES_ENABLED=false
N8N_UNVERIFIED_PACKAGES_ENABLED=false
```

### Built-in apps (Airtable, Asana, AWS, …)
Dùng **`NODES_INCLUDE`** (whitelist). Trong `docker/kito-n8n/n8n.env` đã chỉ giữ node cơ bản:

- Trigger: Manual, Schedule, Webhook, Error, Execute Workflow  
- Logic: Code, If, Switch, Split In Batches (loop), Filter, Set, Merge, Wait  
- File: Read/Write File, Convert/Extract File, Spreadsheet, PDF, Compression  
- Transform: Item Lists, Aggregate, Sort, Limit, …  
- Utils: HTTP Request, Date & Time, Crypto, HTML, XML, Sticky Note  

Sau khi sửa `.env` → **restart** `pnpm dev:be` + hard refresh browser.

Muốn thêm 1 node built-in: thêm `"n8n-nodes-base.<tenNode>"` vào mảng `NODES_INCLUDE`.

## Ẩn mục AI / Action in an app / Human review

Đã sửa UI node creator (`viewsData.ts` RegularView) trên branch kito — panel “What happens next?” chỉ còn:

- Data transformation  
- Flow  
- Core  
- Add another trigger  

Cần **rebuild/restart frontend**: `pnpm --filter n8n-editor-ui clean && pnpm --filter n8n-editor-ui build` rồi `pnpm dev:be`, hoặc dùng `pnpm dev:fe:editor` (:8080).

## Ẩn Code in Python

- UI: đã bỏ option Python trong `packages/nodes-base/nodes/Code/Code.node.ts`
- Env: `N8N_PYTHON_ENABLED=false` (chặn execute nếu còn workflow cũ dùng Python)
- Sau sửa: `pnpm --filter n8n-nodes-base build` + restart `pnpm dev:be`

## AI Agent (langchain — không nằm trong nodes-base)

AI Agent package: `@n8n/n8n-nodes-langchain`  
Đã whitelist trong `NODES_INCLUDE` (Agent + Chat Model + Memory + Tools + Chat Trigger).

Panel **AI** hiện lại khi các node langchain được load. Vẫn ẩn: Action in an app, Human review.

Sau khi sửa `n8n.env`:

```powershell
copy docker\kito-n8n\n8n.env packages\cli\bin\.env
# restart pnpm dev:be
# nếu đổi UI: pnpm --filter n8n-editor-ui build
```

## Dừng

- Ctrl+C các terminal `dev:*`
- Docker (giữ data): `docker compose -f docker/kito-n8n/docker-compose.yml stop`
- Docker + xoá volume: `docker compose -f docker/kito-n8n/docker-compose.yml down -v`
