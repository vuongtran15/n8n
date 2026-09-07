<script setup lang="ts">
import type { ComponentPublicInstance } from 'vue';
import { computed, ref } from 'vue';
import type { EventBus } from '@n8n/utils/event-bus';
import { createEventBus } from '@n8n/utils/event-bus';
import type {
	INode,
	INodeParameterResourceLocator,
	INodeProperties,
	INodePropertyMode,
	ResourceLocatorModes,
} from 'n8n-workflow';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useUIStore } from '@/app/stores/ui.store';
import ExpressionParameterInput from '@/features/ndv/parameters/components/ExpressionParameterInput.vue';
import ParameterIssues from '@/features/ndv/parameters/components/ParameterIssues.vue';
import { useResourceLocatorModes } from '@/features/ndv/parameters/composables/useResourceLocatorModes';
import { ndvEventBus } from '@/features/ndv/shared/ndv.eventBus';
import { RM_WIDGET_STORE_MODAL_KEY } from '../constants';
import { useRmWorkflowStore } from '../rmWorkflow.store';
import {
	N8nIcon,
	N8nIconButton,
	N8nInput,
	N8nOption,
	N8nSelect,
	N8nText,
} from '@n8n/design-system';

export interface Props {
	modelValue: INodeParameterResourceLocator;
	eventBus?: EventBus;
	isValueExpression?: boolean;
	isReadOnly?: boolean;
	path: string;
	expressionDisplayValue?: string;
	forceShowExpression?: boolean;
	parameterIssues?: string[];
	parameter: INodeProperties;
	node?: INode | null;
}

const props = withDefaults(defineProps<Props>(), {
	eventBus: () => createEventBus(),
	isValueExpression: false,
	isReadOnly: false,
	forceShowExpression: false,
	expressionDisplayValue: '',
	parameterIssues: () => [],
});

const emit = defineEmits<{
	'update:modelValue': [value: INodeParameterResourceLocator];
	modalOpenerClick: [];
	focus: [];
	blur: [];
}>();

const i18n = useI18n();
const toast = useToast();
const rmWorkflowStore = useRmWorkflowStore();
const uiStore = useUIStore();
const cachedName = ref(props.modelValue?.cachedResultName ?? '');
const isRefreshing = ref(false);

const { supportedModes, selectedMode, isListMode, getUpdatedModePayload, getModeLabel } =
	useResourceLocatorModes(
		computed(() => props.modelValue),
		(id) => cachedName.value || id,
	);

function getWidgetModeLabel(mode: INodePropertyMode): string {
	if (mode.name === 'list') {
		return i18n.baseText('rmWorkflow.widgetStore.mode.store');
	}
	return getModeLabel(mode) ?? mode.displayName ?? mode.name;
}

const selectedWidgetLabel = computed(() => {
	const value = props.modelValue?.value;
	if (!value) {
		return i18n.baseText('rmWorkflow.widgetStore.noSelection');
	}
	return props.modelValue?.cachedResultName || String(value);
});

const idModeValue = computed({
	get: () => String(props.modelValue?.value ?? ''),
	set: (value: string) => {
		emit('update:modelValue', {
			__rl: true,
			mode: 'id',
			value,
			cachedResultName: value,
		});
	},
});

function onModeChange(mode: ResourceLocatorModes) {
	emit('update:modelValue', getUpdatedModePayload(mode));
}

function openWidgetStore() {
	if (props.isReadOnly) {
		return;
	}

	uiStore.openModalWithData({
		name: RM_WIDGET_STORE_MODAL_KEY,
		data: {
			selectedValue: props.modelValue?.value ? String(props.modelValue.value) : null,
			onSelect: (workflowId: string, name: string) => {
				cachedName.value = name;
				emit('update:modelValue', {
					__rl: true,
					mode: 'list',
					value: workflowId,
					cachedResultName: name,
				});
			},
		},
	});
}

function onExpressionInput(value: string) {
	emit('update:modelValue', {
		__rl: true,
		mode: props.modelValue?.mode ?? 'list',
		value,
	} as INodeParameterResourceLocator);
}

const canRefresh = computed(() => Boolean(props.modelValue?.value) && !props.isReadOnly);

async function refreshConfiguration() {
	const workflowId = props.modelValue?.value ? String(props.modelValue.value) : '';
	const nodeName = props.node?.name;
	if (!workflowId || !nodeName || isRefreshing.value) {
		return;
	}

	isRefreshing.value = true;
	try {
		const response = await rmWorkflowStore.loadWorkflows({
			search: workflowId,
			pageSize: 50,
		});
		const match = response.items.find((item) => item.n8nWorkflowId === workflowId);
		if (match) {
			cachedName.value = match.name;
			emit('update:modelValue', {
				__rl: true,
				mode: props.modelValue?.mode ?? 'list',
				value: workflowId,
				cachedResultName: match.name,
			});
		}

		ndvEventBus.emit('refreshRmWidgetConfig', { nodeName });
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('rmWorkflow.widgetStore.refreshError'));
	} finally {
		isRefreshing.value = false;
	}
}

defineExpose<ComponentPublicInstance>({});
</script>

<template>
	<div :class="$style.container">
		<div v-if="!isValueExpression && !forceShowExpression" :class="$style.modeRow">
			<N8nSelect
				:model-value="selectedMode"
				:disabled="isReadOnly"
				size="small"
				:class="$style.modeSelect"
				@update:model-value="onModeChange"
			>
				<N8nOption
					v-for="mode in supportedModes"
					:key="mode.name"
					:value="mode.name"
					:label="getWidgetModeLabel(mode)"
				/>
			</N8nSelect>
		</div>

		<ExpressionParameterInput
			v-if="isValueExpression || forceShowExpression"
			:model-value="expressionDisplayValue"
			:path="path"
			:is-read-only="isReadOnly"
			@update:model-value="onExpressionInput"
			@modal-opener-click="emit('modalOpenerClick')"
			@focus="emit('focus')"
			@blur="emit('blur')"
		/>

		<template v-else-if="isListMode">
			<div :class="$style.storeRow">
				<button
					type="button"
					:class="$style.selectionButton"
					:disabled="isReadOnly"
					@click="openWidgetStore"
				>
					<N8nIcon icon="layers" />
					<N8nText size="small" :class="$style.selectionText">{{ selectedWidgetLabel }}</N8nText>
				</button>
				<N8nIconButton
					variant="solid"
					icon="refresh-cw"
					size="small"
					:title="i18n.baseText('rmWorkflow.widgetStore.refresh')"
					:disabled="!canRefresh"
					:loading="isRefreshing"
					@click="refreshConfiguration"
				/>
				<N8nIconButton
					variant="solid"
					icon="layers"
					size="small"
					:title="i18n.baseText('rmWorkflow.widgetStore.browse')"
					:disabled="isReadOnly"
					@click="openWidgetStore"
				/>
			</div>
		</template>

		<template v-else>
			<N8nInput
				v-model="idModeValue"
				:placeholder="i18n.baseText('rmWorkflow.widgetStore.idPlaceholder')"
				:disabled="isReadOnly"
				size="small"
			/>
		</template>

		<ParameterIssues v-if="parameterIssues.length > 0" :issues="parameterIssues" />
	</div>
</template>

<style lang="scss" module>
.container {
	display: flex;
	flex-direction: column;
	gap: var(--spacing--xs);
	width: 100%;
}

.modeRow {
	display: flex;
}

.modeSelect {
	width: 100%;
}

.storeRow {
	display: flex;
	gap: var(--spacing--xs);
	align-items: stretch;
}

.selectionButton {
	display: flex;
	align-items: center;
	gap: var(--spacing--2xs);
	flex: 1;
	min-width: 0;
	padding: var(--spacing--2xs) var(--spacing--xs);
	border: 1px solid var(--color--foreground--shade-1);
	border-radius: var(--radius--3xs);
	background: var(--color--foreground--tint-2);
	cursor: pointer;
	text-align: left;

	&:hover:not(:disabled) {
		border-color: var(--color--foreground--shade-1);
	}

	&:disabled {
		cursor: not-allowed;
		opacity: 0.6;
	}
}

.selectionText {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}
</style>
