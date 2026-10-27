import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const SAP_SUCCESS_BRANCH_OUTPUTS = `={{!!$parameter.branchOnSuccess ? ['main', 'main'] : ['main']}}`;

export function getSapSuccessBranchProperties(): INodeProperties[] {
	return [
		{
			displayName: 'Branch on Success',
			name: 'branchOnSuccess',
			type: 'boolean',
			default: false,
			description:
				'Khi bật: node có 2 output — Success (response.Success === true) và Failed (còn lại). Khi tắt: một output như hiện tại, mọi item đi nhánh chính.',
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
	];
}

export function isSapResponseSuccess(item: INodeExecutionData): boolean {
	return item.json?.Success === true;
}

export function buildSapExecuteOutput(
	items: INodeExecutionData[],
	branchOnSuccess: boolean,
): INodeExecutionData[][] {
	if (!branchOnSuccess) {
		return [items];
	}

	const successItems: INodeExecutionData[] = [];
	const failureItems: INodeExecutionData[] = [];

	for (const item of items) {
		if (isSapResponseSuccess(item)) {
			successItems.push(item);
		} else {
			failureItems.push(item);
		}
	}

	return [successItems, failureItems];
}
