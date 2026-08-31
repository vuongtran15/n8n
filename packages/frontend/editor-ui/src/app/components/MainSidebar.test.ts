import { reactive } from 'vue';
import { createComponentRenderer } from '@/__tests__/render';
import { createTestingPinia } from '@pinia/testing';
import { type MockedStore, mockedStore } from '@/__tests__/utils';
import { defaultSettings } from '@n8n/frontend-test-utils';
import MainSidebar from '@/app/components/MainSidebar.vue';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { useUIStore } from '@/app/stores/ui.store';
import { useVersionsStore } from '@n8n/stores/versions.store';
import { useUsersStore } from '@n8n/stores/users.store';
import { useTemplatesStore } from '@/features/workflows/templates/templates.store';
import { usePersonalizedTemplatesV2Store } from '@/experiments/templateRecoV2/stores/templateRecoV2.store';
import { usePersonalizedTemplatesV3Store } from '@/experiments/personalizedTemplatesV3/stores/personalizedTemplatesV3.store';
import type { Version } from '@n8n/rest-api-client/api/versions';

const openTopUpMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({
	useRouter: () => ({
		resolve: vi.fn(() => ({ meta: {} })),
	}),
	useRoute: () => reactive({ params: {} }),
	RouterLink: vi.fn(),
}));

vi.mock('@/app/composables/useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: () => ({ openTopUp: openTopUpMock }),
}));

let renderComponent: ReturnType<typeof createComponentRenderer>;
let settingsStore: MockedStore<typeof useSettingsStore>;
let uiStore: MockedStore<typeof useUIStore>;
let versionsStore: MockedStore<typeof useVersionsStore>;
let usersStore: MockedStore<typeof useUsersStore>;
let templatesStore: MockedStore<typeof useTemplatesStore>;
let personalizedTemplatesV2Store: MockedStore<typeof usePersonalizedTemplatesV2Store>;
let personalizedTemplatesV3Store: MockedStore<typeof usePersonalizedTemplatesV3Store>;

const mockVersion: Version = {
	name: '1.2.0',
	nodes: [],
	createdAt: '2025-01-01T00:00:00Z',
	description: 'Test version',
	documentationUrl: 'https://docs.n8n.io',
	hasBreakingChange: false,
	hasSecurityFix: false,
	hasSecurityIssue: false,
	securityIssueFixVersion: '',
};

describe('MainSidebar', () => {
	beforeEach(() => {
		openTopUpMock.mockReset();
		renderComponent = createComponentRenderer(MainSidebar, {
			pinia: createTestingPinia(),
		});
		settingsStore = mockedStore(useSettingsStore);
		uiStore = mockedStore(useUIStore);
		versionsStore = mockedStore(useVersionsStore);
		usersStore = mockedStore(useUsersStore);
		templatesStore = mockedStore(useTemplatesStore);
		personalizedTemplatesV2Store = mockedStore(usePersonalizedTemplatesV2Store);
		personalizedTemplatesV3Store = mockedStore(usePersonalizedTemplatesV3Store);

		settingsStore.settings = defaultSettings;

		// Default store values
		versionsStore.hasVersionUpdates = false;
		versionsStore.nextVersions = [];
		usersStore.canUserUpdateVersion = true;
		uiStore.sidebarMenuCollapsed = false;
		settingsStore.isTemplatesEnabled = true;
		templatesStore.hasCustomTemplatesHost = false;
		templatesStore.websiteTemplateRepositoryURL = 'https://n8n.io/workflows';

		// Default experiment store values
		personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);
		personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => false);
	});

	it('renders the sidebar without error', () => {
		expect(() => renderComponent()).not.toThrow();
	});

	describe('Version Update CTA', () => {
		it('should not render version update CTA when hasVersionUpdates is false', () => {
			versionsStore.hasVersionUpdates = false;
			usersStore.canUserUpdateVersion = true;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('version-update-cta-button')).not.toBeInTheDocument();
		});

		it('should not render version update CTA when help menu is hidden', async () => {
			versionsStore.hasVersionUpdates = true;
			versionsStore.nextVersions = [mockVersion];
			usersStore.canUserUpdateVersion = true;

			const { queryByTestId } = renderComponent();

			expect(queryByTestId('version-update-cta-button')).not.toBeInTheDocument();
			expect(queryByTestId('main-sidebar-help')).not.toBeInTheDocument();
		});
	});

	describe('mainMenuItems', () => {
		it('should show templates menu when templates are enabled and no experiment is active', () => {
			settingsStore.isTemplatesEnabled = true;
			templatesStore.hasCustomTemplatesHost = false;
			personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);
			personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => false);

			const { getAllByTestId } = renderComponent();

			// Should have at least one templates item visible
			const templatesItems = getAllByTestId('main-sidebar-templates');
			expect(templatesItems.length).toBeGreaterThan(0);
		});

		it('should show templates menu when experiment is enabled', () => {
			settingsStore.isTemplatesEnabled = true;
			personalizedTemplatesV3Store.isFeatureEnabled = vi.fn(() => true);
			personalizedTemplatesV2Store.isFeatureEnabled = vi.fn(() => false);

			const { getAllByTestId } = renderComponent();

			// Should have templates item visible when experiment is enabled
			const templatesItems = getAllByTestId('main-sidebar-templates');
			expect(templatesItems.length).toBeGreaterThan(0);
		});

		it('should not show templates menu when templates are disabled', () => {
			settingsStore.isTemplatesEnabled = false;

			const { queryAllByTestId } = renderComponent();

			// Should have no templates items when templates are disabled
			const templatesItems = queryAllByTestId('main-sidebar-templates');
			expect(templatesItems).toHaveLength(0);
		});

		it('should not show help menu item', () => {
			const { queryByTestId } = renderComponent();

			expect(queryByTestId('main-sidebar-help')).not.toBeInTheDocument();
		});

		it('should show settings menu item', () => {
			const { getByTestId } = renderComponent();

			expect(getByTestId('main-sidebar-settings')).toBeInTheDocument();
		});
	});

	describe('handleSelect', () => {
		beforeEach(() => {
			uiStore.openModal = vi.fn();
			uiStore.openModalWithData = vi.fn();
			personalizedTemplatesV3Store.markTemplateRecommendationInteraction = vi.fn();
		});

		it('should open the top-up flow when n8n credits is selected', async () => {
			settingsStore.settings = {
				...defaultSettings,
				aiGateway: {
					enabled: true,
					budget: 0,
					cloudUbbEnabled: true,
				},
			};

			const { getByText, findByText } = renderComponent();

			getByText('Settings').click();
			const creditsItem = await findByText('n8n credits');
			creditsItem.click();

			expect(openTopUpMock).toHaveBeenCalledWith({ source: 'settings_page' });
		});
	});
});
