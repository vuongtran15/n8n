import axios from 'axios';
import type { IDataObject, IExecuteFunctions, INodeExecutionData } from 'n8n-workflow';

import { normalizeWecomResponse, type WecomApiResponse } from './wecomApi';

function summarizeResponseBody(data: unknown): string | undefined {
	if (typeof data === 'string') {
		const trimmed = data.trim();
		return trimmed ? trimmed.slice(0, 300) : undefined;
	}
	if (typeof data === 'object' && data !== null) {
		const obj = data as WecomApiResponse;
		const msg = obj.message ?? obj.Message;
		if (typeof msg === 'string' && msg.trim()) return msg.trim();
	}
	return undefined;
}

function formatWecomHttpError(
	status: number,
	url: string,
	timeoutMs: number,
	data: unknown,
	fallbackMessage: string,
): string {
	const detail = summarizeResponseBody(data) ?? fallbackMessage;
	if (status === 502 || status === 503 || status === 504) {
		return (
			`${detail} — HTTP ${status} từ portal/upstream (${timeoutMs / 1000}s timeout node). ` +
			`URL: ${url}`
		);
	}
	return detail;
}

function buildErrorPayload(
	outputBase: IDataObject,
	data: unknown,
	status: number,
	fallbackMessage: string,
): IDataObject {
	const normalized =
		typeof data === 'object' && data !== null
			? normalizeWecomResponse(data)
			: { Success: false, Message: fallbackMessage };
	return {
		...outputBase,
		...normalized,
		Success: false,
		Message:
			(typeof normalized.Message === 'string' && normalized.Message) ||
			fallbackMessage,
		statusCode: status,
	};
}

/** POST JSON (send-text). */
export async function wecomJsonPost(
	ctx: IExecuteFunctions,
	url: string,
	body: Record<string, unknown>,
	timeoutMs: number,
	errorPrefix = 'WeCom request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.post<unknown>(url, body, {
			headers: {
				'Content-Type': 'application/json',
			},
			timeout: timeoutMs,
			proxy: false,
		});

		return {
			json: {
				...outputBase,
				...normalizeWecomResponse(response.data),
				statusCode: response.status,
			} as IDataObject,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			const payload = buildErrorPayload(
				outputBase,
				error.response.data,
				error.response.status,
				error.message,
			);
			if (ctx.continueOnFail()) {
				return { json: payload };
			}
			throw new Error(
				`${errorPrefix} failed (${error.response.status}): ${formatWecomHttpError(
					error.response.status,
					url,
					timeoutMs,
					error.response.data,
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

/** POST multipart (send-image / send-file). */
export async function wecomMultipartPost(
	ctx: IExecuteFunctions,
	url: string,
	form: FormData,
	timeoutMs: number,
	errorPrefix = 'WeCom request',
	outputBase: IDataObject = {},
): Promise<INodeExecutionData> {
	try {
		const response = await axios.post<unknown>(url, form, {
			timeout: timeoutMs,
			proxy: false,
		});

		return {
			json: {
				...outputBase,
				...normalizeWecomResponse(response.data),
				statusCode: response.status,
			} as IDataObject,
		};
	} catch (error) {
		if (axios.isAxiosError(error) && error.response) {
			const payload = buildErrorPayload(
				outputBase,
				error.response.data,
				error.response.status,
				error.message,
			);
			if (ctx.continueOnFail()) {
				return { json: payload };
			}
			throw new Error(
				`${errorPrefix} failed (${error.response.status}): ${formatWecomHttpError(
					error.response.status,
					url,
					timeoutMs,
					error.response.data,
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
