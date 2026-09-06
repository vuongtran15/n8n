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

type CatalogFacetLike = {
	catalogId: number;
	name: string;
	nameVi: string;
	nameZh: string;
	count: number;
};

type CatalogItemLike = {
	catalogId: number;
	catalogName: string;
	catalogNameVi: string;
	catalogNameZh: string;
};

export function mergeCatalogSources(options: {
	catalogs: RmWorkflowCatalog[];
	facets: CatalogFacetLike[];
	items: CatalogItemLike[];
}): Array<{
	id: number;
	name: string;
	nameVi: string;
	nameZh: string;
	sortOrder: number;
	count: number;
}> {
	const byId = new Map<
		number,
		{
			id: number;
			name: string;
			nameVi: string;
			nameZh: string;
			sortOrder: number;
			count: number;
		}
	>();

	for (const catalog of options.catalogs) {
		byId.set(catalog.id, {
			id: catalog.id,
			name: catalog.name,
			nameVi: catalog.nameVi,
			nameZh: catalog.nameZh,
			sortOrder: catalog.sortOrder,
			count: 0,
		});
	}

	for (const facet of options.facets) {
		const existing = byId.get(facet.catalogId);
		if (existing) {
			existing.count = facet.count;
			if (!existing.name) existing.name = facet.name;
			if (!existing.nameVi) existing.nameVi = facet.nameVi;
			if (!existing.nameZh) existing.nameZh = facet.nameZh;
		} else {
			byId.set(facet.catalogId, {
				id: facet.catalogId,
				name: facet.name,
				nameVi: facet.nameVi,
				nameZh: facet.nameZh,
				sortOrder: Number.MAX_SAFE_INTEGER,
				count: facet.count,
			});
		}
	}

	if (options.facets.length === 0) {
		for (const item of options.items) {
			const existing = byId.get(item.catalogId);
			if (existing) {
				existing.count += 1;
			} else {
				byId.set(item.catalogId, {
					id: item.catalogId,
					name: item.catalogName,
					nameVi: item.catalogNameVi,
					nameZh: item.catalogNameZh,
					sortOrder: Number.MAX_SAFE_INTEGER,
					count: 1,
				});
			}
		}
	}

	return [...byId.values()].sort(
		(a, b) => a.sortOrder - b.sortOrder || a.id - b.id || a.name.localeCompare(b.name),
	);
}

export function matchesWidgetSearch(
	widget: CatalogItemLike & {
		name: string;
		description?: string;
		tags?: string[];
	},
	query: string,
): boolean {
	const normalizedQuery = query.trim().toLowerCase();
	if (!normalizedQuery) {
		return true;
	}

	const searchableText = [
		widget.name,
		widget.description,
		widget.catalogName,
		widget.catalogNameVi,
		widget.catalogNameZh,
		...(widget.tags ?? []),
	]
		.filter(Boolean)
		.join(' ')
		.toLowerCase();

	return searchableText.includes(normalizedQuery);
}

export function matchesWidgetCatalog(
	widget: CatalogItemLike,
	catalogId: number,
	catalog?: Pick<RmWorkflowCatalog, 'name' | 'nameVi' | 'nameZh'>,
): boolean {
	if (widget.catalogId === catalogId) {
		return true;
	}

	if (!catalog) {
		return false;
	}

	const catalogNames = [catalog.name, catalog.nameVi, catalog.nameZh].filter(Boolean);
	const widgetCatalogNames = [
		widget.catalogName,
		widget.catalogNameVi,
		widget.catalogNameZh,
	].filter(Boolean);

	return catalogNames.some((name) => widgetCatalogNames.includes(name));
}

export function filterWidgetItems(
	items: Array<
		CatalogItemLike & {
			name: string;
			description?: string;
			tags?: string[];
		}
	>,
	options: {
		catalogId?: number;
		catalog?: Pick<RmWorkflowCatalog, 'name' | 'nameVi' | 'nameZh'>;
		search?: string;
	},
): typeof items {
	let result = items;

	if (options.catalogId !== undefined) {
		result = result.filter((item) =>
			matchesWidgetCatalog(item, options.catalogId!, options.catalog),
		);
	}

	const search = options.search?.trim();
	if (search) {
		result = result.filter((item) => matchesWidgetSearch(item, search));
	}

	return result;
}
