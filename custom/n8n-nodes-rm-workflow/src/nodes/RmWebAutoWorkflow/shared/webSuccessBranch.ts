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
				'Khi bật: node có 2 output — Success (response.Success === true) và Failed (còn lại). Khi tắt: một output, mọi item đi nhánh chính dù Success true hay false.',
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
				'Output Success: item có Success = true. Output Failed: Success = false, thiếu field Success, hoặc lỗi được trả về khi bật Continue On Fail.',
		},
		{
			displayName: 'Throw on Success False',
			name: 'throwOnSuccessFalse',
			type: 'boolean',
			default: false,
			description:
				'Khi bật: nếu response.Success !== true thì ném exception (dừng node / workflow). Message lấy từ field Message của API. Vẫn tôn trọng Continue On Fail của n8n.',
		},
	];
}

export function isWebResponseSuccess(item: INodeExecutionData): boolean {
	return item.json?.Success === true;
}

export function assertWebSuccessOrThrow(item: INodeExecutionData, operation: string): void {
	if (isWebResponseSuccess(item)) return;

	const rawMessage = item.json?.Message;
	const message =
		typeof rawMessage === 'string' && rawMessage.trim()
			? rawMessage.trim()
			: 'Success = false';
	throw new Error(`Web ${operation} failed: ${message}`);
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
