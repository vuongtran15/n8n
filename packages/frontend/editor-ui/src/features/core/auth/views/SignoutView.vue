<script setup lang="ts">
import { VIEWS } from '@/app/constants';
import { INTENTIONAL_LOGOUT_STORAGE_KEY } from '@/app/utils/handleSessionExpired';
import { useUsersStore } from '@n8n/stores/users.store';
import { useSSOStore } from '@/features/settings/sso/sso.store';
import { useToast } from '@n8n/composables/useToast';
import { useRouter } from 'vue-router';
import { useI18n } from '@n8n/i18n';
import { onMounted } from 'vue';

const usersStore = useUsersStore();
const ssoStore = useSSOStore();
const toast = useToast();
const router = useRouter();
const i18n = useI18n();

const logout = async () => {
	try {
		// Mark before the API call so a concurrent 401 is treated as voluntary logout,
		// not "session expired".
		try {
			sessionStorage.setItem(INTENTIONAL_LOGOUT_STORAGE_KEY, '1');
		} catch {
			// sessionStorage may be unavailable
		}

		// When OIDC is the active authentication method, sign out through the
		// OIDC logout endpoint so the provider session can be terminated too
		// (RP-Initiated Logout). The backend verifies that this specific
		// session was actually established through OIDC before returning a
		// redirect URL, so e.g. an email session of the instance owner is
		// unaffected. If the endpoint is unavailable (e.g. the license lapsed
		// since login), the store falls back to the standard logout.
		const viaOidc = ssoStore.isDefaultAuthenticationOidc;
		const { redirectUrl } = await usersStore.logout({ viaOidc });

		window.location.href = redirectUrl ?? router.resolve({ name: VIEWS.SIGNIN }).href;
	} catch (e) {
		try {
			sessionStorage.removeItem(INTENTIONAL_LOGOUT_STORAGE_KEY);
		} catch {
			// ignore
		}
		toast.showError(e, i18n.baseText('auth.signout.error'));
	}
};

onMounted(() => {
	void logout();
});
</script>

<template>
	<div />
</template>
