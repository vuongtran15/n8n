import { AuthenticatedRequest } from '@n8n/db';
import { Body, Get, GlobalScope, Put, Query, RestController } from '@n8n/decorators';
import { ModuleRegistry } from '@n8n/backend-common';
import type { Response } from 'express';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';

import { UpdateRmWorkflowSettingsDto } from './dto/update-rm-workflow-settings.dto';
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
		return { catalogs: response.value ?? [] };
	}

	@GlobalScope('workflow:read')
	@Get('/workflows')
	async getWorkflows(
		req: AuthenticatedRequest,
		@Query query: {
			search?: string;
			page?: string;
			pageSize?: string;
			catalogId?: string;
		},
	) {
		const page = query.page ? Number.parseInt(query.page, 10) : 1;
		const pageSize = query.pageSize ? Number.parseInt(query.pageSize, 10) : 20;
		const catalogId =
			query.catalogId !== undefined && query.catalogId !== ''
				? Number.parseInt(query.catalogId, 10)
				: undefined;

		const response = await this.portalService.getWorkflows({
			search: query.search?.trim() || undefined,
			page: Number.isFinite(page) ? page : 1,
			pageSize: Number.isFinite(pageSize) ? pageSize : 20,
			catalogId: Number.isFinite(catalogId) ? catalogId : undefined,
			email: req.user.email,
		});

		return {
			items: response.items ?? [],
			total: response.total ?? 0,
			page: response.page ?? page,
			pageSize: response.pageSize ?? pageSize,
			hasNextPage: (response.page ?? page) * (response.pageSize ?? pageSize) < (response.total ?? 0),
			tagFacets: response.tagFacets ?? [],
			catalogFacets: response.catalogFacets ?? [],
		};
	}
}
