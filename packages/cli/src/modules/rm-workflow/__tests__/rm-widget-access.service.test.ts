import type { Project, User, UserRepository } from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { UserError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { OwnershipService } from '@/services/ownership.service';

import { RmWidgetAccessService } from '../rm-widget-access.service';
import type { RmWorkflowPortalService } from '../rm-workflow-portal.service';
import type { RmWorkflowSettingsService } from '../rm-workflow-settings.service';

describe('RmWidgetAccessService', () => {
	const ownershipService = mock<OwnershipService>();
	const userRepository = mock<UserRepository>();
	const portalService = mock<RmWorkflowPortalService>();
	const settingsService = mock<RmWorkflowSettingsService>();

	const service = new RmWidgetAccessService(
		mock(),
		ownershipService,
		userRepository,
		portalService,
		settingsService,
	);

	const rmWidgetNode = mock<INode>({ type: 'CUSTOM.rmWidget' });
	const executeWorkflowNode = mock<INode>({ type: 'n8n-nodes-base.executeWorkflow' });

	beforeEach(() => {
		vi.clearAllMocks();
		settingsService.isConfigured.mockReturnValue(true);
		settingsService.loadSettings.mockResolvedValue({ apiBaseUrl: 'http://portal.test' });
	});

	it('skips non-RM-Widget nodes', async () => {
		await service.assertCanUse({
			node: executeWorkflowNode,
			targetWorkflowId: 'target-1',
			parentWorkflowId: 'parent-1',
			userId: 'user-1',
		});

		expect(portalService.canUse).not.toHaveBeenCalled();
		expect(ownershipService.getWorkflowProjectCached).not.toHaveBeenCalled();
	});

	it('allows when caller owns the target personal workflow', async () => {
		userRepository.findOneBy.mockResolvedValue(
			mock<User>({ id: 'user-1', email: 'owner@example.com' }),
		);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'proj-target', type: 'personal' }),
		);
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(
			mock<User>({ id: 'user-1', email: 'owner@example.com' }),
		);

		await service.assertCanUse({
			node: rmWidgetNode,
			targetWorkflowId: 'target-1',
			parentWorkflowId: 'parent-1',
			userId: 'user-1',
		});

		expect(portalService.canUse).not.toHaveBeenCalled();
	});

	it('calls portal can-use when caller does not own the target', async () => {
		userRepository.findOneBy.mockResolvedValue(
			mock<User>({ id: 'user-b', email: 'b@example.com' }),
		);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'proj-a', type: 'personal' }),
		);
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(
			mock<User>({ id: 'user-a', email: 'a@example.com' }),
		);
		portalService.canUse.mockResolvedValue({
			allowed: true,
			workflowId: 'target-1',
			email: 'b@example.com',
			message: 'Được phép sử dụng',
		});

		await service.assertCanUse({
			node: rmWidgetNode,
			targetWorkflowId: 'target-1',
			parentWorkflowId: 'parent-1',
			userId: 'user-b',
		});

		expect(portalService.canUse).toHaveBeenCalledWith({
			workflowId: 'target-1',
			email: 'b@example.com',
		});
	});

	it('blocks when portal returns allowed=false', async () => {
		userRepository.findOneBy.mockResolvedValue(
			mock<User>({ id: 'user-b', email: 'b@example.com' }),
		);
		ownershipService.getWorkflowProjectCached.mockResolvedValue(
			mock<Project>({ id: 'proj-a', type: 'personal' }),
		);
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(
			mock<User>({ id: 'user-a', email: 'a@example.com' }),
		);
		portalService.canUse.mockResolvedValue({
			allowed: false,
			workflowId: 'target-1',
			email: 'b@example.com',
			message: 'Không được phép sử dụng',
		});

		await expect(
			service.assertCanUse({
				node: rmWidgetNode,
				targetWorkflowId: 'target-1',
				parentWorkflowId: 'parent-1',
				userId: 'user-b',
			}),
		).rejects.toBeInstanceOf(UserError);

		await expect(
			service.assertCanUse({
				node: rmWidgetNode,
				targetWorkflowId: 'target-1',
				parentWorkflowId: 'parent-1',
				userId: 'user-b',
			}),
		).rejects.toThrow('Không được phép sử dụng');
	});

	it('uses parent personal owner email when userId is missing', async () => {
		ownershipService.getWorkflowProjectCached
			.mockResolvedValueOnce(mock<Project>({ id: 'proj-parent', type: 'personal' }))
			.mockResolvedValueOnce(mock<Project>({ id: 'proj-target', type: 'personal' }));
		ownershipService.getPersonalProjectOwnerCached
			.mockResolvedValueOnce(mock<User>({ id: 'user-b', email: 'b@example.com' }))
			.mockResolvedValueOnce(mock<User>({ id: 'user-a', email: 'a@example.com' }));
		portalService.canUse.mockResolvedValue({
			allowed: true,
			workflowId: 'target-1',
			email: 'b@example.com',
		});

		await service.assertCanUse({
			node: rmWidgetNode,
			targetWorkflowId: 'target-1',
			parentWorkflowId: 'parent-1',
		});

		expect(portalService.canUse).toHaveBeenCalledWith({
			workflowId: 'target-1',
			email: 'b@example.com',
		});
	});
});
