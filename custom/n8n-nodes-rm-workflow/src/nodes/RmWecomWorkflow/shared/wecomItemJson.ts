import type { IDataObject } from 'n8n-workflow';

/** Lấy giá trị từ input JSON; hỗ trợ khớp key không phân biệt hoa thường. */
export function valueFromItemJson(itemJson: IDataObject, canonicalKey: string): unknown {
	if (itemJson[canonicalKey] !== undefined && itemJson[canonicalKey] !== null) {
		return itemJson[canonicalKey];
	}
	const lower = canonicalKey.toLowerCase();
	for (const k of Object.keys(itemJson)) {
		if (k.toLowerCase() === lower) {
			return itemJson[k];
		}
	}
	return undefined;
}

/** Thử lần lượt các tên field (camelCase và alias). */
export function valueFromItemJsonAliases(itemJson: IDataObject, keys: string[]): unknown {
	for (const key of keys) {
		const v = valueFromItemJson(itemJson, key);
		if (v !== undefined && v !== null) return v;
	}
	return undefined;
}

export function coalesceNumber(primary: unknown, fallback: number): number {
	if (typeof primary === 'number' && !Number.isNaN(primary)) return primary;
	if (typeof primary === 'string' && primary.trim() !== '') {
		const n = Number(primary);
		if (!Number.isNaN(n)) return n;
	}
	return fallback;
}

export function preferStr(
	itemJson: IDataObject,
	key: string,
	formVal: string,
	aliases: string[] = [],
): string {
	const keys = [key, ...aliases];
	for (const k of keys) {
		const v = valueFromItemJson(itemJson, k);
		if (v === undefined || v === null) continue;
		const s = String(v).trim();
		if (s !== '') return s;
	}
	return formVal;
}
