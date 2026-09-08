import { Logger } from '@n8n/backend-common';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';

import { OwnershipService } from '@/services/ownership.service';

import { RM_WIDGET_NODE_TYPE } from './rm-workflow.constants';
import { RmWorkflowPortalService } from './rm-workflow-portal.service';
import { RmWorkflowSettingsService } from './rm-workflow-settings.service';

type AssertCanUseParams = {
	node?: INode;
	targetWorkflowId: string;
	parentWorkflowId: string;
	userId?: string;
};

@Service()
export class RmWidgetAccessService {
	constructor(
		private readonly logger: Logger,
		private readonly ownershipService: OwnershipService,
		private readonly userRepository: UserRepository,
		private readonly portalService: RmWorkflowPortalService,
		private readonly settingsService: RmWorkflowSettingsService,
	) {}

	/**
	 * For RM Widget only: own workflows pass; others must be allowed by portal can-use.
	 * No-op for every other node type (Execute Workflow, etc.).
	 */
	async assertCanUse({
		node,
		targetWorkflowId,
		parentWorkflowId,
		userId,
	}: AssertCanUseParams): Promise<void> {
		if (!this.isRmWidgetNode(node) || !targetWorkflowId) {
			return;
		}

		const caller = await this.resolveCaller(userId, parentWorkflowId);
		if (!caller?.email) {
			throw new UserError(
				'RM Widget cannot verify access: missing caller email. Sign in or own the parent workflow in a personal project.',
			);
		}

		if (await this.isOwnedByCaller(targetWorkflowId, caller)) {
			this.logger.debug('RM Widget access allowed (caller owns target workflow)', {
				targetWorkflowId,
				email: caller.email,
			});
			return;
		}

		if (!this.settingsService.isConfigured()) {
			await this.settingsService.loadSettings();
		}
		if (!this.settingsService.isConfigured()) {
			throw new UserError(
				'RM Widget access check requires the portal API. Set it in Settings → RM Workflow.',
			);
		}

		const result = await this.portalService.canUse({
			workflowId: targetWorkflowId,
			email: caller.email,
		});

		if (!result.allowed) {
			throw new UserError(
				result.message?.trim() ||
					`You are not allowed to use workflow ${targetWorkflowId} via RM Widget`,
			);
		}

		this.logger.debug('RM Widget access allowed (portal can-use)', {
			targetWorkflowId,
			email: caller.email,
		});
	}

	private isRmWidgetNode(node?: INode): boolean {
		const type = node?.type;
		if (!type) return false;
		return type === RM_WIDGET_NODE_TYPE || type.endsWith('.rmWidget');
	}

	private async resolveCaller(
		userId: string | undefined,
		parentWorkflowId: string,
	): Promise<{ id?: string; email: string } | null> {
		if (userId) {
			const user = await this.userRepository.findOneBy({ id: userId });
			if (user?.email) {
				return { id: user.id, email: user.email };
			}
		}

		try {
			const parentProject =
				await this.ownershipService.getWorkflowProjectCached(parentWorkflowId);
			if (parentProject.type !== 'personal') {
				return null;
			}
			const owner = await this.ownershipService.getPersonalProjectOwnerCached(parentProject.id);
			if (!owner?.email) {
				return null;
			}
			return { id: owner.id, email: owner.email };
		} catch {
			return null;
		}
	}

	private async isOwnedByCaller(
		targetWorkflowId: string,
		caller: { id?: string; email: string },
	): Promise<boolean> {
		try {
			const project = await this.ownershipService.getWorkflowProjectCached(targetWorkflowId);
			if (project.type !== 'personal') {
				return false;
			}
			const owner = await this.ownershipService.getPersonalProjectOwnerCached(project.id);
			if (!owner) {
				return false;
			}
			if (caller.id && owner.id === caller.id) {
				return true;
			}
			return owner.email.toLowerCase() === caller.email.toLowerCase();
		} catch {
			return false;
		}
	}
}
