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

export function getSortedCatalogs(catalogs: RmWorkflowCatalog[]): RmWorkflowCatalog[] {
	return [...catalogs].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
}

export function getCatalogId(catalog: RmWorkflowCatalog): number {
	return catalog.catalogId ?? catalog.id;
}

export function getAllCatalogCount(catalogs: RmWorkflowCatalog[], fallbackTotal = 0): number {
	const fromCatalogs = catalogs.reduce((sum, catalog) => sum + (catalog.count ?? 0), 0);
	return fromCatalogs > 0 ? fromCatalogs : fallbackTotal;
}
