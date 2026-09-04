import type { INodeListSearchItems } from 'n8n-workflow';

/** Machine-readable category marker for the widget store UI (see editor-ui rmWorkflow). */
export const RM_WIDGET_CATEGORY_PREFIX = 'rm-category:';

export interface AuthorizedWidget extends INodeListSearchItems {
	category: string;
}

/**
 * Workflows the current user is allowed to call via RM Widget.
 *
 * Stub for now — replace with an API that returns workflows granted to the account.
 * Do not put workflow URLs here (keeps the NDV from showing an “open workflow” link).
 */
export const AUTHORIZED_WIDGETS: AuthorizedWidget[] = [
	{
		name: 'Order Process',
		value: 'REPLACE_WITH_WORKFLOW_ID_A',
		description: 'Process and track customer orders end-to-end',
		category: 'Sales',
		icon: 'fa:shopping-cart',
	},
	{
		name: 'Lead Qualification',
		value: 'REPLACE_WITH_WORKFLOW_ID_B',
		description: 'Score and route inbound leads to the right team',
		category: 'Sales',
		icon: 'fa:filter',
	},
	{
		name: 'Employee Onboarding',
		value: 'REPLACE_WITH_WORKFLOW_ID_C',
		description: 'Provision accounts and notify teams for new hires',
		category: 'HR',
		icon: 'fa:user-plus',
	},
	{
		name: 'Invoice Reconciliation',
		value: 'REPLACE_WITH_WORKFLOW_ID_D',
		description: 'Match payments to open invoices automatically',
		category: 'Finance',
		icon: 'fa:file-invoice-dollar',
	},
];

function toListSearchItem({ category, ...widget }: AuthorizedWidget): INodeListSearchItems {
	return {
		...widget,
		url: `${RM_WIDGET_CATEGORY_PREFIX}${category}`,
	};
}

export function filterAuthorizedWorkflows(filter?: string): INodeListSearchItems[] {
	const q = filter?.trim().toLowerCase();
	if (!q) {
		return AUTHORIZED_WIDGETS.map(toListSearchItem);
	}

	return AUTHORIZED_WIDGETS.filter(
		(widget) =>
			widget.name.toLowerCase().includes(q) ||
			widget.description?.toLowerCase().includes(q) ||
			widget.category.toLowerCase().includes(q) ||
			String(widget.value).toLowerCase().includes(q),
	).map(toListSearchItem);
}
