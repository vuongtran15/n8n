export type RmWorkflowSettings = {
	apiBaseUrl: string;
};

export type RmWorkflowSettingsResponse = RmWorkflowSettings & {
	configured: boolean;
	managedByEnv: boolean;
};

export type PortalWorkflowCatalog = {
	id: number;
	name: string;
	nameVi: string;
	nameZh: string;
	sortOrder: number;
	description: string;
};

export type PortalWorkflowCatalogsResponse = {
	value: PortalWorkflowCatalog[];
	Count?: number;
};

export type PortalWorkflowItem = {
	id: number;
	n8nWorkflowId: string;
	name: string;
	catalogId: number;
	catalogName: string;
	catalogNameVi: string;
	catalogNameZh: string;
	description: string;
	tags: string[];
	sortOrder: number;
};

export type PortalWorkflowListResponse = {
	items: PortalWorkflowItem[];
	total: number;
	page: number;
	pageSize: number;
	catalogFacets?: Array<{
		catalogId: number;
		name: string;
		nameVi: string;
		nameZh: string;
		count: number;
	}>;
	tagFacets?: Array<{ tag: string; count: number }>;
	totalActive?: number;
};
