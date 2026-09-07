export type RmWorkflowSettings = {
	apiBaseUrl: string;
};

export type RmWorkflowSettingsResponse = RmWorkflowSettings & {
	configured: boolean;
	managedByEnv: boolean;
};

export type RmWorkflowCatalog = {
	id: number;
	catalogId?: number;
	name: string;
	nameVi: string;
	nameZh: string;
	sortOrder: number;
	description: string;
	count?: number;
};

export type RmWorkflowListItem = {
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

export type RmWorkflowListResponse = {
	items: RmWorkflowListItem[];
	total: number;
	page: number;
	pageSize: number;
	hasNextPage: boolean;
	tagFacets: Array<{ tag: string; count: number }>;
	catalogFacets: Array<{
		catalogId: number;
		name: string;
		nameVi: string;
		nameZh: string;
		count: number;
	}>;
};
