<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { useDocumentTitle } from '@/app/composables/useDocumentTitle';
import { useUsersStore } from '@n8n/stores/users.store';
import {
	N8nButton,
	N8nInput,
	N8nNotice,
	N8nSettingsLayout,
	N8nSettingsPageHeader,
	N8nSettingsRow,
	N8nSettingsRowGroup,
	N8nSettingsSection,
	N8nText,
} from '@n8n/design-system';
import { useRmWorkflowStore } from '../rmWorkflow.store';

const i18n = useI18n();
const toast = useToast();
const documentTitle = useDocumentTitle();
const rmWorkflowStore = useRmWorkflowStore();
const usersStore = useUsersStore();

const apiBaseUrl = ref('');
const isLoading = ref(true);
const isSaving = ref(false);

const canManage = computed(() => usersStore.isAdminOrOwner);

const managedByEnv = computed(() => rmWorkflowStore.settings?.managedByEnv ?? false);

onMounted(() => {
	documentTitle.set(i18n.baseText('rmWorkflow.settings.title'));
});

watch(
	canManage,
	async (can) => {
		if (!can) {
			isLoading.value = false;
			return;
		}

		isLoading.value = true;
		try {
			const settings = await rmWorkflowStore.loadSettings();
			apiBaseUrl.value = settings.apiBaseUrl;
		} catch (error) {
			toast.showError(error as Error, i18n.baseText('rmWorkflow.settings.loadError'));
		} finally {
			isLoading.value = false;
		}
	},
	{ immediate: true },
);

async function onSave() {
	isSaving.value = true;
	try {
		await rmWorkflowStore.saveSettings(apiBaseUrl.value.trim());
		toast.showMessage({
			title: i18n.baseText('rmWorkflow.settings.saveSuccess'),
			type: 'success',
		});
	} catch (error) {
		toast.showError(error as Error, i18n.baseText('rmWorkflow.settings.saveError'));
	} finally {
		isSaving.value = false;
	}
}
</script>

<template>
	<div>
		<N8nSettingsPageHeader
			:title="i18n.baseText('rmWorkflow.settings.title')"
			:description="i18n.baseText('rmWorkflow.settings.description')"
		/>

		<N8nNotice v-if="!canManage" type="warning" :class="$style.notice">
			{{ i18n.baseText('rmWorkflow.settings.noPermission') }}
		</N8nNotice>

		<N8nSettingsLayout v-else>
			<N8nSettingsSection :title="i18n.baseText('rmWorkflow.settings.apiSection')">
				<N8nSettingsRowGroup>
					<N8nSettingsRow
						layout="vertical"
						:title="i18n.baseText('rmWorkflow.settings.apiBaseUrl.label')"
						:description="i18n.baseText('rmWorkflow.settings.apiBaseUrl.description')"
					>
						<template #action>
							<N8nInput
								v-model="apiBaseUrl"
								name="apiBaseUrl"
								:placeholder="i18n.baseText('rmWorkflow.settings.apiBaseUrl.placeholder')"
								:disabled="managedByEnv || isLoading"
							/>
						</template>
					</N8nSettingsRow>
				</N8nSettingsRowGroup>

				<N8nNotice v-if="managedByEnv" type="info" :class="$style.notice">
					{{ i18n.baseText('rmWorkflow.settings.managedByEnv') }}
				</N8nNotice>

				<N8nText size="small" color="text-light" :class="$style.hint">
					{{ i18n.baseText('rmWorkflow.settings.apiPathsHint') }}
				</N8nText>

				<div :class="$style.actions">
					<N8nButton
						variant="solid"
						:loading="isSaving"
						:disabled="managedByEnv || isLoading || !apiBaseUrl.trim()"
						@click="onSave"
					>
						{{ i18n.baseText('rmWorkflow.settings.save') }}
					</N8nButton>
				</div>
			</N8nSettingsSection>
		</N8nSettingsLayout>
	</div>
</template>

<style lang="scss" module>
.notice {
	margin-bottom: var(--spacing--md);
}

.hint {
	display: block;
	margin-top: var(--spacing--sm);
}

.actions {
	margin-top: var(--spacing--md);
}
</style>
