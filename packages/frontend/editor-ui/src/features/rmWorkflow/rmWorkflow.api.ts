import type { IRestApiContext } from '@n8n/rest-api-client';
import { makeRestApiRequest } from '@n8n/rest-api-client';

import type {
	RmWorkflowCatalog,
	RmWorkflowListResponse,
	RmWorkflowSettings,
	RmWorkflowSettingsResponse,
} from './rmWorkflow.types';

export async function fetchRmWorkflowSettings(
	context: IRestApiContext,
): Promise<RmWorkflowSettingsResponse> {
	return await makeRestApiRequest(context, 'GET', '/rm-workflow/settings');
}

export async function updateRmWorkflowSettings(
	context: IRestApiContext,
	settings: RmWorkflowSettings,
): Promise<RmWorkflowSettingsResponse> {
	return await makeRestApiRequest(context, 'PUT', '/rm-workflow/settings', settings);
}

export async function fetchRmWorkflowCatalogs(
	context: IRestApiContext,
): Promise<{ catalogs: RmWorkflowCatalog[] }> {
	return await makeRestApiRequest(context, 'GET', '/rm-workflow/catalogs');
}

export async function fetchRmWorkflowList(
	context: IRestApiContext,
	query: {
		search?: string;
		page?: number;
		pageSize?: number;
		catalogId?: number;
	},
): Promise<RmWorkflowListResponse> {
	const params = new URLSearchParams();
	if (query.search) params.set('search', query.search);
	if (query.page !== undefined) params.set('page', String(query.page));
	if (query.pageSize !== undefined) params.set('pageSize', String(query.pageSize));
	if (query.catalogId !== undefined) params.set('catalogId', String(query.catalogId));

	const qs = params.toString();
	const endpoint = qs ? `/rm-workflow/workflows?${qs}` : '/rm-workflow/workflows';
	return await makeRestApiRequest(context, 'GET', endpoint);
}
