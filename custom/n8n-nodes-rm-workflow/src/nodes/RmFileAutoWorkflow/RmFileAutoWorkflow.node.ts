import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	FILE_COMMAND_FUNCTION,
	executeCommandShortcutItem,
	executeDisconnectItem,
	executeFunctionListItem,
	executeSessionCheckItem,
} from './command/fileCommandLogic';
import { FILE_COMMAND_DEFINITIONS } from './command/fileCommandRegistry';
import { getFileSessionPropertiesForWorkflow } from './connect/fileConnectFields';
import { executeConnectItem } from './connect/fileConnectLogic';
import {
	buildFileExecuteOutput,
	getFileSuccessBranchProperties,
	FILE_SUCCESS_BRANCH_OUTPUTS,
} from './shared/fileSuccessBranch';

const FILE_COMMAND_OPERATION_KEYS = new Set(Object.keys(FILE_COMMAND_FUNCTION));

export class RmFileAutoWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM FILE AUTO',
		name: 'rmFileAutoWorkflow',
		icon: 'file:rmFileAutoWorkflow.svg',
		group: ['transform'],
		version: 1,
		description: 'File & Excel Automation (/file-auto)',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'RM FILE AUTO',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: FILE_SUCCESS_BRANCH_OUTPUTS as unknown as INodeTypeDescription['outputs'],
		outputNames: ['Success', 'Failed'],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RMF', 'FILE', 'RMFILE', 'RM FILE AUTO', 'Excel', 'EPPlus', 'xlsx'],
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
							'POST /file-auto/connect — mở session với rootDirectory sandbox trên worker',
						action: 'Connect file session',
					},
					{
						name: 'Disconnect',
						value: 'disconnect',
						description: 'POST /file-auto/disconnect — đóng session file',
						action: 'Disconnect file session',
					},
					{
						name: 'Session Check',
						value: 'sessionCheck',
						description: 'POST /file-auto/session/check — kiểm tra session còn active',
						action: 'Check file session',
					},
					{
						name: 'Function List',
						value: 'functionList',
						description:
							'GET /file-auto/function/list — liệt kê hàm runtime (không bắt buộc api-key)',
						action: 'List file functions',
					},
					...FILE_COMMAND_DEFINITIONS.map((cmd) => ({
						name: cmd.displayName,
						value: cmd.operation,
						description: cmd.description,
						action: cmd.action,
					})),
				],
				default: 'connect',
			},
			...getFileSuccessBranchProperties(),
			...getFileSessionPropertiesForWorkflow(),
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
			} else if (FILE_COMMAND_OPERATION_KEYS.has(operation)) {
				returnData.push(await executeCommandShortcutItem(this, i, operation));
			} else {
				throw new Error(`Unsupported operation: ${operation}`);
			}
		}

		return buildFileExecuteOutput(returnData, branchOnSuccess);
	}
}
