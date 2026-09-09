# n8n-nodes-rm-workflow

Custom package for **RM Workflow** nodes (outside `nodes-base` — safe when forking/merging upstream).

Listed in root `pnpm-workspace.yaml` as `custom/*`.

## Dev vs Prod (quan trọng)

| | Path | Khi nào |
|---|---|---|
| **Source (dev)** | `custom/n8n-nodes-rm-workflow` | Sửa code, `pnpm build`, test |
| **Release (prod)** | `D:/CODE/N8N/n8n-custom-extensions/n8n-nodes-rm-workflow` | Chỉ cập nhật khi `pnpm pack:release` |

**Prod phải trỏ release**, không trỏ source — tránh đang sửa / build làm sập bản đang chạy.

```env
# packages/cli/bin/.env  (hoặc docker/kito-n8n/n8n.env)
N8N_CUSTOM_EXTENSIONS=D:/CODE/N8N/n8n-custom-extensions/n8n-nodes-rm-workflow
```

### Workflow hàng ngày

```powershell
# 1) Dev / test trên source
cd custom\n8n-nodes-rm-workflow
pnpm build
# (test bằng instance DEV riêng, hoặc tạm trỏ N8N_CUSTOM_EXTENSIONS vào source)

# 2) Khi ổn → đóng gói sang folder release (không đụng source)
pnpm pack:release

# 3) Restart n8n PROD để load bản mới
```

Đổi chỗ release: `RM_NODES_RELEASE_DIR=D:\path\khac pnpm pack:release`

## Develop

From repo root:

```powershell
pnpm install --filter n8n-nodes-rm-workflow
pnpm --filter n8n-nodes-rm-workflow build
# or: pnpm --filter n8n-nodes-rm-workflow watch
```

Node type id: **`CUSTOM.rmWidget`** (must also be in `NODES_INCLUDE`).

## Layout

```
src/nodes/RMWorkflow/     # RM Workflow group folder
  RMWidget.node.ts          # node type: CUSTOM.rmWidget
  RMWidget.node.json
```

## Add another node

1. Add `src/nodes/RMWorkflow/<Name>.node.ts` + `.node.json` (or new group folder under `src/nodes/`)
2. `pnpm --filter n8n-nodes-rm-workflow build`
3. Add `CUSTOM.<nodeName>` to `NODES_INCLUDE`
4. `pnpm pack:release` khi muốn đưa lên prod
5. Restart n8n prod
