import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useUsersStore } from '@n8n/stores/users.store';

import { VIEWS } from '@/app/constants';
import { RM_WIDGET_STORE_MODAL_KEY, RM_WORKFLOW_SETTINGS_VIEW } from './constants';

const SettingsRmWorkflowView = async () =>
	await import('./views/SettingsRmWorkflowView.vue');

export const RmWorkflowModule: FrontendModuleDescription = {
	id: 'rm-workflow',
	name: 'RM Workflow',
	description: 'Custom RM Workflow nodes and widget store.',
	icon: 'layers',
	modals: [
		{
			key: RM_WIDGET_STORE_MODAL_KEY,
			component: async () => await import('./components/RMWidgetStoreModal.vue'),
			initialState: {
				open: false,
				data: {
					selectedValue: null,
					onSelect: () => {},
				},
			},
		},
	],
	routes: [
		{
			path: 'rm-workflow',
			name: RM_WORKFLOW_SETTINGS_VIEW,
			component: SettingsRmWorkflowView,
			beforeEnter() {
				const usersStore = useUsersStore();
				return usersStore.isAdminOrOwner || { name: VIEWS.HOMEPAGE };
			},
			meta: {
				layout: 'settings',
				middleware: ['authenticated'],
				telemetry: {
					pageCategory: 'settings',
				},
			},
		},
	],
	settingsPages: [],
};
