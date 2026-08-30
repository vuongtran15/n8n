# Custom nodes — RM Workflow

Nhóm **RM Workflow** trên node creator. Thêm node mới dưới `packages/nodes-base/nodes/RmWorkflow/`.

## Nodes hiện có

| Node | Type | Mô tả |
|------|------|--------|
| RM Call Subworkflow | `n8n-nodes-base.rmCallSubworkflow` | Chọn workflow ID → tự hiện input fields của sub-workflow (resourceMapper) |

Cơ chế fields: giống Execute Sub-workflow — đọc schema từ **Execute Workflow Trigger** của child. Child phải khai báo inputs (không phải “Accept all data”) thì panel mới có trường.

## Thêm node tiếp theo vào nhóm

1. Tạo folder `packages/nodes-base/nodes/RmWorkflow/<TenNode>/`
2. File `*.node.ts` + `*.node.json` với:

```json
"categories": ["RM Workflow"],
"subcategories": { "RM Workflow": ["RM Workflow"] }
```

3. Đăng ký path trong `packages/nodes-base/package.json` → `n8n.nodes`
4. Thêm vào `NODES_INCLUDE` trong `docker/kito-n8n/n8n.env`
5. Build / watch (xem dưới)

## Test nhanh (không cần rebuild cả monorepo)

### A. Unit test (nhanh nhất)

```powershell
cd packages\nodes-base
pnpm test RmCallSubworkflow
# hoặc file cụ thể:
pnpm test nodes/RmWorkflow/RmCallSubworkflow
```

### B. Watch nodes-base + backend đã chạy

```powershell
# Terminal 1 — backend (giữ chạy)
pnpm dev:be

# Terminal 2 — chỉ rebuild nodes khi sửa (vài giây–chục giây, không full monorepo)
pnpm --filter n8n-nodes-base watch
```

`dev:be` (nodemon) thường reload khi `nodes-base/dist` đổi. Hard refresh browser.

### C. Sửa UI node creator

```powershell
pnpm dev:fe:editor   # :8080 hot reload
# hoặc
pnpm --filter n8n-editor-ui clean
pnpm --filter n8n-editor-ui build
```

### Tránh

- `pnpm build` / `pnpm reset` mỗi lần sửa 1 node — quá chậm  
- Chỉ restart `dev:be` mà không `watch`/`build` nodes-base — UI vẫn node cũ
