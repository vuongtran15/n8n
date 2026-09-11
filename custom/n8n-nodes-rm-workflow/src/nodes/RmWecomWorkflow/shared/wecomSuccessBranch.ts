import type { INodeExecutionData, INodeProperties } from 'n8n-workflow';

export const WECOM_SUCCESS_BRANCH_OUTPUTS = `={{!!$parameter.branchOnSuccess ? ['main', 'main'] : ['main']}}`;

export function getWecomSuccessBranchProperties(): INodeProperties[] {
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
	];
}

export function isWecomResponseSuccess(item: INodeExecutionData): boolean {
	return item.json?.Success === true;
}

export function buildWecomExecuteOutput(
	items: INodeExecutionData[],
	branchOnSuccess: boolean,
): INodeExecutionData[][] {
	if (!branchOnSuccess) {
		return [items];
	}

	const successItems: INodeExecutionData[] = [];
	const failureItems: INodeExecutionData[] = [];

	for (const item of items) {
		if (isWecomResponseSuccess(item)) {
			successItems.push(item);
		} else {
			failureItems.push(item);
		}
	}

	return [successItems, failureItems];
}
