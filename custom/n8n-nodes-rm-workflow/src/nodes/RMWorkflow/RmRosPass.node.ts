import axios from 'axios';
import {
	NodeConnectionTypes,
	type IDataObject,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

const DEFAULT_URL =
	'https://ros.reginamiracle.com:200/api/portal/share/ros/auth/temp-password';
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

function preferStr(itemJson: IDataObject, key: string, formVal: string): string {
	const v = valueFromItemJson(itemJson, key);
	if (v === undefined || v === null) return formVal;
	const s = String(v).trim();
	return s !== '' ? s : formVal;
}

/**
 * RM ROS PASS — lấy mật khẩu tạm từ portal ROS share API.
 * Không cần Bearer / api-key SAP.
 */
export class RmRosPass implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM ROS PASS',
		name: 'rmRosPass',
		icon: { light: 'file:icon.svg', dark: 'file:icon.dark.svg' },
		iconColor: 'pink-red',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["empId"]}}',
		description:
			'POST /api/portal/share/ros/auth/temp-password — lấy temp password ROS theo EmpId + SecurityKey',
		defaults: {
			name: 'RM ROS PASS',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RM', 'ROS', 'PASS', 'Temp Password', 'temp-password', 'EmpId', 'SecurityKey'],
		},
		properties: [
			{
				displayName: 'Tips',
				name: 'tips',
				type: 'notice',
				default: '',
				typeOptions: { theme: 'info' },
				description:
					'Không cần đăng nhập / Bearer. Ưu tiên field từ JSON input: EmpId, SecurityKey (hoặc empId, securityKey). Tùy chọn: requestTimeoutSeconds.',
			},
			{
				displayName: 'Emp ID',
				name: 'empId',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'A246780',
				description: 'Mã nhân viên (EmpId). Alias JSON: EmpId / empId.',
			},
			{
				displayName: 'Security Key',
				name: 'securityKey',
				type: 'string',
				typeOptions: { password: true },
				default: '',
				required: true,
				placeholder: 'SecurityKey',
				description: 'SecurityKey portal ROS. Alias JSON: SecurityKey / securityKey.',
			},
			{
				displayName: 'Request Timeout (Seconds)',
				name: 'requestTimeoutSeconds',
				type: 'number',
				typeOptions: { minValue: 1 },
				default: DEFAULT_TIMEOUT_SECONDS,
				description: 'Timeout HTTP khi gọi portal ROS.',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const itemJson = items[i]?.json ?? {};
			const empId = preferStr(
				itemJson,
				'EmpId',
				(this.getNodeParameter('empId', i, '') as string).trim(),
			).trim();
			const securityKey = preferStr(
				itemJson,
				'SecurityKey',
				(this.getNodeParameter('securityKey', i, '') as string).trim(),
			).trim();

			if (!empId) {
				throw new Error('EmpId không được rỗng.');
			}
			if (!securityKey) {
				throw new Error('SecurityKey không được rỗng.');
			}

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

			try {
				const response = await axios.post<unknown>(
					DEFAULT_URL,
					{ EmpId: empId, SecurityKey: securityKey },
					{
						headers: { 'Content-Type': 'application/json' },
						timeout: timeoutSeconds * 1000,
						proxy: false,
					},
				);

				const data = response.data;
				const asObj: IDataObject =
					typeof data === 'object' && data !== null
						? (data as IDataObject)
						: ({ result: data } as IDataObject);
				const successExplicit =
					asObj.Success === true ||
					asObj.success === true ||
					(typeof asObj.errCode === 'number' && asObj.errCode === 0) ||
					(typeof asObj.ErrCode === 'number' && asObj.ErrCode === 0);
				const failedExplicit = asObj.Success === false || asObj.success === false;

				returnData.push({
					json: {
						...asObj,
						Success: failedExplicit
							? false
							: successExplicit || (response.status >= 200 && response.status < 300),
						statusCode: response.status,
						rosTempPasswordUrl: DEFAULT_URL,
						EmpId: empId,
					} as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (axios.isAxiosError(error) && error.response) {
					const data = error.response.data as IDataObject | undefined;
					const message =
						(typeof data?.Message === 'string' && data.Message) ||
						(typeof data?.message === 'string' && data.message) ||
						error.message;
					const payload: IDataObject = {
						...(typeof data === 'object' && data !== null ? data : {}),
						Success: false,
						Message: message,
						statusCode: error.response.status,
						rosTempPasswordUrl: DEFAULT_URL,
						EmpId: empId,
					};
					if (this.continueOnFail()) {
						returnData.push({ json: payload, pairedItem: { item: i } });
						continue;
					}
					throw new Error(`RM ROS PASS failed (${error.response.status}): ${message}`);
				}
				if (axios.isAxiosError(error)) {
					const detail = [error.code, error.message].filter(Boolean).join(' — ');
					throw new Error(
						`RM ROS PASS failed: không kết nối được tới "${DEFAULT_URL}" (${detail}).`,
					);
				}
				throw error;
			}
		}

		return [returnData];
	}
}
