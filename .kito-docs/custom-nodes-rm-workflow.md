# Custom nodes — RM Workflow

Package riêng ngoài `nodes-base`: `custom/n8n-nodes-rm-workflow/`  
→ fork / merge upstream **không đụng** `packages/nodes-base`.

## Nodes hiện có

| Node | Type | Mô tả |
|------|------|--------|
| RM Workflow | `CUSTOM.rmWidget` | Chọn workflow được cấp / nhập ID → map inputs |
| RM Init | `CUSTOM.rmInit` | Khởi tạo baseUrl, apiKey, sessionId |
| RM UUID | `CUSTOM.rmUuid` | Tạo Session ID ngẫu nhiên |
| RM Has Data | `CUSTOM.rmHasData` | Check dữ liệu trống / property path → Has Data / Empty |
| RM Copy Context | `CUSTOM.rmCopyContext` | Copy field kết nối từ node khác |
| RM SAP / Web / File / Outlook | `CUSTOM.rm*AutoWorkflow` | Automation nodes |

Loader: `N8N_CUSTOM_EXTENSIONS` → package name luôn là **`CUSTOM`**.

## Env

Trong `docker/kito-n8n/n8n.env` (copy sang `packages/cli/bin/.env`):

```env
N8N_CUSTOM_EXTENSIONS=D:/CODE/N8N/n8n/custom/n8n-nodes-rm-workflow
```

Và trong `NODES_INCLUDE` có các `CUSTOM.*` cần dùng.

## Dev / rebuild

```powershell
cd custom\n8n-nodes-rm-workflow
pnpm build
# Restart n8n / hard refresh browser
```

**Deploy server khác:** commit + pull repo → `pnpm build` trong `custom/n8n-nodes-rm-workflow` → đảm bảo `.env` trỏ đúng path trên server đó.
