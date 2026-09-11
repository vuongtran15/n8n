import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import {
	resolveWecomExecutionContext,
	resolveWecomWebhook,
} from '../shared/wecomContext';
import { preferStr, valueFromItemJson } from '../shared/wecomItemJson';
import { wecomJsonPost, wecomMultipartPost } from '../shared/wecomRequest';

/** Parse danh sách mention: mảng JSON, hoặc chuỗi phân tách bằng , ; | xuống dòng. */
function parseMentionList(raw: unknown): string[] {
	if (raw === undefined || raw === null) return [];
	if (Array.isArray(raw)) {
		return raw.map((v) => String(v).trim()).filter((s) => s !== '');
	}
	const s = String(raw).trim();
	if (!s) return [];
	if (s.startsWith('[')) {
		try {
			const parsed: unknown = JSON.parse(s);
			if (Array.isArray(parsed)) {
				return parsed.map((v) => String(v).trim()).filter((x) => x !== '');
			}
		} catch {
			/* fall through */
		}
	}
	return s
		.split(/[,;|\n\r]+/)
		.map((part) => part.trim())
		.filter((part) => part !== '');
}

function preferMentionList(
	itemJson: IDataObject,
	jsonKeys: string[],
	formVal: string,
): string[] {
	for (const key of jsonKeys) {
		const v = valueFromItemJson(itemJson, key);
		if (v === undefined || v === null) continue;
		const list = parseMentionList(v);
		if (list.length > 0) return list;
	}
	return parseMentionList(formVal);
}

export async function executeSendTextItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const wecom = resolveWecomExecutionContext(ctx, itemIndex);
	const webhook = resolveWecomWebhook(ctx, itemIndex, wecom.itemJson);
	const content = preferStr(
		wecom.itemJson,
		'content',
		(ctx.getNodeParameter('content', itemIndex, '') as string).trim(),
		['text'],
	).trim();
	if (!content) {
		throw new Error('Content (hoặc text) không được rỗng.');
	}

	const body: Record<string, unknown> = { webhook, content };
	const mentionedList = preferMentionList(
		wecom.itemJson,
		['mentionedList', 'mentioned_list'],
		ctx.getNodeParameter('mentionedList', itemIndex, '') as string,
	);
	const mentionedMobileList = preferMentionList(
		wecom.itemJson,
		['mentionedMobileList', 'mentioned_mobile_list'],
		ctx.getNodeParameter('mentionedMobileList', itemIndex, '') as string,
	);
	if (mentionedList.length > 0) {
		body.mentionedList = mentionedList;
	}
	if (mentionedMobileList.length > 0) {
		body.mentionedMobileList = mentionedMobileList;
	}

	return wecomJsonPost(
		ctx,
		`${wecom.baseUrl}/send-text`,
		body,
		wecom.timeoutMs,
		'WeCom send-text',
	);
}

export async function executeSendMarkdownItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const wecom = resolveWecomExecutionContext(ctx, itemIndex);
	const webhook = resolveWecomWebhook(ctx, itemIndex, wecom.itemJson);
	const content = preferStr(
		wecom.itemJson,
		'content',
		(ctx.getNodeParameter('content', itemIndex, '') as string).trim(),
		['text', 'markdown'],
	).trim();
	if (!content) {
		throw new Error('Content (hoặc text / markdown) không được rỗng.');
	}

	return wecomJsonPost(
		ctx,
		`${wecom.baseUrl}/send-markdown`,
		{ webhook, content },
		wecom.timeoutMs,
		'WeCom send-markdown',
	);
}

export async function executeSendImageItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const wecom = resolveWecomExecutionContext(ctx, itemIndex);
	const webhook = resolveWecomWebhook(ctx, itemIndex, wecom.itemJson);
	const binaryPropertyName = preferStr(
		wecom.itemJson,
		'binaryPropertyName',
		(ctx.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string).trim() ||
			'data',
	).trim();

	const binaryMeta = ctx.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await ctx.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	const fileName = binaryMeta.fileName || 'image.png';
	const mimeType = binaryMeta.mimeType || 'image/png';

	const form = new FormData();
	form.append('webhook', webhook);
	form.append('image', new Blob([buffer], { type: mimeType }), fileName);

	return wecomMultipartPost(
		ctx,
		`${wecom.baseUrl}/send-image`,
		form,
		wecom.timeoutMs,
		'WeCom send-image',
	);
}

export async function executeSendFileItem(
	ctx: IExecuteFunctions,
	itemIndex: number,
): Promise<INodeExecutionData> {
	const wecom = resolveWecomExecutionContext(ctx, itemIndex);
	const webhook = resolveWecomWebhook(ctx, itemIndex, wecom.itemJson);
	const binaryPropertyName = preferStr(
		wecom.itemJson,
		'binaryPropertyName',
		(ctx.getNodeParameter('binaryPropertyName', itemIndex, 'data') as string).trim() ||
			'data',
	).trim();
	const filename = preferStr(
		wecom.itemJson,
		'filename',
		(ctx.getNodeParameter('filename', itemIndex, '') as string).trim(),
		['fileName'],
	).trim();

	const binaryMeta = ctx.helpers.assertBinaryData(itemIndex, binaryPropertyName);
	const buffer = await ctx.helpers.getBinaryDataBuffer(itemIndex, binaryPropertyName);
	const displayName = filename || binaryMeta.fileName || 'file.bin';
	const mimeType = binaryMeta.mimeType || 'application/octet-stream';

	const form = new FormData();
	form.append('webhook', webhook);
	form.append('file', new Blob([buffer], { type: mimeType }), displayName);
	if (filename) {
		form.append('filename', filename);
	}

	return wecomMultipartPost(
		ctx,
		`${wecom.baseUrl}/send-file`,
		form,
		wecom.timeoutMs,
		'WeCom send-file',
	);
}
