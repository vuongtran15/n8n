import axios from 'axios';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { OutlookAutoApiResponse } from './outlookApi';

function summarizeResponseBody(data: unknown): string | undefined {
	if (typeof data === 'string') {
		const trimmed = data.trim();
		return trimmed ? trimmed.slice(0, 300) : undefined;
	}
	if (typeof data === 'object' && data !== null) {
		const msg = (data as OutlookAutoApiResponse).Message;
		if (typeof msg === 'string' && msg.trim()) return msg.trim();
	}
	return undefined;
}

function formatOutlookHttpError(
	status: number,
	url: string,
	timeoutMs: number,
	data: unknown,
	fallbackMessage: string,
): string {
	const detail = summarizeResponseBody(data) ?? fallbackMessage;
	if (status === 502 || status === 503 || status === 504) {
		return (
			`${detail} — HTTP ${status} từ gateway/proxy hoặc upstream (${timeoutMs / 1000}s timeout node). ` +
			`Kiểm tra nginx/IIS trước port worker hoặc gọi thẳng RMIV.WF.CLIENT. URL: ${url}`
		);
	}
	return detail;
}

/** POST JSON tới Outlook Automation; chuẩn hoá lỗi và continueOnFail. */
export async function outlookAutoPost(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	body: Record<string, unknown>,
	timeoutMs: number,
	sessionId: string,
	errorPrefix = 'Outlook request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.post<OutlookAutoApiResponse>(url, body, {
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
			const data = error.response.data as OutlookAutoApiResponse | undefined;
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
				`${errorPrefix} failed (${error.response.status}): ${formatOutlookHttpError(
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

/** GET JSON (function/list — public, vẫn gửi api-key nếu có). */
export async function outlookAutoGet(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	timeoutMs: number,
	sessionId: string,
	errorPrefix = 'Outlook request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.get<OutlookAutoApiResponse>(url, {
			headers: {
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
			const data = error.response.data as OutlookAutoApiResponse | undefined;
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
				`${errorPrefix} failed (${error.response.status}): ${formatOutlookHttpError(
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
