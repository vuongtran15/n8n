import axios from 'axios';
import { setLanguage } from '@n8n/i18n';
import { locale as designLocale } from '@n8n/design-system';

import {
	LOCAL_STORAGE_LOCALE,
	UI_LOCALE_OPTIONS,
	type UiLocaleOption,
} from '@/app/constants/locale';

export function isValidUiLocale(value: string | null): value is UiLocaleOption {
	return !!value && (UI_LOCALE_OPTIONS as readonly string[]).includes(value);
}

export function getLocaleOverride(): UiLocaleOption | null {
	try {
		const value = localStorage.getItem(LOCAL_STORAGE_LOCALE);
		return isValidUiLocale(value) ? value : null;
	} catch {
		return null;
	}
}

export function applyUiLocale(locale: UiLocaleOption): void {
	setLanguage(locale);
	axios.defaults.headers.common['Accept-Language'] = locale;
	void designLocale.use(locale);
}
