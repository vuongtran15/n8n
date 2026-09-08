# Custom nodes — RM Workflow

Package riêng ngoài `nodes-base`: `custom/n8n-nodes-rm-workflow/`  
→ fork / merge upstream **không đụng** `packages/nodes-base`.

## Nodes hiện có

| Node | Type | Mô tả |
|------|------|--------|
| RM Workflow | `CUSTOM.rmWidget` | Chọn workflow được cấp / nhập ID → map inputs (resourceMapper). Không tạo / không mở sub-workflow |
| RM Init | `CUSTOM.rmInit` | Khởi tạo baseUrl, apiKey, sessionId |
| RM UUID | `CUSTOM.rmUuid` | Tạo mã khóa ngẫu nhiên (Session ID) — không cần biết UUID/GUID |

Cơ chế fields: giống Execute Sub-workflow — đọc schema từ **Execute Workflow Trigger** của child. Child phải khai báo inputs (không phải “Accept all data”) thì panel mới có trường.

Chọn workflow: **Widget store** (popup kho widget) hoặc **By ID**.

**API portal** (proxy qua n8n):
- `GET /rest/rm-workflow/catalogs` → `{base}/api/portal/workflow/catalogs`
- `GET /rest/rm-workflow/workflows?search=&page=&pageSize=&catalogId=` → `{base}/api/portal/workflow?...` (gửi kèm `email` user đăng nhập)

Cấu hình **Settings → RM Workflow** (admin): `apiBaseUrl` = `http://172.19.137.206:200`  
Hoặc env: `RM_WORKFLOW_PORTAL_API_BASE_URL`.

Stub cũ `authorizedWorkflows.ts` chỉ dùng khi fallback `listSearch` — UI store không dùng stub nữa.

Loader: `N8N_CUSTOM_EXTENSIONS` → package name luôn là **`CUSTOM`**.

## Env (bắt buộc)

Trong `docker/kito-n8n/n8n.env` (copy sang `packages/cli/bin/.env`):

```env
N8N_CUSTOM_EXTENSIONS=D:/CODE/N8N/n8n/custom/n8n-nodes-rm-workflow
```

Và trong `NODES_INCLUDE` có `"CUSTOM.rmWidget"`.

Đổi path cho máy bạn nếu repo không nằm ở `D:/CODE/N8N/n8n`.

## Thêm node tiếp theo vào nhóm

1. Tạo `custom/n8n-nodes-rm-workflow/src/nodes/<TenNode>/`
2. File `*.node.ts` + `*.node.json` với:

```json
"node": "CUSTOM.<tenNode>",
"categories": ["RM Workflow"],
"subcategories": { "RM Workflow": ["RM Workflow"] }
```

3. Thêm path vào `package.json` → `n8n.nodes` (optional cho publish; loader globs `**/*.node.js`)
4. Thêm `"CUSTOM.<tenNode>"` vào `NODES_INCLUDE`
5. `pnpm build` trong package + restart `dev:be`

## Dev / rebuild nhanh

```powershell
cd custom\n8n-nodes-rm-workflow
pnpm install
pnpm build
# hoặc: pnpm watch   (chỉ tsc; lần đầu / đổi .node.json vẫn cần pnpm build)

# Terminal khác — backend
pnpm dev:be
```

Hard refresh browser sau khi dist đổi.

## Sửa UI node creator (nhóm RM Workflow)

Tile **RM Workflow** nằm trong `editor-ui` (viewsData) — đó là customization fork nhỏ, không phải trong package node.

```powershell
pnpm dev:fe:editor   # :8080
```

## Tránh

- Đưa node vào `packages/nodes-base` — conflict khi fork/merge upstream  
- Chỉ sửa `.ts` mà không `pnpm build` trong `custom/n8n-nodes-rm-workflow` — n8n chỉ load `*.node.js` trong dist
