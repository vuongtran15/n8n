import { Service } from '@n8n/di';
import { OperationalError } from 'n8n-workflow';

import {
	RM_WORKFLOW_CATALOGS_PATH,
	RM_WORKFLOW_LIST_PATH,
} from './rm-workflow.constants';
import { RmWorkflowSettingsService } from './rm-workflow-settings.service';
import type {
	PortalWorkflowCatalogsResponse,
	PortalWorkflowListResponse,
} from './rm-workflow.types';

@Service()
export class RmWorkflowPortalService {
	constructor(private readonly settingsService: RmWorkflowSettingsService) {}

	async getCatalogs(): Promise<PortalWorkflowCatalogsResponse> {
		const url = this.buildUrl(RM_WORKFLOW_CATALOGS_PATH);
		return await this.getJson<PortalWorkflowCatalogsResponse>(url);
	}

	async getWorkflows(query: {
		search?: string;
		page?: number;
		pageSize?: number;
		catalogId?: number;
		email?: string;
	}): Promise<PortalWorkflowListResponse> {
		const params = new URLSearchParams();
		if (query.search) params.set('search', query.search);
		params.set('page', String(query.page ?? 1));
		params.set('pageSize', String(query.pageSize ?? 20));
		if (query.catalogId !== undefined) params.set('catalogId', String(query.catalogId));
		if (query.email) params.set('email', query.email);

		const url = `${this.buildUrl(RM_WORKFLOW_LIST_PATH)}?${params.toString()}`;
		return await this.getJson<PortalWorkflowListResponse>(url);
	}

	private buildUrl(path: string): string {
		const base = this.settingsService.getApiBaseUrl();
		if (!base) {
			throw new OperationalError(
				'RM Workflow portal API is not configured. Set it in Settings → RM Workflow.',
			);
		}
		return `${base}${path}`;
	}

	private async getJson<T>(url: string): Promise<T> {
		try {
			const response = await fetch(url, {
				method: 'GET',
				headers: { Accept: 'application/json' },
				signal: AbortSignal.timeout(30_000),
			});

			if (!response.ok) {
				throw new OperationalError(
					`RM Workflow portal API returned ${response.status} for ${url}`,
				);
			}

			return (await response.json()) as T;
		} catch (error) {
			if (error instanceof OperationalError) throw error;
			throw new OperationalError(`Failed to reach RM Workflow portal API: ${(error as Error).message}`);
		}
	}
}
