import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	WEB_COMMAND_FUNCTION,
	executeCommandShortcutItem,
	executeDisconnectItem,
	executeKillAllSessionsItem,
	executeSessionCheckItem,
} from './command/webCommandLogic';
import { WEB_COMMAND_DEFINITIONS } from './command/webCommandRegistry';
import { getWebSessionPropertiesForWorkflow } from './connect/webConnectFields';
import { executeConnectItem } from './connect/webConnectLogic';
import {
	buildWebExecuteOutput,
	getWebSuccessBranchProperties,
	WEB_SUCCESS_BRANCH_OUTPUTS,
} from './shared/webSuccessBranch';

const WEB_COMMAND_OPERATION_KEYS = new Set(Object.keys(WEB_COMMAND_FUNCTION));

export class RmWebAutoWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM WEB AUTO',
		name: 'rmWebAutoWorkflow',
		icon: 'file:rmWebAutoWorkflow.svg',
		group: ['transform'],
		version: 1,
		description:
			'Web Automation',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'RM WEB AUTO',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: WEB_SUCCESS_BRANCH_OUTPUTS as unknown as INodeTypeDescription['outputs'],
		outputNames: ['Success', 'Failed'],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RMW', 'WEB', 'RMWEB', 'RM WEB AUTO', 'Playwright'],
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
						description: 'POST /web-auto/connect — mở browser Playwright với sessionId (GUID)',
						action: 'Connect browser',
					},
					{
						name: 'Disconnect',
						value: 'disconnect',
						description: 'POST /web-auto/disconnect — đóng browser và giải phóng session',
						action: 'Disconnect session',
					},
					{
						name: 'Session Check',
						value: 'sessionCheck',
						description: 'POST /web-auto/session/check — kiểm tra session còn active',
						action: 'Check session',
					},
					{
						name: 'Kill All Sessions',
						value: 'killAllSessions',
						description:
							'POST /web-auto/session/kill-all — đóng hết browser web (headless + có UI). Không cần sessionId.',
						action: 'Kill all web sessions',
					},
					...WEB_COMMAND_DEFINITIONS.map((cmd) => ({
						name: cmd.displayName,
						value: cmd.operation,
						description: cmd.description,
						action: cmd.action,
					})),
				],
				default: 'connect',
			},
			...getWebSuccessBranchProperties(),
			...getWebSessionPropertiesForWorkflow(),
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
			} else if (operation === 'killAllSessions') {
				returnData.push(await executeKillAllSessionsItem(this, i));
			} else if (WEB_COMMAND_OPERATION_KEYS.has(operation)) {
				returnData.push(await executeCommandShortcutItem(this, i, operation));
			} else {
				throw new Error(`Unsupported operation: ${operation}`);
			}
		}

		return buildWebExecuteOutput(returnData, branchOnSuccess);
	}
}
