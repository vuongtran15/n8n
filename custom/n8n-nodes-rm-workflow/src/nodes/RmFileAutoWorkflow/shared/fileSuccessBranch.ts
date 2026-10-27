import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const FILE_SUCCESS_BRANCH_OUTPUTS = `={{!!$parameter.branchOnSuccess ? ['main', 'main'] : ['main']}}`;

export function getFileSuccessBranchProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Branch on Success',
			name: 'branchOnSuccess',
			type: 'boolean',
			default: false,
			description:
				'Khi bật: 2 output — Success / Failed. File/Excel nên kiểm tra cả Success envelope và Result.Success khi có.',
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
				'Success: HTTP Success=true và (nếu Result có Success) Result.Success=true. Failed: còn lại hoặc Continue On Fail.',
		},
	];
}

export function isFileResponseSuccess(item: INodeExecutionData): boolean {
	if (item.json?.Success !== true) return false;
	const result = item.json?.Result;
	if (result !== null && typeof result === 'object' && !Array.isArray(result)) {
		const inner = (result as { Success?: unknown }).Success;
		if (inner === false) return false;
	}
	return true;
}

export function buildFileExecuteOutput(
	items: INodeExecutionData[],
	branchOnSuccess: boolean,
): INodeExecutionData[][] {
	if (!branchOnSuccess) {
		return [items];
	}

	const successItems: INodeExecutionData[] = [];
	const failureItems: INodeExecutionData[] = [];

	for (const item of items) {
		if (isFileResponseSuccess(item)) {
			successItems.push(item);
		} else {
			failureItems.push(item);
		}
	}

	return [successItems, failureItems];
}
