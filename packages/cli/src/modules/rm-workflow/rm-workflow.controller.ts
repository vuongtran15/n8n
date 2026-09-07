import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Put, Query, RestController } from '@n8n/decorators';
import { ModuleRegistry } from '@n8n/backend-common';
import type { Response } from 'express';

import { ForbiddenError } from '../../errors/response-errors/forbidden.error';

import { UpdateRmWorkflowSettingsDto } from './dto/update-rm-workflow-settings.dto';
import { ListRmWorkflowsQueryDto } from './dto/list-rm-workflows-query.dto';
import { normalizePortalCatalogs } from './rm-workflow-catalog.utils';
import { RmWorkflowPortalService } from './rm-workflow-portal.service';
import { RmWorkflowSettingsService } from './rm-workflow-settings.service';

@RestController('/rm-workflow')
export class RmWorkflowController {
	constructor(
		private readonly settingsService: RmWorkflowSettingsService,
		private readonly portalService: RmWorkflowPortalService,
		private readonly moduleRegistry: ModuleRegistry,
	) {}

	@GlobalScope('user:update')
	@Get('/settings')
	getSettings(_req: AuthenticatedRequest) {
		return this.settingsService.getSettingsResponse();
	}

	@GlobalScope('user:update')
	@Put('/settings')
	async updateSettings(
		_req: AuthenticatedRequest,
		_res: Response,
		@Body dto: UpdateRmWorkflowSettingsDto,
	) {
		const response = this.settingsService.getSettingsResponse();
		if (response.managedByEnv) {
			throw new ForbiddenError(
				'RM Workflow portal API URL is managed via environment variable and cannot be changed in the UI',
			);
		}

		await this.settingsService.saveSettings(dto);
		await this.moduleRegistry.refreshModuleSettings('rm-workflow');
		return this.settingsService.getSettingsResponse();
	}

	@GlobalScope('workflow:read')
	@Get('/catalogs')
	async getCatalogs(_req: AuthenticatedRequest) {
		const response = await this.portalService.getCatalogs();
		return { catalogs: normalizePortalCatalogs(response) };
	}

	@GlobalScope('workflow:read')
	@Get('/workflows')
	async getWorkflows(
		req: AuthenticatedRequest,
		_res: Response,
		@Query query: ListRmWorkflowsQueryDto,
	) {
		const page = query.page ?? 1;
		const pageSize = query.pageSize ?? 20;

		const response = await this.portalService.getWorkflows({
			search: query.search || undefined,
			page,
			pageSize,
			catalogId: query.catalogId,
			email: req.user.email,
		});

		const items = response.items ?? [];
		const currentPage = response.page ?? page;
		const currentPageSize = response.pageSize ?? pageSize;
		const total = response.total ?? 0;

		return {
			items,
			total,
			page: currentPage,
			pageSize: currentPageSize,
			hasNextPage:
				items.length > 0 &&
				currentPage * currentPageSize < total &&
				items.length >= currentPageSize,
			tagFacets: response.tagFacets ?? [],
			catalogFacets: response.catalogFacets ?? [],
		};
	}
}
