import { i18nInstance, type LocaleMessages } from '@n8n/i18n';
import englishBaseText from '@n8n/i18n/locales/en.json';
import chineseBaseText from '@n8n/i18n/locales/zh.json';
import vietnameseBaseText from '@n8n/i18n/locales/vi.json';

function registerLocaleMessages(locale: string, messages: LocaleMessages): void {
	const { numberFormats, ...rest } = messages;
	i18nInstance.global.setLocaleMessage(locale, rest);
	if (numberFormats) {
		i18nInstance.global.setNumberFormat(locale, numberFormats);
	}
}

registerLocaleMessages('en', englishBaseText as unknown as LocaleMessages);
registerLocaleMessages('zh', chineseBaseText as unknown as LocaleMessages);
registerLocaleMessages('vi', vietnameseBaseText as unknown as LocaleMessages);
