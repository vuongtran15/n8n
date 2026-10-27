import { createComponentRenderer } from '@/__tests__/render';
import type { MockedStore } from '@/__tests__/utils';
import { mockedStore } from '@/__tests__/utils';
import ProjectTabs from './ProjectTabs.vue';
import { createPinia, setActivePinia } from 'pinia';
import { within } from '@testing-library/vue';
import { useProjectsStore } from '../projects.store';
import type { Project } from '../projects.types';
import { useUsersStore } from '@n8n/stores/users.store';

vi.mock('vue-router', async () => {
	const actual = await vi.importActual('vue-router');
	const params = {};
	return {
		...actual,
		useRoute: () => ({
			params,
		}),
	};
});
const renderComponent = createComponentRenderer(ProjectTabs, {
	global: {
		stubs: {
			RouterLink: {
				template: '<div><slot /></div>',
			},
		},
	},
});

describe('ProjectTabs', () => {
	let projectsStore: MockedStore<typeof useProjectsStore>;
	let usersStore: MockedStore<typeof useUsersStore>;
	beforeEach(() => {
		setActivePinia(createPinia());
		projectsStore = mockedStore(useProjectsStore);
		usersStore = mockedStore(useUsersStore);
		Object.defineProperty(usersStore, 'isAdminOrOwner', {
			configurable: true,
			get: () => true,
		});
		vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue(null);
	});

	it('should render home tabs, keeping variables while the project is still loading', async () => {
		const { getByText, queryByText } = renderComponent();

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Executions')).toBeInTheDocument();
		expect(queryByText('Project settings')).not.toBeInTheDocument();
		expect(getByText('Variables')).toBeInTheDocument();
	});

	it('should render project tab Settings', () => {
		const { getByText } = renderComponent({ props: { showSettings: true } });

		expect(getByText('Workflows')).toBeInTheDocument();
		expect(getByText('Credentials')).toBeInTheDocument();
		expect(getByText('Executions')).toBeInTheDocument();
		expect(getByText('Project settings')).toBeInTheDocument();
		expect(getByText('Variables')).toBeInTheDocument();
	});

	it('should not render variables on a public project', () => {
		vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
			id: '1',
			name: 'Public',
			type: 'public',
		} as Project);
		const { queryByText } = renderComponent();

		expect(queryByText('Variables')).not.toBeInTheDocument();
	});

	it('should render overview project tabs with variables', () => {
		const { getByText } = renderComponent({ props: { pageType: 'overview' } });
		expect(getByText('Variables')).toBeInTheDocument();
	});

	it('should render team project tabs with variables', () => {
		vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
			id: '1',
			name: 'default',
			type: 'team',
		} as Project);
		const { getByText } = renderComponent();

		expect(getByText('Variables')).toBeInTheDocument();
	});

	it('should render personal project tabs with variables', () => {
		vi.spyOn(projectsStore, 'currentProject', 'get').mockReturnValue({
			id: '1',
			name: 'Personal',
			type: 'personal',
		} as Project);
		const { getByText } = renderComponent();

		expect(getByText('Variables')).toBeInTheDocument();
	});

	it('should render the preview badge only on preview tabs', () => {
		const { getByTestId, getByText } = renderComponent({
			props: {
				additionalTabs: [{ label: 'Agents', value: 'agents', preview: true }],
			},
		});

		expect(getByText('Agents')).toBeInTheDocument();
		expect(within(getByTestId('tab-agents')).getByText('Preview')).toBeInTheDocument();
		expect(within(getByTestId('tab-WorkflowsView')).queryByText('Preview')).not.toBeInTheDocument();
	});

	it('should hide Variables and Agents tabs for instance Members', () => {
		Object.defineProperty(usersStore, 'isAdminOrOwner', {
			configurable: true,
			get: () => false,
		});
		const { queryByText } = renderComponent({
			props: {
				pageType: 'overview',
				additionalTabs: [{ label: 'Agents', value: 'AgentsListView', preview: true }],
			},
		});

		expect(queryByText('Variables')).not.toBeInTheDocument();
		expect(queryByText('Agents')).not.toBeInTheDocument();
	});

	const getTabValuesInOrder = (container: ParentNode) =>
		Array.from(container.querySelectorAll('[data-test-id^="tab-"]'))
			.map((el) => el.getAttribute('data-test-id')?.replace(/^tab-/, ''))
			.filter((v): v is string => !!v);

	it('should insert an additional tab right after the matching base tab when insertAfter is set', () => {
		const { container } = renderComponent({
			props: {
				pageType: 'overview',
				additionalTabs: [
					{ label: 'Agents', value: 'agents', preview: true, insertAfter: 'WorkflowsView' },
					{ label: 'Data tables', value: 'dataTables' },
				],
			},
		});

		expect(getTabValuesInOrder(container)).toEqual([
			'WorkflowsView',
			'agents',
			'CredentialsView',
			'Executions',
			'HomeVariables',
			'dataTables',
		]);
	});

	it('appends the additional tab when insertAfter does not match any base tab', () => {
		const { container } = renderComponent({
			props: {
				additionalTabs: [{ label: 'Agents', value: 'agents', insertAfter: 'NonExistent' }],
			},
		});

		const tabValues = getTabValuesInOrder(container);
		expect(tabValues[tabValues.length - 1]).toBe('agents');
	});
});
