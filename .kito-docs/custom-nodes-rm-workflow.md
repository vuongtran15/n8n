# Custom nodes — RM Workflow

Package riêng ngoài `nodes-base`: `custom/n8n-nodes-rm-workflow/`  
→ fork / merge upstream **không đụng** `packages/nodes-base`.

## Nodes hiện có

| Node | Type | Mô tả |
|------|------|--------|
| RM Call Subworkflow | `CUSTOM.rmCallSubworkflow` | Chọn workflow được cấp / nhập ID → map inputs (resourceMapper). Không tạo / không mở sub-workflow |

Cơ chế fields: giống Execute Sub-workflow — đọc schema từ **Execute Workflow Trigger** của child. Child phải khai báo inputs (không phải “Accept all data”) thì panel mới có trường.

Chọn workflow: `resourceLocator` — **From granted list** (popup danh sách cấp sẵn) hoặc **By ID**. Danh sách stub: `custom/n8n-nodes-rm-workflow/src/helpers/authorizedWorkflows.ts` (sau này thay API theo tài khoản). Không dùng `workflowSelector` → không nút tạo / mở sub-workflow.

Loader: `N8N_CUSTOM_EXTENSIONS` → package name luôn là **`CUSTOM`**.

## Env (bắt buộc)

Trong `docker/kito-n8n/n8n.env` (copy sang `packages/cli/bin/.env`):

```env
N8N_CUSTOM_EXTENSIONS=E:/CODE/N8N/n8n/custom/n8n-nodes-rm-workflow
```

Và trong `NODES_INCLUDE` có `"CUSTOM.rmCallSubworkflow"`.

Đổi path cho máy bạn nếu repo không nằm ở `E:/CODE/N8N/n8n`.

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
