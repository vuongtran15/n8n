import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const WEB_SUCCESS_BRANCH_OUTPUTS = `={{!!$parameter.branchOnSuccess ? ['main', 'main'] : ['main']}}`;

export function getWebSuccessBranchProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Branch on Success',
			name: 'branchOnSuccess',
			type: 'boolean',
			default: false,
			description:
				'Khi bật: 2 output — Success / Failed. Success = envelope.Success === true và (nếu có) Result.Success !== false. Khi tắt: một output cho mọi item.',
		},
		{
			displayName: 'Success Branching',
			name: 'branchOnSuccessInfo',
			type: 'notice',
			default: '',
			displayOptions: {
				show: {
					branchOnSuccess: [true],
				},
			},
			typeOptions: {
				theme: 'info',
			},
			description:
				'Success: HTTP Success=true và (nếu Result có Success) Result.Success=true. Failed: Success=false, Result.Success=false (vd. timeout selector), hoặc Continue On Fail.',
		},
		{
			displayName: 'Throw on Success False',
			name: 'throwOnSuccessFalse',
			type: 'boolean',
			default: false,
			description:
				'Khi bật: nếu envelope Success !== true hoặc Result.Success === false thì ném exception. Message ưu tiên Result.Message rồi Message. Vẫn tôn trọng Continue On Fail của n8n.',
		},
	];
}

export function isWebResponseSuccess(item: INodeExecutionData): boolean {
	if (item.json?.Success !== true) return false;
	const result = item.json?.Result;
	if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
		const inner = (result as { Success?: unknown }).Success;
		if (inner === false) return false;
	}
	return true;
}

function pickWebFailureMessage(item: INodeExecutionData): string {
	const result = item.json?.Result;
	if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
		const innerMessage = (result as { Message?: unknown }).Message;
		if (typeof innerMessage === 'string' && innerMessage.trim()) {
			return innerMessage.trim();
		}
	}
	const outerMessage = item.json?.Message;
	if (typeof outerMessage === 'string' && outerMessage.trim()) {
		return outerMessage.trim();
	}
	return 'Success = false';
}

export function assertWebSuccessOrThrow(item: INodeExecutionData, operation: string): void {
	if (isWebResponseSuccess(item)) return;
	throw new Error(`Web ${operation} failed: ${pickWebFailureMessage(item)}`);
}

export function buildWebExecuteOutput(
	items: INodeExecutionData[],
	branchOnSuccess: boolean,
): INodeExecutionData[][] {
	if (!branchOnSuccess) {
		return [items];
	}

	const successItems: INodeExecutionData[] = [];
	const failureItems: INodeExecutionData[] = [];

	for (const item of items) {
		if (isWebResponseSuccess(item)) {
			successItems.push(item);
		} else {
			failureItems.push(item);
		}
	}

	return [successItems, failureItems];
}
