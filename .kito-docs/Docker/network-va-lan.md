# Docker network & kết nối LAN (kito-n8n)

## Network trong `docker-compose.yml`

```yaml
networks:
  kito-n8n-net:
    name: kito-n8n-net      # tên thật trên Docker (không phụ thuộc tên folder project)
    driver: bridge          # mạng ảo nội bộ giữa các container trên cùng 1 máy
    ipam:
      config:
        - subnet: 172.28.10.0/24   # dải IP riêng cho stack này
          gateway: 172.28.10.1
```

| Thành phần | Ý nghĩa |
|------------|---------|
| **bridge** | Docker tạo switch ảo; container trong cùng network nói chuyện nhau bằng tên service (`postgres`, `redis`) |
| **name** | Cố định tên network → tránh bị đổi theo tên thư mục / `COMPOSE_PROJECT_NAME` |
| **subnet** | Dải IP **chỉ dùng trong Docker**, không phải LAN `192.168.1.x` |
| **gateway** | “Router” ảo của dải đó |

### Luồng thực tế

- **Container ↔ container** (cùng compose): qua `kito-n8n-net` (`172.28.10.x`)
- **Máy host / LAN → Postgres/Redis**: qua **port publish** (`0.0.0.0:5432` / `:6379`) — không đi trực tiếp vào subnet `172.28.10`

Subnet riêng giúp hai stack Docker **không chiếm cùng một dải IP bridge**. Còn trùng **port host** (`5432`, `6379`, …) là chuyện khác — vẫn phải chọn port khác nhau.

Stack hiện tại:

| | |
|---|---|
| Network | `kito-n8n-net` |
| Subnet | `172.28.10.0/24` |
| Gateway | `172.28.10.1` |

---

## Compose thứ 2: làm sao không đè?

Nguyên tắc: **tên network khác + subnet khác + (nếu cần) port host khác**.

Ví dụ `docker/other-app/docker-compose.yml`:

```yaml
services:
  api:
    image: my-api:latest
    networks:
      - other-app-net
    ports:
      - '8081:8080'   # đừng trùng 5432/6379/5678...

networks:
  other-app-net:
    name: other-app-net
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.20.0/24   # khác 172.28.10.0/24 của kito
          gateway: 172.28.20.1
```

### Checklist

1. **Network name** riêng (`kito-n8n-net` vs `other-app-net`)
2. **Subnet** không chồng (ví dụ `/24` cách nhau: `.10`, `.20`, `.30`…)
3. **Port host** không trùng
4. **container_name** không trùng (nếu có khai báo)
5. Chỉ gắn chung network khi **cố ý** cho 2 stack nói chuyện trong Docker (`external: true`)

### Khi nào cần chung network?

Nếu app B phải gọi thẳng container Postgres của kito **bên trong Docker** (không qua localhost):

```yaml
# bên other-app
networks:
  kito-n8n-net:
    external: true
    name: kito-n8n-net
```

Chỉ kết nối từ máy/LAN thì **không cần** chung network — dùng `192.168.1.15:5432` là đủ.

---

## Hai app A và B dùng IP LAN để kết nối?

**Có** — nếu dịch vụ được publish ra host và lắng nghe trên LAN.

### Cách thường dùng với setup kito

App A / App B trên máy trong LAN (hoặc container map port ra host) kết nối qua IP máy host, ví dụ `192.168.1.15`:

| Dịch vụ | Từ máy/app khác trên LAN |
|---------|---------------------------|
| Postgres (kito) | `192.168.1.15:5432` |
| Redis (kito) | `192.168.1.15:6379` |
| n8n UI | `192.168.1.15:5678` (nếu `dev:be` đang chạy) |

Subnet Docker `172.28.10.0/24` **không** dùng cho LAN — máy khác không route vào đó. LAN chỉ thấy **port đã publish** trên IP host.

### Điều kiện

1. Port bind `0.0.0.0` (không chỉ `127.0.0.1`)
2. Windows Firewall cho phép inbound port đó
3. Hai máy cùng mạng / không bị AP isolation
4. App lắng nghe đúng interface (không hardcode `localhost` nếu muốn nhận từ ngoài)

Mở firewall (PowerShell Admin) nếu LAN không vào được:

```powershell
New-NetFirewallRule -DisplayName 'Kito Postgres' -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
New-NetFirewallRule -DisplayName 'Kito Redis' -Direction Inbound -Protocol TCP -LocalPort 6379 -Action Allow
```

### Tóm tắt chọn IP nào

| Kiểu kết nối | Dùng IP / địa chỉ nào |
|--------------|------------------------|
| 2 container **cùng** Docker network | tên service + subnet Docker (`postgres:5432`) |
| 2 app trên **máy khác nhau / LAN** | IP LAN host (`192.168.1.15:port`) |
| App trên **cùng máy** với Docker | `localhost:port` hoặc IP LAN đều được |

A và B **không cần** chung Docker network nếu đã nói chuyện qua IP LAN + port publish.

**Bảo mật:** Redis hiện không có password — chỉ mở LAN khi cần; xong có thể đóng firewall rule hoặc bind `127.0.0.1:6379:6379` để chỉ localhost.
