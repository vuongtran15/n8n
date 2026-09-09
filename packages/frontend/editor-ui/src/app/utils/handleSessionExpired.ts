import { useNotificationsStore } from '@n8n/stores/notifications.store';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useUsersStore } from '@n8n/stores/users.store';
import type { Router } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useSessionExpiryStore } from '@/app/stores/sessionExpiry.store';
import { useUIStore } from '@/app/stores/ui.store';
import { getSanitizedCurrentPath } from '@/app/utils/urlUtils';

/** Set by SignoutView so a concurrent 401 is not shown as "session expired". */
export const INTENTIONAL_LOGOUT_STORAGE_KEY = 'n8n-intentional-logout';

/** Guards against full-reload loops on /signin?sessionExpired=true. */
const SESSION_EXPIRED_REDIRECT_AT_KEY = 'n8n-session-expired-at';
const SESSION_EXPIRED_LOOP_MS = 5_000;

const AUTH_ROUTE_NAMES = new Set<string>([
	VIEWS.SIGNIN,
	VIEWS.SIGNOUT,
	VIEWS.SIGNUP,
	VIEWS.FORGOT_PASSWORD,
	VIEWS.CHANGE_PASSWORD,
	VIEWS.SETUP,
]);

function isOnAuthPage(router: Router): boolean {
	const route = router.currentRoute.value;
	if (route.name && AUTH_ROUTE_NAMES.has(String(route.name))) {
		return true;
	}
	const path = route.path || '';
	return (
		path === '/signin' ||
		path === '/signout' ||
		path === '/signup' ||
		path === '/forgot-password' ||
		path === '/change-password' ||
		path === '/setup'
	);
}

function isIntentionalLogout(): boolean {
	try {
		return sessionStorage.getItem(INTENTIONAL_LOGOUT_STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

function clearIntentionalLogout(): void {
	try {
		sessionStorage.removeItem(INTENTIONAL_LOGOUT_STORAGE_KEY);
	} catch {
		// sessionStorage may be unavailable (private mode / SSR)
	}
}

function isSessionExpiredReloadLoop(): boolean {
	try {
		const last = Number(sessionStorage.getItem(SESSION_EXPIRED_REDIRECT_AT_KEY) || 0);
		return last > 0 && Date.now() - last < SESSION_EXPIRED_LOOP_MS;
	} catch {
		return false;
	}
}

function markSessionExpiredRedirect(): void {
	try {
		sessionStorage.setItem(SESSION_EXPIRED_REDIRECT_AT_KEY, String(Date.now()));
	} catch {
		// ignore
	}
}

function clearSessionExpiredRedirectMark(): void {
	try {
		sessionStorage.removeItem(SESSION_EXPIRED_REDIRECT_AT_KEY);
	} catch {
		// ignore
	}
}

async function logoutQuietly(): Promise<void> {
	try {
		await useUsersStore().logout();
	} catch {
		// Session is already invalid server-side; local cleanup still happens inside logout().
	}
}

function resolveSignInHref(router: Router, query?: Record<string, string>): string {
	return router.resolve({
		name: VIEWS.SIGNIN,
		query,
	}).href;
}

// currentUser excludes failed-login 401s; handled dedupes concurrent ones; baseURL excludes non-n8n hosts.
export async function handleSessionExpired(router: Router, baseURL: string): Promise<void> {
	const usersStore = useUsersStore();
	const sessionExpiryStore = useSessionExpiryStore();
	const rootStore = useRootStore();

	if (
		sessionExpiryStore.handled ||
		!usersStore.currentUser ||
		(baseURL !== rootStore.restApiContext.baseUrl && baseURL !== rootStore.publicApiContext.baseUrl)
	) {
		return;
	}
	sessionExpiryStore.markHandled();

	const uiStore = useUIStore();
	uiStore.closeAllModals();

	// Set before any `await` so the triggering request's own toast is suppressed too. The
	// redirect below reloads the page, so there's nothing to restore this to afterwards.
	useNotificationsStore().setNotificationsSuppressed(true);

	const intentionalLogout = isIntentionalLogout();

	// Already on sign-in (or another auth page): logout locally only. A full reload here
	// re-reads a sticky auth cookie, sets currentUser again, 401s, and loops forever
	// (blank /signin?sessionExpired=true).
	if (isOnAuthPage(router)) {
		await logoutQuietly();
		clearIntentionalLogout();
		return;
	}

	// Voluntary sign-out raced with an in-flight 401 — clear session, land on sign-in
	// without the "Session expired" toast.
	if (intentionalLogout) {
		await logoutQuietly();
		clearIntentionalLogout();
		clearSessionExpiredRedirectMark();
		window.preventNodeViewBeforeUnload = true;
		window.location.href = resolveSignInHref(router);
		return;
	}

	// Sticky cookie / half-cleared session: avoid hammering ?sessionExpired=true reloads.
	if (isSessionExpiredReloadLoop()) {
		await logoutQuietly();
		clearSessionExpiredRedirectMark();
		window.preventNodeViewBeforeUnload = true;
		window.location.href = resolveSignInHref(router);
		return;
	}

	const currentRoute = router.currentRoute.value;

	// Unsaved changes won't survive the redirect, so drop any open node id rather than restore a
	// URL pointing at a node a fresh fetch of the workflow won't find.
	const redirectRoute = uiStore.stateIsDirty
		? router.resolve({
				name: currentRoute.name,
				params: { ...currentRoute.params, nodeId: undefined },
				query: currentRoute.query,
			})
		: currentRoute;

	const redirectPath = getSanitizedCurrentPath(redirectRoute);

	await logoutQuietly();

	// The session is already invalid server-side, so saving would fail anyway; skip the
	// unsaved-changes confirmation and reload straight to sign-in, matching the explicit
	// sign-out flow (SignoutView.vue).
	// Pass redirectPath raw — vue-router encodes query values; encodeURIComponent here
	// would produce %252F… and break post-login redirects.
	markSessionExpiredRedirect();
	window.preventNodeViewBeforeUnload = true;
	window.location.href = resolveSignInHref(router, {
		redirect: redirectPath,
		sessionExpired: 'true',
	});
}
