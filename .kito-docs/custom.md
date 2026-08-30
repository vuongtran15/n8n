# Custom notes (kito)

Ghi lại thay đổi / config / quyết định custom của team tại đây.

## Stack local

- Branch: `kito-n8n`
- Docker: `docker/kito-n8n/docker-compose.yml`
- Env template: `docker/kito-n8n/n8n.env`

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

## Ghi chú thêm

<!-- Thêm mục dưới đây khi có thay đổi -->
