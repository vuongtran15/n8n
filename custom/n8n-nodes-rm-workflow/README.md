# n8n-nodes-rm-workflow

Custom package for **RM Workflow** nodes (outside `nodes-base` — safe when forking/merging upstream).

Listed in root `pnpm-workspace.yaml` as `custom/*`.

## Develop

From repo root:

```powershell
pnpm install --filter n8n-nodes-rm-workflow
pnpm --filter n8n-nodes-rm-workflow build
# or: pnpm --filter n8n-nodes-rm-workflow watch
```

Point n8n at this folder (`docker/kito-n8n/n8n.env`):

```env
N8N_CUSTOM_EXTENSIONS=D:/CODE/N8N/n8n/custom/n8n-nodes-rm-workflow
```

Node type ids: `CUSTOM.rmWidget`, `CUSTOM.rmInit`, `CUSTOM.rmUuid`, `CUSTOM.rmHasData`, …

## Layout

```
src/nodes/RMWorkflow/     # RM Workflow group folder
  RMWidget.node.ts
  RmInit.node.ts
  RmUuid.node.ts
  RmHasData.node.ts
  …
```

## Add another node

1. Add `src/nodes/RMWorkflow/<Name>.node.ts` + `.node.json`
2. `pnpm --filter n8n-nodes-rm-workflow build`
3. Add `CUSTOM.<nodeName>` to `NODES_INCLUDE`
4. Restart n8n
