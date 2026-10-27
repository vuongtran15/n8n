import axios from 'axios';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { FileAutoApiResponse } from './fileApi';

function summarizeResponseBody(data: unknown): string | undefined {
	if (typeof data === 'string') {
		const trimmed = data.trim();
		return trimmed ? trimmed.slice(0, 300) : undefined;
	}
	if (typeof data === 'object' && data !== null) {
		const msg = (data as FileAutoApiResponse).Message;
		if (typeof msg === 'string' && msg.trim()) return msg.trim();
	}
	return undefined;
}

function formatFileHttpError(
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

/** POST JSON tới File-auto; chuẩn hoá lỗi và continueOnFail. */
export async function fileAutoPost(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	body: Record<string, unknown>,
	timeoutMs: number,
	sessionId: string,
	errorPrefix = 'File request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.post<FileAutoApiResponse>(url, body, {
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
			const data = error.response.data as FileAutoApiResponse | undefined;
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
				`${errorPrefix} failed (${error.response.status}): ${formatFileHttpError(
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
export async function fileAutoGet(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	timeoutMs: number,
	sessionId: string,
	errorPrefix = 'File request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.get<FileAutoApiResponse>(url, {
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
			const data = error.response.data as FileAutoApiResponse | undefined;
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
				`${errorPrefix} failed (${error.response.status}): ${formatFileHttpError(
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
