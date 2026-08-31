import { computed, ref } from 'vue';

import { useSettingsItems } from './useSettingsItems';
import { VIEWS } from '../constants';

const isAiGatewayCloudUbbEnabled = ref(false);
const isAiGatewayEnabled = ref(true);
const balance = ref<number>();
const isAdminOrOwner = ref(false);
const openTopUpMock = vi.hoisted(() => vi.fn());

vi.mock('vue-router', () => ({ useRouter: vi.fn(() => ({})) }));
vi.mock('./useUserHelpers', () => ({
	useUserHelpers: vi.fn(() => ({ canUserAccessRouteByName: vi.fn(() => true) })),
}));
vi.mock('./useAiGateway', () => ({
	useAiGateway: vi.fn(() => ({ balance: computed(() => balance.value) })),
}));
vi.mock('./useAiGatewayTopUp', () => ({
	useAiGatewayTopUp: vi.fn(() => ({ openTopUp: openTopUpMock })),
}));
vi.mock('@n8n/i18n', () => ({ useI18n: vi.fn(() => ({ baseText: (key: string) => key })) }));
vi.mock('../stores/ui.store', () => ({ useUIStore: vi.fn(() => ({ settingsSidebarItems: [] })) }));
vi.mock('@n8n/stores/settings.store', () => ({
	useSettingsStore: vi.fn(() => ({
		isAiAssistantEnabled: true,
		get isAiGatewayEnabled() {
			return isAiGatewayEnabled.value;
		},
		get isAiGatewayCloudUbbEnabled() {
			return isAiGatewayCloudUbbEnabled.value;
		},
		isPublicApiEnabled: true,
		isQueueModeEnabled: false,
		isModuleActive: vi.fn(() => false),
	})),
}));
vi.mock('@n8n/stores/users.store', () => ({
	useUsersStore: vi.fn(() => ({
		get isAdminOrOwner() {
			return isAdminOrOwner.value;
		},
	})),
}));
vi.mock('../utils/rbac/permissions', () => ({ hasPermission: vi.fn(() => false) }));
vi.mock('@/features/shared/envFeatureFlag/useEnvFeatureFlag', () => ({
	useEnvFeatureFlag: vi.fn(() => ({ check: computed(() => () => false) })),
}));

describe('useSettingsItems', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		isAdminOrOwner.value = false;
		isAiGatewayEnabled.value = true;
		isAiGatewayCloudUbbEnabled.value = false;
		balance.value = undefined;
	});

	it('links to the n8n Connect settings page for the legacy cohort', () => {
		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toMatchObject({
			label: 'settings.n8nConnect',
			route: { to: { name: VIEWS.AI_GATEWAY_SETTINGS } },
		});
	});

	it('shows n8n credits with the balance and no internal route for Cloud UBB', () => {
		isAiGatewayCloudUbbEnabled.value = true;
		balance.value = 1.23;

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toMatchObject({
			label: 'settings.n8nCredits',
			creditsTag: 'aiGateway.wallet.balanceRemaining',
		});
		expect(item?.route).toBeUndefined();
	});

	it('hides n8n credits when AI Gateway is disabled', () => {
		isAiGatewayEnabled.value = false;
		isAiGatewayCloudUbbEnabled.value = true;

		const item = useSettingsItems().settingsItems.value.find(
			({ id }) => id === 'settings-n8n-connect',
		);

		expect(item).toBeUndefined();
	});

	it('opens the top-up flow only for the Cloud UBB credits item', async () => {
		const { handleSettingsItemSelect } = useSettingsItems();

		await handleSettingsItemSelect('settings-n8n-connect');
		expect(openTopUpMock).not.toHaveBeenCalled();

		isAiGatewayCloudUbbEnabled.value = true;
		await handleSettingsItemSelect('settings-users');
		expect(openTopUpMock).not.toHaveBeenCalled();

		await handleSettingsItemSelect('settings-n8n-connect');
		expect(openTopUpMock).toHaveBeenCalledWith({ source: 'settings_page' });
	});

	it('hides usage, API, MCP, and AI Assistant settings items for members', () => {
		const ids = useSettingsItems().settingsItems.value.map((item) => item.id);

		expect(ids).not.toContain('settings-usage-and-plan');
		expect(ids).not.toContain('settings-api');
		expect(ids).not.toContain('settings-mcp');
		expect(ids).not.toContain('settings-instance-ai');
		expect(ids).toContain('settings-personal');
	});

	it('keeps usage, API, MCP, and AI Assistant settings items for admins and owners', () => {
		isAdminOrOwner.value = true;

		const ids = useSettingsItems().settingsItems.value.map((item) => item.id);

		expect(ids).toContain('settings-usage-and-plan');
		expect(ids).toContain('settings-api');
		expect(ids).toContain('settings-personal');
	});
});
