import axios from 'axios';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { normalizeRequestUrl, type SapAutoApiResponse } from './sapApi';

function summarizeResponseBody(data: unknown): string | undefined {
	if (typeof data === 'string') {
		const trimmed = data.trim();
		return trimmed ? trimmed.slice(0, 300) : undefined;
	}
	if (typeof data === 'object' && data !== null) {
		const msg = (data as SapAutoApiResponse).Message;
		if (typeof msg === 'string' && msg.trim()) return msg.trim();
	}
	return undefined;
}

function formatSapHttpError(
	status: number,
	url: string,
	timeoutMs: number,
	data: unknown,
	fallbackMessage: string,
): string {
	const detail = summarizeResponseBody(data) ?? fallbackMessage;
	if (status === 502 || status === 503 || status === 504) {
		return (
			`${detail} — HTTP ${status} từ gateway/proxy hoặc upstream SAP (thường ~60–100s khi SAP xử lý lâu). ` +
			`requestTimeoutSeconds của node=${timeoutMs / 1000}s không ngăn được lỗi này. ` +
			`Kiểm tra nginx/IIS trước port SAP hoặc gọi thẳng RMIV.WF.CLIENT. URL: ${url}`
		);
	}
	return detail;
}

/** POST JSON tới SAP Automation; chuẩn hoá lỗi và continueOnFail. */
export async function sapAutoPost(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	body: Record<string, unknown>,
	timeoutMs: number,
	sessionId: string,
	errorPrefix = 'SAP request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.post<SapAutoApiResponse>(url, body, {
			headers: {
				'Content-Type': 'application/json',
				'api-key': apiKey,
			},
			timeout: timeoutMs,
			proxy: false,
		});

		return {
			json: {
				...outputBase,
				...response.data,
				statusCode: response.status,
				sessionId,
			} as IDataObject,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			const data = error.response.data as SapAutoApiResponse | undefined;
			const payload = {
				...outputBase,
				...(typeof data === 'object' && data !== null ? data : {}),
				Success: data?.Success ?? false,
				Message: data?.Message ?? error.message,
				statusCode: error.response.status,
				sessionId,
			} as IDataObject;
			if (ctx.continueOnFail()) {
				return { json: payload };
			}
			throw new Error(
				`${errorPrefix} failed (${error.response.status}): ${formatSapHttpError(
					error.response.status,
					url,
					timeoutMs,
					data,
					error.message,
				)}`,
			);
		}
		if (axios.isAxiosError(error) && error.code === 'ECONNABORTED') {
			throw new Error(
				`${errorPrefix} timed out after ${timeoutMs}ms (requestTimeoutSeconds=${timeoutMs / 1000}): ${error.message}`,
			);
		}
		throw error;
	}
}

function formatConnectError(error: import('axios').AxiosError, targetUrl: string): string {
	const cause = error.cause as { address?: string; port?: number } | undefined;
	const detail = [error.code, cause?.address, cause?.port].filter(Boolean).join(' ');
	return `không kết nối được tới "${targetUrl}" (${detail || error.message})`;
}

/** POST multipart tới ROS Wecom text API. */
export async function rosWecomMessagePost(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	empids: string,
	message: string,
	timeoutMs: number,
): Promise<INodeExecutionData> {
	const targetUrl = normalizeRequestUrl(url);
	const form = new FormData();
	form.append('api_key', apiKey);
	form.append('empids', empids);
	form.append('message', message);

	try {
		const response = await axios.post<unknown>(targetUrl, form, {
			timeout: timeoutMs,
			proxy: false,
		});

		return {
			json: {
				...(typeof response.data === 'object' && response.data !== null
					? (response.data as IDataObject)
					: { result: response.data }),
				statusCode: response.status,
				rosWecomUrl: targetUrl,
			} as IDataObject,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			const data = error.response.data as SapAutoApiResponse | undefined;
			const payload = {
				...(typeof data === 'object' && data !== null ? data : {}),
				Success: data?.Success ?? false,
				Message: data?.Message ?? error.message,
				statusCode: error.response.status,
				rosWecomUrl: targetUrl,
			} as IDataObject;
			if (ctx.continueOnFail()) {
				return { json: payload };
			}
			throw new Error(
				`ROS Wecom Send Message failed (${error.response.status}): ${data?.Message ?? error.message}`,
			);
		}
		if (axios.isAxiosError(error)) {
			throw new Error(`ROS Wecom Send Message failed: ${formatConnectError(error, targetUrl)}.`);
		}
		throw error;
	}
}

/** POST JSON tới WeCom group webhook (không dùng api-key SAP). */
export async function wecomGroupMessagePost(
	ctx: IExecuteFunctions,
	url: string,
	body: Record<string, unknown>,
	timeoutMs: number,
): Promise<INodeExecutionData> {
	const targetUrl = normalizeRequestUrl(url);
	try {
		const response = await axios.post<unknown>(targetUrl, body, {
			headers: {
				'Content-Type': 'application/json',
			},
			timeout: timeoutMs,
			proxy: false,
		});

		return {
			json: {
				...(typeof response.data === 'object' && response.data !== null
					? (response.data as IDataObject)
					: { result: response.data }),
				statusCode: response.status,
				wecomGroupWebhookUrl: targetUrl,
			} as IDataObject,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			const data = error.response.data as IDataObject | undefined;
			const payload = {
				...(typeof data === 'object' && data !== null ? data : {}),
				statusCode: error.response.status,
				wecomGroupWebhookUrl: targetUrl,
			} as IDataObject;
			if (ctx.continueOnFail()) {
				return { json: payload };
			}
			const errmsg =
				typeof data?.errmsg === 'string'
					? data.errmsg
					: typeof data?.Message === 'string'
						? data.Message
						: error.message;
			throw new Error(`Wecom Group Message failed (${error.response.status}): ${errmsg}`);
		}
		if (axios.isAxiosError(error)) {
			throw new Error(`Wecom Group Message failed: ${formatConnectError(error, targetUrl)}.`);
		}
		throw error;
	}
}

/** POST log callback: không đi qua proxy hệ thống, tránh ECONNREFUSED tới localhost proxy. */
export async function sapLogPost(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	body: Record<string, unknown>,
	timeoutMs: number,
	sessionId: string,
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	const targetUrl = normalizeRequestUrl(url);
	try {
		const response = await axios.post<unknown>(targetUrl, body, {
			headers: {
				'Content-Type': 'application/json',
				'api-key': apiKey,
			},
			timeout: timeoutMs,
			proxy: false,
		});

		return {
			json: {
				...outputBase,
				...(typeof response.data === 'object' && response.data !== null
					? (response.data as IDataObject)
					: { result: response.data }),
				statusCode: response.status,
				sessionId,
				logUrl: targetUrl,
			} as IDataObject,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			const data = error.response.data as SapAutoApiResponse | undefined;
			const payload = {
				...outputBase,
				...(typeof data === 'object' && data !== null ? data : {}),
				Success: data?.Success ?? false,
				Message: data?.Message ?? error.message,
				statusCode: error.response.status,
				sessionId,
				logUrl: targetUrl,
			} as IDataObject;
			if (ctx.continueOnFail()) {
				return { json: payload };
			}
			throw new Error(
				`SAP Log failed (${error.response.status}): ${data?.Message ?? error.message}`,
			);
		}
		if (axios.isAxiosError(error)) {
			throw new Error(`SAP Log failed: ${formatConnectError(error, targetUrl)}.`);
		}
		throw error;
	}
}
