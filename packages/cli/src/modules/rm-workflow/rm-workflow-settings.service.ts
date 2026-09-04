import { SettingsRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';

import { RM_WORKFLOW_SETTINGS_KEY } from './rm-workflow.constants';
import type { RmWorkflowSettings, RmWorkflowSettingsResponse } from './rm-workflow.types';

const ENV_API_BASE_URL = 'RM_WORKFLOW_PORTAL_API_BASE_URL';

@Service()
export class RmWorkflowSettingsService {
	private currentSettings: RmWorkflowSettings | null = null;

	private envManaged = false;

	constructor(private readonly settingsRepository: SettingsRepository) {}

	isConfigured(): boolean {
		return Boolean(this.getApiBaseUrl());
	}

	getApiBaseUrl(): string {
		if (!this.currentSettings) {
			return '';
		}
		return this.currentSettings.apiBaseUrl.trim().replace(/\/$/, '');
	}

	getSettingsResponse(): RmWorkflowSettingsResponse {
		if (!this.currentSettings) {
			throw new Error('RM Workflow settings not yet initialized');
		}

		return {
			...this.currentSettings,
			configured: this.isConfigured(),
			managedByEnv: this.envManaged,
		};
	}

	async loadSettings(): Promise<RmWorkflowSettings> {
		const envUrl = process.env[ENV_API_BASE_URL]?.trim();
		this.envManaged = Boolean(envUrl);

		const persisted = await this.getPersistedSettings();
		const apiBaseUrl = envUrl ?? persisted?.apiBaseUrl ?? '';

		this.currentSettings = { apiBaseUrl };
		return this.currentSettings;
	}

	async saveSettings(incoming: RmWorkflowSettings): Promise<RmWorkflowSettings> {
		if (this.envManaged) {
			this.currentSettings = { apiBaseUrl: process.env[ENV_API_BASE_URL]?.trim() ?? '' };
			return this.currentSettings;
		}

		const sanitized: RmWorkflowSettings = {
			apiBaseUrl: incoming.apiBaseUrl.trim().replace(/\/$/, ''),
		};

		const existing = await this.settingsRepository.findByKey(RM_WORKFLOW_SETTINGS_KEY);
		const value = JSON.stringify(sanitized);

		if (existing) {
			existing.value = value;
			await this.settingsRepository.save(existing, { transaction: false });
		} else {
			await this.settingsRepository.save(
				{ key: RM_WORKFLOW_SETTINGS_KEY, value, loadOnStartup: true },
				{ transaction: false },
			);
		}

		this.currentSettings = sanitized;
		return sanitized;
	}

	private async getPersistedSettings(): Promise<Partial<RmWorkflowSettings> | undefined> {
		const row = await this.settingsRepository.findByKey(RM_WORKFLOW_SETTINGS_KEY);
		if (!row?.value) return undefined;
		return jsonParse<Partial<RmWorkflowSettings>>(row.value, { fallbackValue: undefined });
	}
}
