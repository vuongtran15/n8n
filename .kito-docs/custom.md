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

## Ghi chú thêm

<!-- Thêm mục dưới đây khi có thay đổi -->
