import type { INodeListSearchItems } from 'n8n-workflow';

/**
 * Workflows the current user is allowed to call via RM Widget.
 *
 * Stub for now — replace with an API that returns workflows granted to the account.
 * Do not put workflow URLs here (keeps the NDV from showing an “open workflow” link).
 */
export const AUTHORIZED_WORKFLOWS: INodeListSearchItems[] = [
	// Examples — replace `value` with real workflow IDs from your instance:
	// { name: 'Order Process', value: 'jjjfaGCk99l4LoZQ' },
	{ name: '(Demo) Authorized workflow A — edit authorizedWorkflows.ts', value: 'REPLACE_WITH_WORKFLOW_ID_A' },
	{ name: '(Demo) Authorized workflow B — edit authorizedWorkflows.ts', value: 'REPLACE_WITH_WORKFLOW_ID_B' },
];

export function filterAuthorizedWorkflows(filter?: string): INodeListSearchItems[] {
	const q = filter?.trim().toLowerCase();
	if (!q) return AUTHORIZED_WORKFLOWS;
	return AUTHORIZED_WORKFLOWS.filter(
		(w) =>
			w.name.toLowerCase().includes(q) ||
			String(w.value).toLowerCase().includes(q),
	);
}
