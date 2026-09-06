import type { PortalWorkflowCatalog } from './rm-workflow.types';

export function normalizePortalCatalogs(response: unknown): PortalWorkflowCatalog[] {
	if (Array.isArray(response)) {
		return response as PortalWorkflowCatalog[];
	}

	if (!response || typeof response !== 'object') {
		return [];
	}

	const record = response as Record<string, unknown>;
	for (const key of ['value', 'catalogs', 'data', 'items']) {
		const candidate = record[key];
		if (Array.isArray(candidate)) {
			return candidate as PortalWorkflowCatalog[];
		}
	}

	return [];
}
