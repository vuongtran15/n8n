/**
 * Machine-translate en.json → vi.json (Google Translate, batched + retry on 429).
 * Resume-safe: only translates keys where vi[key] === en[key].
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..');
const localesDir = path.join(root, 'packages/frontend/@n8n/i18n/src/locales');
const enPath = path.join(localesDir, 'en.json');
const viPath = path.join(localesDir, 'vi.json');

const STRINGS_PER_REQUEST = 8;
const BASE_DELAY_MS = 2500;

const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
const vi = fs.existsSync(viPath) ? JSON.parse(fs.readFileSync(viPath, 'utf8')) : { ...en };

const SEP = '\n␞\n';
const PLACEHOLDER_RE = /\{[^}]+\}/g;

function protectPlaceholders(text) {
	const map = new Map();
	let i = 0;
	const protectedText = text.replace(PLACEHOLDER_RE, (m) => {
		const token = `__PH${i}__`;
		map.set(token, m);
		i++;
		return token;
	});
	return { protectedText, map };
}

function restorePlaceholders(text, map) {
	let out = text;
	for (const [token, value] of map) {
		out = out.split(token).join(value);
	}
	return out;
}

function shouldSkip(text) {
	if (!text || typeof text !== 'string') return true;
	if (text.length > 3500) return true;
	if (/^https?:\/\//i.test(text.trim())) return true;
	return false;
}

async function googleTranslateBatch(texts) {
	const joined = texts.join(SEP);
	const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(joined)}`;
	const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
	if (res.status === 429) {
		const err = new Error('HTTP 429');
		err.status = 429;
		throw err;
	}
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	const data = await res.json();
	const translated = data[0].map((part) => part[0]).join('');
	return translated.split(SEP);
}

async function translateWithRetry(texts, attempt = 0) {
	try {
		return await googleTranslateBatch(texts);
	} catch (e) {
		if (e.status === 429 && attempt < 8) {
			const wait = BASE_DELAY_MS * 2 ** attempt;
			console.warn(`429 — wait ${wait}ms, retry ${attempt + 1}`);
			await sleep(wait);
			return translateWithRetry(texts, attempt + 1);
		}
		throw e;
	}
}

function sleep(ms) {
	return new Promise((r) => setTimeout(r, ms));
}

const pending = Object.keys(en).filter((k) => vi[k] === undefined || vi[k] === en[k]);
console.log(`Total: ${Object.keys(en).length}, pending: ${pending.length}`);

let done = 0;
for (let i = 0; i < pending.length; i += STRINGS_PER_REQUEST) {
	const chunkKeys = pending.slice(i, i + STRINGS_PER_REQUEST);
	const toTranslate = [];
	const maps = [];
	const indices = [];

	for (let j = 0; j < chunkKeys.length; j++) {
		const key = chunkKeys[j];
		const raw = en[key];
		if (shouldSkip(raw)) {
			vi[key] = raw;
			continue;
		}
		const { protectedText, map } = protectPlaceholders(raw);
		toTranslate.push(protectedText);
		maps.push(map);
		indices.push(j);
	}

	if (toTranslate.length > 0) {
		try {
			const results = await translateWithRetry(toTranslate);
			for (let r = 0; r < results.length; r++) {
				const key = chunkKeys[indices[r]];
				vi[key] = restorePlaceholders(results[r] ?? en[key], maps[r]);
			}
		} catch (e) {
			console.warn(`Batch failed at ${chunkKeys[0]}: ${e.message}`);
			for (const key of chunkKeys) {
				if (vi[key] === en[key]) vi[key] = en[key];
			}
		}
	}

	done += chunkKeys.length;
	if (done % 80 === 0 || done === pending.length) {
		fs.writeFileSync(viPath, `${JSON.stringify(vi, null, '\t')}\n`, 'utf8');
		console.log(`Progress: ${done}/${pending.length}`);
	}
	await sleep(BASE_DELAY_MS);
}

for (const [key, val] of Object.entries(en)) {
	if (vi[key] === undefined) vi[key] = val;
}

fs.writeFileSync(viPath, `${JSON.stringify(vi, null, '\t')}\n`, 'utf8');
console.log('vi.json complete.');
