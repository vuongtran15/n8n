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

## Ẩn node nhà cung cấp ngoài (community)

Trong `packages/cli/bin/.env` (template: `docker/kito-n8n/n8n.env`):

```env
N8N_COMMUNITY_PACKAGES_ENABLED=false
N8N_VERIFIED_PACKAGES_ENABLED=false
N8N_UNVERIFIED_PACKAGES_ENABLED=false
```

Sau đó **restart** `pnpm dev:be`. Panel “Action in an app” sẽ không còn danh sách verified community (1Shot, 2Captcha, …) — chỉ còn node built-in của n8n.

Muốn thu hẹp thêm node built-in: dùng `NODES_EXCLUDE='["n8n-nodes-base.someNode"]'` hoặc `NODES_INCLUDE` (JSON array).

## Dừng

- Ctrl+C các terminal `dev:*`
- Docker (giữ data): `docker compose -f docker/kito-n8n/docker-compose.yml stop`
- Docker + xoá volume: `docker compose -f docker/kito-n8n/docker-compose.yml down -v`
