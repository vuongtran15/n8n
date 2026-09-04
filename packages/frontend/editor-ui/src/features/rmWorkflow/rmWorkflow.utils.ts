import type { RmWorkflowCatalog } from './rmWorkflow.types';

export function getCatalogDisplayName(
	catalog: Pick<RmWorkflowCatalog, 'name' | 'nameVi' | 'nameZh'>,
	locale?: string,
): string {
	const lang = locale ?? 'en';
	if (lang.startsWith('vi') && catalog.nameVi) return catalog.nameVi;
	if (lang.startsWith('zh') && catalog.nameZh) return catalog.nameZh;
	return catalog.name ?? '';
}
