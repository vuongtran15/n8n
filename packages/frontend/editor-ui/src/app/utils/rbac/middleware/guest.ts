import type { RouterMiddleware } from '@/app/types/router';
import { VIEWS } from '@/app/constants';
import type { GuestPermissionOptions } from '@/app/types/rbac';
import { isGuest } from '@/app/utils/rbac/checks';

/** Auth paths must never be post-login redirects (avoids signin↔signout loops). */
function isBlockedAuthRedirect(pathOrUrl: string): boolean {
	const path = pathOrUrl.startsWith('/')
		? pathOrUrl.split(/[?#]/)[0]
		: (() => {
				try {
					return new URL(pathOrUrl).pathname;
				} catch {
					return '';
				}
			})();
	if (!path) return false;
	return (
		path === '/signin' ||
		path === '/signout' ||
		path === '/signup' ||
		path === '/forgot-password' ||
		path === '/change-password' ||
		path === '/setup'
	);
}

export const guestMiddleware: RouterMiddleware<GuestPermissionOptions> = async (
	to,
	_from,
	next,
) => {
	const valid = isGuest();
	if (!valid) {
		const redirect = (to.query.redirect as string) ?? '';

		// Allow local path redirects (except auth pages — those cause logout loops)
		if (redirect.startsWith('/')) {
			if (isBlockedAuthRedirect(redirect)) {
				return next({ name: VIEWS.HOMEPAGE });
			}
			return next(redirect);
		}

		try {
			// Only allow origin domain redirects
			const url = new URL(redirect);
			if (url.origin === window.location.origin) {
				if (isBlockedAuthRedirect(url.pathname)) {
					return next({ name: VIEWS.HOMEPAGE });
				}
				return next(redirect);
			}
		} catch {
			// Intentionally fall through to redirect to homepage
			// if the redirect is an invalid URL
		}

		return next({ name: VIEWS.HOMEPAGE });
	}
};
