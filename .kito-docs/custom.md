# Custom notes (kito)

Ghi lại thay đổi / config / quyết định custom của team tại đây.

## Stack local

- Branch: `kito-n8n`
- Docker: `docker/kito-n8n/docker-compose.yml`
- Env template: `docker/kito-n8n/n8n.env`
- Network: `kito-n8n-net` (`172.28.10.0/24`) — tách khỏi bridge/testcontainers

## Tài khoản Postgres

| | |
|---|---|
| Host | `localhost` |
| Port | `5432` |
| Database | `n8n_db` |
| User | `ktuser` |
| Password | `kt123qwe***` |

```
postgresql://ktuser:kt123qwe***@localhost:5432/n8n_db
```

## Changelog custom

| Ngày | Nội dung |
|------|----------|
| 2026-08-30 | Thêm Postgres + Redis compose, docs cài đặt Windows |
| 2026-08-30 | Đổi Postgres user → `ktuser` / pass → `kt123qwe***` |
| 2026-08-30 | Thêm network `kito-n8n-net` subnet `172.28.10.0/24` |
| 2026-08-30 | Docs Docker network + LAN: `.kito-docs/Docker/network-va-lan.md` |
| 2026-08-30 | Thêm `.kito-docs/huong-dan-chay.md` (dev:be / worker / admin) |
| 2026-08-30 | Tắt community/verified nodes trong `n8n.env` |
| 2026-08-30 | `NODES_INCLUDE` whitelist node cơ bản (bỏ SaaS apps) |
| 2026-08-30 | Ẩn AI / Action in an app / Human review khỏi node creator |
| 2026-08-30 | Ẩn Code in Python (`N8N_PYTHON_ENABLED=false` + Code.node.ts) |
| 2026-08-30 | Thêm AI Agent stack (langchain) vào `NODES_INCLUDE`, mở lại mục AI |
| 2026-08-30 | Thêm nhóm RM Workflow + node `rmWidget` (trước đây `rmCallSubworkflow`) |
| 2026-08-30 | Tách RM nodes sang `custom/n8n-nodes-rm-workflow` (`CUSTOM.*`, `N8N_CUSTOM_EXTENSIONS`) |
| 2026-08-31 | Thêm `n8n-nodes-base.postgres` vào `NODES_INCLUDE` (đọc/ghi Postgres) |
| 2026-08-31 | Settings Personal: chọn ngôn ngữ EN / 中文 / VI (`N8N_LOCALE` localStorage) |
| 2026-08-31 | Ẩn tab Variables khi không có license Enterprise |
| 2026-08-31 | Ẩn Templates (`N8N_TEMPLATES_ENABLED=false`) và Help khỏi sidebar |
| 2026-08-31 | Bật Memory (Simple + Postgres Chat), MSSQL; hiện Simple Memory dù queue mode |
| 2026-08-31 | Rebrand UI: sidebar + tab title → **RMVN N8N** |
| 2026-08-31 | Ẩn Insights khỏi sidebar và command bar |
| 2026-08-31 | Docs: [huong-dan-chay-prod.md](./huong-dan-chay-prod.md) — chạy prod + worker |

## Ghi chú thêm

<!-- Thêm mục dưới đây khi có thay đổi -->
