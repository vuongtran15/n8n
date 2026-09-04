import type { ModuleInterface } from '@n8n/decorators';
import { BackendModule } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

@BackendModule({
	name: 'rm-workflow',
	instanceTypes: ['main'],
})
export class RmWorkflowModule implements ModuleInterface {
	async init() {
		if (Container.get(InstanceSettings).instanceType !== 'main') {
			return;
		}

		const { RmWorkflowSettingsService } = await import('./rm-workflow-settings.service.js');
		await Container.get(RmWorkflowSettingsService).loadSettings();

		await import('./rm-workflow.controller.js');
	}

	async settings() {
		const { RmWorkflowSettingsService } = await import('./rm-workflow-settings.service.js');
		const service = Container.get(RmWorkflowSettingsService);
		if (!service.isConfigured()) {
			await service.loadSettings();
		}
		return {
			configured: service.isConfigured(),
		};
	}
}
