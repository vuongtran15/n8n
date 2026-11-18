import axios from 'axios';
import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

const DEFAULT_BASE_URL = 'https://ros.reginamiracle.com:200';
const DEFAULT_PATH_PREFIX = '/api/n8n/stt-app-send/check-wecom';
const DEFAULT_TIMEOUT_SECONDS = 30;

function valueFromItemJson(itemJson: IDataObject, canonicalKey: string): unknown {
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

/** Ô trên form thắng JSON input — tránh RM Init đè baseUrl sang :8081. */
function preferFormStr(formVal: string, itemJson: IDataObject, ...jsonKeys: string[]): string {
	const form = formVal.trim();
	if (form !== '') return form;
	for (const key of jsonKeys) {
		const v = valueFromItemJson(itemJson, key);
		if (v === undefined || v === null) continue;
		const s = String(v).trim();
		if (s !== '') return s;
	}
	return '';
}

function asObject(data: unknown): IDataObject {
	if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
		return data[0] as IDataObject;
	}
	if (typeof data === 'object' && data !== null) {
		return data as IDataObject;
	}
	return { result: data } as IDataObject;
}

/** True khi đã gửi (Sent === true). */
function isSentTrue(payload: IDataObject): boolean {
	return payload.Sent === true || payload.sent === true;
}

/**
 * RM ROS STT Sent Status — GET check-wecom theo executionId, tách nhánh True/False theo Sent.
 */
export class RmRosSttSentStatus implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM ROS STT Sent Status',
		name: 'rmRosSttSentStatus',
		icon: { light: 'file:icon.svg', dark: 'file:icon.dark.svg' },
		iconColor: 'pink-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["executionId"] || "check-wecom"}}',
		description:
			'Kiểm tra STT đã gửi WeCom/mail theo executionId — nhánh True (Sent) / False (chưa gửi)',
		defaults: {
			name: 'RM ROS STT Sent Status',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main, NodeConnectionTypes.Main],
		outputNames: ['True', 'False'],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: [
				'RM',
				'ROS',
				'STT',
				'Sent',
				'Status',
				'WeCom',
				'check-wecom',
				'executionId',
			],
		},
		properties: [
			{
				displayName: 'Tips',
				name: 'tips',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'GET …/check-wecom/{executionId}. Không dùng sessionId. Portal :200 — Base URL trên form thắng JSON (RM Init không đè). API Key để trống. True = Sent === true.',
			},
			{
				displayName: 'Base URL',
				name: 'baseUrl',
				type: 'string',
				default: DEFAULT_BASE_URL,
				placeholder: 'https://ros.reginamiracle.com:200',
				description:
					'Host API (không kèm path). Ô form thắng JSON input. Mặc định portal :200 — không cần sessionId / api-key.',
			},
			{
				displayName: 'API Key',
				name: 'apiKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				placeholder: 'để trống với portal :200',
				description:
					'Header api-key. Portal :200 để trống. Chỉ điền khi chủ động gọi gateway :8081. Ô form thắng JSON.',
			},
			{
				displayName: 'Execution ID',
				name: 'executionId',
				type: 'string',
				default: '={{ $execution.id }}',
				required: true,
				placeholder: '={{ $execution.id }}',
				description:
					'ID execution n8n (không phải sessionId). Mặc định $execution.id.',
			},
			{
				displayName: 'Request Timeout (Seconds)',
				name: 'requestTimeoutSeconds',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: DEFAULT_TIMEOUT_SECONDS,
				description: 'Timeout HTTP (giây).',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const trueOut: INodeExecutionData[] = [];
		const falseOut: INodeExecutionData[] = [];

		const inputItems = items.length > 0 ? items : [{ json: {} as IDataObject }];

		for (let i = 0; i < inputItems.length; i++) {
			const itemJson = (inputItems[i]?.json ?? {}) as IDataObject;
			// Form thắng JSON — không lấy sessionId; không để RM Init đè baseUrl sang :8081.
			const baseUrl = (
				preferFormStr(
					String(this.getNodeParameter('baseUrl', i, DEFAULT_BASE_URL) ?? ''),
					itemJson,
					'baseUrl',
				) || DEFAULT_BASE_URL
			).replace(/\/+$/, '');

			const executionId = preferFormStr(
				String(this.getNodeParameter('executionId', i, '') ?? ''),
				itemJson,
				'executionId',
				'ExecutionId',
			);

			// Chỉ lấy từ form — không lấy apiKey/sessionId từ JSON RM Init.
			const apiKey = String(this.getNodeParameter('apiKey', i, '') ?? '').trim();

			let timeoutSeconds = this.getNodeParameter(
				'requestTimeoutSeconds',
				i,
				DEFAULT_TIMEOUT_SECONDS,
			) as number;
			const timeoutRaw = valueFromItemJson(itemJson, 'requestTimeoutSeconds');
			if (timeoutRaw !== undefined && timeoutRaw !== null && String(timeoutRaw).trim() !== '') {
				const n = Number(timeoutRaw);
				if (!Number.isFinite(n) || n <= 0) {
					throw new Error('"requestTimeoutSeconds" trong JSON input phải là số > 0.');
				}
				timeoutSeconds = n;
			}

			const pushFalse = (json: IDataObject) => {
				falseOut.push({
					json: { ...json, Sent: false, branch: false },
					pairedItem: { item: i },
				});
			};

			if (!executionId || executionId === '0' || executionId === 'undefined') {
				pushFalse({
					Ok: false,
					Found: false,
					Message: 'executionId không hợp lệ.',
					ExecutionId: null,
					Sent: false,
				});
				continue;
			}

			const url = `${baseUrl}${DEFAULT_PATH_PREFIX}/${encodeURIComponent(executionId)}`;
			const headers: Record<string, string> = {};
			if (apiKey) {
				headers['api-key'] = apiKey;
			}

			try {
				const response = await axios.get<unknown>(url, {
					timeout: timeoutSeconds * 1000,
					proxy: false,
					headers,
					validateStatus: () => true,
				});

				const payload = asObject(response.data);
				const sent = isSentTrue(payload);
				const entry: INodeExecutionData = {
					json: {
						...payload,
						Sent: sent,
						branch: sent,
						httpStatus: response.status,
						requestUrl: url,
					},
					pairedItem: { item: i },
				};

				if (sent) {
					trueOut.push(entry);
				} else {
					falseOut.push(entry);
				}
			} catch (error) {
				if (axios.isAxiosError(error)) {
					const data = error.response?.data as IDataObject | undefined;
					const message =
						(typeof data?.Message === 'string' && data.Message) ||
						(typeof data?.message === 'string' && data.message) ||
						error.message;
					const payload: IDataObject = {
						...(typeof data === 'object' && data !== null ? data : {}),
						Ok: false,
						Found: false,
						Sent: false,
						Message: message,
						ExecutionId: executionId,
						requestUrl: url,
						branch: false,
					};
					if (this.continueOnFail()) {
						falseOut.push({ json: payload, pairedItem: { item: i } });
						continue;
					}
					throw new Error(
						`RM ROS STT Sent Status failed${error.response ? ` (${error.response.status})` : ''}: ${message}`,
					);
				}
				throw error;
			}
		}

		return [trueOut, falseOut];
	}
}
