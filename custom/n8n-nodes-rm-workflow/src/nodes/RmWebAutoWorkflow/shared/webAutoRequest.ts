import axios from 'axios';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import type { WebAutoApiResponse } from './webApi';

function summarizeResponseBody(data: unknown): string | undefined {
	if (typeof data === 'string') {
		const trimmed = data.trim();
		return trimmed ? trimmed.slice(0, 300) : undefined;
	}
	if (typeof data === 'object' && data !== null) {
		const msg = (data as WebAutoApiResponse).Message;
		if (typeof msg === 'string' && msg.trim()) return msg.trim();
	}
	return undefined;
}

function formatWebHttpError(
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

/** POST JSON tới Web Automation; chuẩn hoá lỗi và continueOnFail. */
export async function webAutoPost(
	ctx: IExecuteFunctions,
	url: string,
	apiKey: string,
	body: Record<string, unknown>,
	timeoutMs: number,
	sessionId: string,
	errorPrefix = 'Web request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.post<WebAutoApiResponse>(url, body, {
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
			const data = error.response.data as WebAutoApiResponse | undefined;
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
				`${errorPrefix} failed (${error.response.status}): ${formatWebHttpError(
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
