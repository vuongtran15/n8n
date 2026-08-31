/**
 * Merge community Simplified Chinese (zh-CN) into n8n zh.json aligned with en.json keys.
 * Source: https://github.com/other-blowsnow/n8n-i18n-chinese (community, not official n8n)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const localesDir = path.join(root, 'packages/frontend/@n8n/i18n/src/locales');
const enPath = path.join(localesDir, 'en.json');
const zhPath = path.join(localesDir, 'zh.json');

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const zhCnUrl =
	'https://raw.githubusercontent.com/other-blowsnow/n8n-i18n-chinese/main/languages/zh-CN.json';

console.log('Fetching community zh-CN…');
const res = await fetch(zhCnUrl);
if (!res.ok) throw new Error(`Failed to fetch zh-CN: ${res.status}`);
const zhCn = await res.json();

const merged = {};
let translated = 0;
let fallback = 0;

for (const [key, enVal] of Object.entries(en)) {
	if (typeof zhCn[key] === 'string' && zhCn[key].length > 0) {
		merged[key] = zhCn[key];
		translated++;
	} else {
		merged[key] = enVal;
		fallback++;
	}
}

fs.writeFileSync(zhPath, `${JSON.stringify(merged, null, '\t')}\n`, 'utf8');
console.log(`zh.json written: ${translated} translated, ${fallback} fallback to English`);
