import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	OUTLOOK_COMMAND_FUNCTION,
	executeCommandShortcutItem,
	executeDisconnectItem,
	executeFunctionListItem,
	executeKillAllSessionsItem,
	executeSessionCheckItem,
} from './command/outlookCommandLogic';
import { OUTLOOK_COMMAND_DEFINITIONS } from './command/outlookCommandRegistry';
import { getOutlookSessionPropertiesForWorkflow } from './connect/outlookConnectFields';
import { executeConnectItem } from './connect/outlookConnectLogic';
import {
	buildOutlookExecuteOutput,
	getOutlookSuccessBranchProperties,
	OUTLOOK_SUCCESS_BRANCH_OUTPUTS,
} from './shared/outlookSuccessBranch';

const OUTLOOK_COMMAND_OPERATION_KEYS = new Set(Object.keys(OUTLOOK_COMMAND_FUNCTION));

export class RmOutlookAutoWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM OUTLOOK AUTO',
		name: 'rmOutlookAutoWorkflow',
		icon: 'file:rmOutlookAutoWorkflow.svg',
		group: ['transform'],
		version: 1,
		description: 'Outlook Automation',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'RM OUTLOOK AUTO',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: OUTLOOK_SUCCESS_BRANCH_OUTPUTS as unknown as INodeTypeDescription['outputs'],
		outputNames: ['Success', 'Failed'],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RMO', 'OUTLOOK', 'RMOUTLOOK', 'RM OUTLOOK AUTO', 'Mail'],
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Connect',
						value: 'connect',
						description:
							'POST /outlook-auto/connect — gắn / mở Outlook COM với sessionId (GUID)',
						action: 'Connect Outlook',
					},
					{
						name: 'Disconnect',
						value: 'disconnect',
						description: 'POST /outlook-auto/disconnect — gỡ session API (không Quit Outlook nếu attach)',
						action: 'Disconnect session',
					},
					{
						name: 'Session Check',
						value: 'sessionCheck',
						description: 'POST /outlook-auto/session/check — kiểm tra session còn active',
						action: 'Check session',
					},
					{
						name: 'Function List',
						value: 'functionList',
						description:
							'GET /outlook-auto/function/list — liệt kê hàm runtime (không bắt buộc api-key)',
						action: 'List Outlook functions',
					},
					{
						name: 'Kill All Sessions',
						value: 'killAllSessions',
						description:
							'POST /outlook-auto/session/kill-all — đóng hết session Outlook API. Không cần sessionId.',
						action: 'Kill all Outlook sessions',
					},
					...OUTLOOK_COMMAND_DEFINITIONS.map((cmd) => ({
						name: cmd.displayName,
						value: cmd.operation,
						description: cmd.description,
						action: cmd.action,
					})),
				],
				default: 'connect',
			},
			...getOutlookSuccessBranchProperties(),
			...getOutlookSessionPropertiesForWorkflow(),
		] as INodeProperties[],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const branchOnSuccess = this.getNodeParameter('branchOnSuccess', 0) as boolean;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'connect') {
				returnData.push(await executeConnectItem(this, i));
			} else if (operation === 'disconnect') {
				returnData.push(await executeDisconnectItem(this, i));
			} else if (operation === 'sessionCheck') {
				returnData.push(await executeSessionCheckItem(this, i));
			} else if (operation === 'functionList') {
				returnData.push(await executeFunctionListItem(this, i));
			} else if (operation === 'killAllSessions') {
				returnData.push(await executeKillAllSessionsItem(this, i));
			} else if (OUTLOOK_COMMAND_OPERATION_KEYS.has(operation)) {
				returnData.push(await executeCommandShortcutItem(this, i, operation));
			} else {
				throw new Error(`Unsupported operation: ${operation}`);
			}
		}

		return buildOutlookExecuteOutput(returnData, branchOnSuccess);
	}
}
