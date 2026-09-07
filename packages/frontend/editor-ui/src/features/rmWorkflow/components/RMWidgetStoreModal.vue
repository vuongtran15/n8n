<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import Modal from '@/app/components/Modal.vue';
import { createEventBus } from '@n8n/utils/event-bus';
import { useI18n } from '@n8n/i18n';
import { useDebounceFn } from '@vueuse/core';
import { useToast } from '@n8n/composables/useToast';
import {
	N8nButton,
	N8nHeading,
	N8nIcon,
	N8nInput,
	N8nLoading,
	N8nText,
} from '@n8n/design-system';
import { RM_WIDGET_STORE_MODAL_KEY } from '../constants';
import { useRmWorkflowStore } from '../rmWorkflow.store';
import type { RmWorkflowListItem } from '../rmWorkflow.types';
import {
	getAllCatalogCount,
	getCatalogDisplayName,
	getCatalogId,
	getSortedCatalogs,
} from '../rmWorkflow.utils';

const props = defineProps<{
	modalName: string;
	data: {
		selectedValue: string | null;
		onSelect: (workflowId: string, name: string) => void;
	};
}>();

const modalBus = ref(createEventBus());
const i18n = useI18n();
const toast = useToast();
const rmWorkflowStore = useRmWorkflowStore();

const searchQuery = ref('');
const selectedCatalogId = ref<string>('all');
const page = ref(1);
const pageSize = 24;

const items = ref<RmWorkflowListItem[]>([]);
const total = ref(0);
const hasNextPage = ref(false);
const isLoading = ref(false);
const isLoadingMore = ref(false);
const loadError = ref<string | null>(null);
const loadRequestId = ref(0);

const locale = computed(() => i18n.locale);

const catalogNavItems = computed(() => {
	const navItems = [
		{
			value: 'all',
			label: i18n.baseText('rmWorkflow.widgetStore.catalogs.all'),
			count: getAllCatalogCount(rmWorkflowStore.catalogs, total.value),
		},
	];

	for (const catalog of getSortedCatalogs(rmWorkflowStore.catalogs)) {
		navItems.push({
			value: String(getCatalogId(catalog)),
			label: getCatalogDisplayName(catalog, locale.value),
			count: catalog.count ?? 0,
		});
	}

	return navItems;
});

const selectedCatalogNumericId = computed(() => {
	if (selectedCatalogId.value === 'all') {
		return undefined;
	}

	const catalogId = Number.parseInt(selectedCatalogId.value, 10);
	return Number.isFinite(catalogId) ? catalogId : undefined;
});

function getWidgetCatalogName(widget: RmWorkflowListItem): string {
	return getCatalogDisplayName(
		{
			name: widget.catalogName,
			nameVi: widget.catalogNameVi,
			nameZh: widget.catalogNameZh,
		},
		locale.value,
	);
}

async function loadPage(nextPage: number, append: boolean) {
	const requestId = ++loadRequestId.value;

	if (append) {
		isLoadingMore.value = true;
	} else {
		isLoading.value = true;
		loadError.value = null;
	}

	try {
		const response = await rmWorkflowStore.loadWorkflows({
			search: searchQuery.value.trim() || undefined,
			page: nextPage,
			pageSize,
			catalogId: selectedCatalogNumericId.value,
		});

		if (requestId !== loadRequestId.value) {
			return;
		}

		items.value = append ? [...items.value, ...response.items] : response.items;
		total.value = response.total;
		hasNextPage.value = response.hasNextPage;
		page.value = response.page;
	} catch (error) {
		if (requestId !== loadRequestId.value) {
			return;
		}

		loadError.value = (error as Error).message;
		if (!append) {
			items.value = [];
			total.value = 0;
			hasNextPage.value = false;
		}
		toast.showError(error as Error, i18n.baseText('rmWorkflow.widgetStore.loadError'));
	} finally {
		if (requestId === loadRequestId.value) {
			isLoading.value = false;
			isLoadingMore.value = false;
		}
	}
}

const reloadFromStart = useDebounceFn(async () => {
	page.value = 1;
	await loadPage(1, false);
}, 300);

watch(searchQuery, () => {
	void reloadFromStart();
});

function selectCatalog(catalogId: string) {
	if (selectedCatalogId.value === catalogId) {
		return;
	}

	selectedCatalogId.value = catalogId;
	page.value = 1;
	items.value = [];
	void loadPage(1, false);
}

onMounted(async () => {
	try {
		await rmWorkflowStore.loadCatalogs();
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('rmWorkflow.widgetStore.catalogLoadError'));
	}
	await loadPage(1, false);
});

function onSelect(widget: RmWorkflowListItem) {
	props.data.onSelect(widget.n8nWorkflowId, widget.name);
	modalBus.value.emit('close');
}

async function loadMore() {
	if (!hasNextPage.value || isLoadingMore.value) return;
	await loadPage(page.value + 1, true);
}
</script>

<template>
	<Modal
		:name="RM_WIDGET_STORE_MODAL_KEY"
		:event-bus="modalBus"
		width="94%"
		:center="true"
		max-width="1320px"
		min-height="480px"
		max-height="88vh"
		:scrollable="false"
		:custom-class="$style.modal"
	>
		<template #header>
			<div :class="$style.header">
				<N8nHeading size="medium" tag="h2">
					{{ i18n.baseText('rmWorkflow.widgetStore.title') }}
				</N8nHeading>
				<N8nText size="small" color="text-light">
					{{ i18n.baseText('rmWorkflow.widgetStore.subtitle') }}
				</N8nText>
			</div>
		</template>

		<template #content>
			<div :class="$style.layout">
				<aside :class="$style.sidebar">
					<div :class="$style.sidebarTitle">
						{{ i18n.baseText('rmWorkflow.widgetStore.catalogSidebarTitle') }}
					</div>
					<nav :class="$style.catalogNav">
						<button
							v-for="item in catalogNavItems"
							:key="item.value"
							type="button"
							:class="[
								$style.catalogNavItem,
								{ [$style.catalogNavItemActive]: selectedCatalogId === item.value },
							]"
							@click="selectCatalog(item.value)"
						>
							<span :class="$style.catalogNavLabel">{{ item.label }}</span>
							<span :class="$style.catalogCount">{{ item.count }}</span>
						</button>
					</nav>
				</aside>

				<div :class="$style.mainPanel">
					<div :class="$style.searchRow">
						<N8nInput
							v-model="searchQuery"
							size="small"
							:placeholder="i18n.baseText('rmWorkflow.widgetStore.searchPlaceholder')"
							clearable
							:class="$style.searchInput"
						>
							<template #prefix>
								<N8nIcon icon="search" />
							</template>
						</N8nInput>
					</div>

					<div :class="$style.resultsPanel">
						<div v-if="isLoading && items.length === 0" :class="$style.loading">
							<N8nLoading :loading="true" :rows="1" />
						</div>

						<div v-else-if="loadError && items.length === 0" :class="$style.empty">
							<N8nText color="text-light">{{ loadError }}</N8nText>
						</div>

						<div v-else-if="items.length === 0" :class="$style.empty">
							<N8nText color="text-light">
								{{ i18n.baseText('rmWorkflow.widgetStore.empty') }}
							</N8nText>
						</div>

						<template v-else>
							<div :class="[$style.grid, { [$style.gridLoading]: isLoading }]">
								<button
									v-for="widget in items"
									:key="`${widget.id}-${widget.n8nWorkflowId}`"
									type="button"
									:class="[
										$style.widgetCard,
										{ [$style.selected]: widget.n8nWorkflowId === data.selectedValue },
									]"
									@click="onSelect(widget)"
								>
									<div :class="$style.cardTop">
										<span :class="$style.statusBadge">
											{{ i18n.baseText('rmWorkflow.widgetStore.statusActive') }}
										</span>
										<span :class="$style.categoryLabel">{{ getWidgetCatalogName(widget) }}</span>
									</div>

									<div :class="$style.cardBody">
										<N8nText size="small" bold tag="div" :class="$style.widgetName">
											{{ widget.name }}
										</N8nText>
									</div>

									<div :class="$style.cardFooter">
										<template v-if="widget.tags?.length">
											<span
												v-for="tag in widget.tags.slice(0, 3)"
												:key="tag"
												:class="$style.tagPill"
											>
												{{ tag }}
											</span>
										</template>
										<span
											v-else-if="widget.description"
											:class="$style.tagPill"
										>
											{{ widget.description }}
										</span>
									</div>
								</button>
							</div>

							<div :class="$style.pagination">
								<N8nText size="small" color="text-light">
									{{
										i18n.baseText('rmWorkflow.widgetStore.resultCount', {
											interpolate: {
												shown: String(items.length),
												total: String(total),
											},
										})
									}}
								</N8nText>
								<N8nButton
									v-if="hasNextPage"
									size="small"
									variant="subtle"
									:loading="isLoadingMore"
									@click="loadMore"
								>
									{{ i18n.baseText('rmWorkflow.widgetStore.loadMore') }}
								</N8nButton>
							</div>
						</template>
					</div>
				</div>
			</div>
		</template>
	</Modal>
</template>

<style lang="scss" module>
.header {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
}

.layout {
	display: flex;
	min-height: 420px;
	max-height: calc(88vh - 120px);
}

.sidebar {
	flex: 0 0 220px;
	display: flex;
	flex-direction: column;
	border-right: 1px solid var(--color--foreground--tint-1);
	background: var(--color--neutral-white);
	padding: var(--spacing--sm) 0;
}

.sidebarTitle {
	padding: 0 var(--spacing--sm) var(--spacing--xs);
	color: var(--color--text--tint-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	letter-spacing: 0.06em;
	text-transform: uppercase;
}

.catalogNav {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--5xs);
	padding: 0 var(--spacing--2xs);
	overflow-y: auto;
}

.catalogNavItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	width: 100%;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: none;
	border-radius: var(--radius--3xs);
	background: transparent;
	color: var(--color--text--shade-1);
	font-size: var(--font-size--2xs);
	text-align: left;
	cursor: pointer;

	&:hover {
		background: var(--color--foreground--tint-2);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 1px;
	}
}

.catalogNavItemActive {
	background: var(--background--info);
	color: var(--color--text--shade-2);
	font-weight: var(--font-weight--medium);
}

.catalogNavLabel {
	flex: 1;
	min-width: 0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.catalogCount {
	flex-shrink: 0;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	min-width: 22px;
	height: 22px;
	padding: 0 var(--spacing--4xs);
	border-radius: var(--radius--pill);
	background: var(--color--foreground--tint-2);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--medium);
	line-height: 1;
}

.catalogNavItemActive .catalogCount {
	background: var(--color--neutral-white);
}

.mainPanel {
	flex: 1;
	display: flex;
	flex-direction: column;
	min-width: 0;
	background: var(--color--neutral-white);
}

.searchRow {
	padding: var(--spacing--sm);
	border-bottom: 1px solid var(--color--foreground--tint-1);
}

.searchInput {
	width: 100%;
}

.resultsPanel {
	flex: 1;
	overflow-y: auto;
	padding: var(--spacing--sm);
}

.grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: var(--spacing--sm);
}

.gridLoading {
	opacity: 0.55;
	pointer-events: none;
}

.widgetCard {
	display: flex;
	flex-direction: column;
	width: 100%;
	height: 120px;
	padding: 0;
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--3xs);
	background: var(--color--neutral-white);
	box-shadow: 0 1px 4px rgb(0 0 0 / 5%);
	cursor: pointer;
	text-align: left;
	overflow: hidden;
	transition:
		border-color 0.15s ease,
		box-shadow 0.15s ease;

	&:hover {
		border-color: var(--color--foreground--shade-1);
		box-shadow: 0 4px 12px rgb(0 0 0 / 8%);
	}

	&:focus-visible {
		outline: 2px solid var(--color--primary);
		outline-offset: 1px;
	}
}

.selected {
	border-color: var(--color--primary);
	box-shadow: 0 0 0 1px var(--color--primary);
}

.modal {
	:global(.el-dialog__header) {
		background: var(--background--info);
		border-bottom: 1px solid var(--border-color--info);
		margin: 0;
		padding: var(--spacing--sm) var(--spacing--md);
	}

	:global(.el-dialog__body) {
		padding: 0;
		background: var(--color--neutral-white);
	}
}

.cardTop {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: var(--spacing--2xs);
	flex-shrink: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	background: var(--color--neutral-white);
}

.statusBadge {
	display: inline-flex;
	align-items: center;
	padding: 0 var(--spacing--3xs);
	height: 20px;
	border: 1px solid var(--color--success);
	border-radius: var(--radius--3xs);
	background: var(--color--neutral-white);
	color: var(--color--success);
	font-size: var(--font-size--3xs);
	font-weight: var(--font-weight--bold);
	line-height: 1;
	white-space: nowrap;
}

.categoryLabel {
	color: var(--color--text--tint-1);
	font-size: var(--font-size--2xs);
	font-weight: var(--font-weight--medium);
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.cardBody {
	display: flex;
	flex-direction: column;
	flex: 1;
	min-height: 0;
	padding: 0 var(--spacing--xs);
	background: var(--color--neutral-white);
}

.widgetName {
	display: -webkit-box;
	-webkit-box-orient: vertical;
	-webkit-line-clamp: 2;
	overflow: hidden;
	color: var(--color--text--shade-2);
	line-height: 1.35;
}

.cardFooter {
	display: flex;
	flex-wrap: wrap;
	gap: var(--spacing--4xs);
	flex-shrink: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border-top: 1px solid var(--color--foreground--tint-1);
	min-height: 32px;
	align-items: center;
	background: var(--color--neutral-white);
}

.tagPill {
	display: inline-flex;
	align-items: center;
	padding: 0 var(--spacing--3xs);
	height: 22px;
	border: 1px solid var(--color--foreground--tint-1);
	border-radius: var(--radius--3xs);
	background: var(--color--neutral-white);
	color: var(--color--text--shade-1);
	font-size: var(--font-size--3xs);
	line-height: 1;
	max-width: 100%;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.pagination {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-top: var(--spacing--sm);
}

.loading,
.empty {
	display: flex;
	align-items: center;
	justify-content: center;
	min-height: 200px;
}
</style>
