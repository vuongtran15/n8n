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

	N8nOption,

	N8nSelect,

	N8nText,

} from '@n8n/design-system';

import { RM_WIDGET_STORE_MODAL_KEY } from '../constants';

import { useRmWorkflowStore } from '../rmWorkflow.store';

import type { RmWorkflowListItem } from '../rmWorkflow.types';

import { getCatalogDisplayName } from '../rmWorkflow.utils';



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



const locale = computed(() => i18n.locale);



const categoryOptions = computed(() => {

	const options = [

		{

			value: 'all' as const,

			label: i18n.baseText('rmWorkflow.widgetStore.categories.all'),

		},

	];



	const sortedCatalogs = [...rmWorkflowStore.catalogs].sort(

		(a, b) => a.sortOrder - b.sortOrder || a.id - b.id,

	);



	for (const catalog of sortedCatalogs) {

		options.push({

			value: String(catalog.id),

			label: getCatalogDisplayName(catalog, locale.value),

		});

	}



	return options;

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

			catalogId:

				selectedCatalogId.value === 'all'

					? undefined

					: Number.parseInt(selectedCatalogId.value, 10),

		});



		items.value = append ? [...items.value, ...response.items] : response.items;

		total.value = response.total;

		hasNextPage.value = response.hasNextPage;

		page.value = response.page;

	} catch (error) {

		loadError.value = (error as Error).message;

		if (!append) {

			items.value = [];

			total.value = 0;

			hasNextPage.value = false;

		}

		toast.showError(error as Error, i18n.baseText('rmWorkflow.widgetStore.loadError'));

	} finally {

		isLoading.value = false;

		isLoadingMore.value = false;

	}

}



const reloadFromStart = useDebounceFn(async () => {

	page.value = 1;

	await loadPage(1, false);

}, 300);



watch([searchQuery, selectedCatalogId], () => {

	void reloadFromStart();

});



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



function onCancel() {

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

		min-height="420px"

		max-height="88vh"

		:scrollable="true"

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

			<div :class="$style.toolbar">

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

				<N8nSelect

					v-model="selectedCatalogId"

					size="small"

					:class="$style.categorySelect"

					:placeholder="i18n.baseText('rmWorkflow.widgetStore.categories.all')"

				>

					<N8nOption

						v-for="option in categoryOptions"

						:key="String(option.value)"

						:value="option.value"

						:label="option.label"

					/>

				</N8nSelect>

			</div>



			<div v-if="isLoading" :class="$style.loading">

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

				<div :class="$style.grid">

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

							<span :class="$style.workflowId">{{ widget.n8nWorkflowId }}</span>

						</div>



						<div v-if="widget.tags?.length || widget.description" :class="$style.cardFooter">

							<span

								v-for="tag in widget.tags?.slice(0, 3) ?? []"

								:key="tag"

								:class="$style.tagPill"

							>

								{{ tag }}

							</span>

							<span v-if="!widget.tags?.length && widget.description" :class="$style.tagPill">

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

		</template>

		<template #footer>

			<div :class="$style.footer">

				<N8nButton variant="subtle" @click="onCancel">

					{{ i18n.baseText('rmWorkflow.widgetStore.cancel') }}

				</N8nButton>

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



.toolbar {

	display: flex;

	gap: var(--spacing--xs);

	margin-bottom: var(--spacing--sm);

	align-items: center;

}



.searchInput {

	flex: 1;

	min-width: 0;

}



.categorySelect {

	width: 200px;

	flex-shrink: 0;

}



.grid {

	display: grid;

	grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));

	gap: var(--spacing--sm);

}



.widgetCard {

	display: flex;

	flex-direction: column;

	width: 100%;

	padding: 0;

	border: 1px solid var(--color--foreground--tint-1);

	border-radius: var(--radius--3xs);

	background: var(--color--background--light-3);

	cursor: pointer;

	text-align: left;

	overflow: hidden;

	transition:

		border-color 0.15s ease,

		box-shadow 0.15s ease,

		background-color 0.15s ease;



	&:hover {

		border-color: var(--color--foreground--shade-1);

		box-shadow: 0 2px 8px rgb(0 0 0 / 6%);

	}



	&:focus-visible {

		outline: 2px solid var(--color--primary);

		outline-offset: 1px;

	}

}



.selected {

	border-color: var(--color--primary);

	box-shadow: 0 0 0 1px var(--color--primary);

	background: var(--color--primary--tint-3);

}



.cardTop {

	display: flex;

	align-items: center;

	justify-content: space-between;

	gap: var(--spacing--2xs);

	padding: var(--spacing--3xs) var(--spacing--xs);

	border-bottom: 1px solid var(--color--foreground--tint-1);

	background: var(--color--background--light-2);

}



.statusBadge {

	display: inline-flex;

	align-items: center;

	padding: 0 var(--spacing--3xs);

	height: 20px;

	border-radius: var(--radius--3xs);

	background: var(--color--success--tint-2);

	color: var(--color--success);

	font-size: var(--font-size--3xs);

	font-weight: var(--font-weight--bold);

	line-height: 1;

	white-space: nowrap;

}



.categoryLabel {

	color: var(--color--text--shade-1);

	font-size: var(--font-size--2xs);

	font-weight: var(--font-weight--medium);

	overflow: hidden;

	text-overflow: ellipsis;

	white-space: nowrap;

}



.cardBody {

	display: flex;

	flex-direction: column;

	gap: var(--spacing--5xs);

	padding: var(--spacing--2xs) var(--spacing--xs);

	min-height: 0;

}



.widgetName {

	overflow: hidden;

	text-overflow: ellipsis;

	white-space: nowrap;

	color: var(--color--text--shade-2);

}



.workflowId {

	font-family: var(--font-family--monospace);

	font-size: var(--font-size--3xs);

	color: var(--color--secondary);

	overflow: hidden;

	text-overflow: ellipsis;

	white-space: nowrap;

}



.cardFooter {

	display: flex;

	flex-wrap: wrap;

	gap: var(--spacing--4xs);

	padding: var(--spacing--3xs) var(--spacing--xs);

	border-top: 1px solid var(--color--foreground--tint-1);

	min-height: 32px;

	align-items: center;

}



.tagPill {

	display: inline-flex;

	align-items: center;

	padding: 0 var(--spacing--3xs);

	height: 22px;

	border: 1px solid var(--color--foreground--tint-1);

	border-radius: var(--radius--3xs);

	background: var(--color--background--light-3);

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

	min-height: 160px;

}



.footer {

	display: flex;

	justify-content: flex-end;

	width: 100%;

}

</style>


