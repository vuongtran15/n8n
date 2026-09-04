import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useSettingsStore } from '@n8n/stores/settings.store';

import {
	fetchRmWorkflowCatalogs,
	fetchRmWorkflowList,
	fetchRmWorkflowSettings,
	updateRmWorkflowSettings,
} from './rmWorkflow.api';
import type {
	RmWorkflowCatalog,
	RmWorkflowListItem,
	RmWorkflowSettingsResponse,
} from './rmWorkflow.types';
import { RM_WORKFLOW_STORE } from './constants';

export const useRmWorkflowStore = defineStore(RM_WORKFLOW_STORE, () => {
	const rootStore = useRootStore();
	const settingsStore = useSettingsStore();

	const settings = ref<RmWorkflowSettingsResponse | null>(null);
	const catalogs = ref<RmWorkflowCatalog[]>([]);

	const isConfigured = () =>
		Boolean(settingsStore.moduleSettings['rm-workflow']?.configured ?? settings.value?.configured);

	async function loadSettings() {
		settings.value = await fetchRmWorkflowSettings(rootStore.restApiContext);
		return settings.value;
	}

	async function saveSettings(apiBaseUrl: string) {
		settings.value = await updateRmWorkflowSettings(rootStore.restApiContext, { apiBaseUrl });
		await settingsStore.getModuleSettings();
		return settings.value;
	}

	async function loadCatalogs() {
		const response = await fetchRmWorkflowCatalogs(rootStore.restApiContext);
		catalogs.value = response.catalogs;
		return catalogs.value;
	}

	async function loadWorkflows(query: {
		search?: string;
		page?: number;
		pageSize?: number;
		catalogId?: number;
	}) {
		return await fetchRmWorkflowList(rootStore.restApiContext, query);
	}

	return {
		settings,
		catalogs,
		isConfigured,
		loadSettings,
		saveSettings,
		loadCatalogs,
		loadWorkflows,
	};
});

export type { RmWorkflowListItem };
