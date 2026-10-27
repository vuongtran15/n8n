import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import {
	SAP_COMMAND_FUNCTION,
	executeCommandShortcutItem,
	executeDisconnectItem,
	executeKillAllSapSessionsItem,
	executeKillByAccountItem,
	executeLogItem,
	executeRosWecomSendMessageItem,
	executeSessionByAccountItem,
	executeWecomGroupMessageItem,
} from './command/sapCommandLogic';
import { SAP_COMMAND_DEFINITIONS } from './command/sapCommandRegistry';
import { getSapSessionPropertiesForWorkflow } from './openAndConnect/sapOpenConnectFields';
import { executeOpenAndConnectItem } from './openAndConnect/sapOpenConnectLogic';
import {
	buildSapExecuteOutput,
	getSapSuccessBranchProperties,
	SAP_SUCCESS_BRANCH_OUTPUTS,
} from './shared/sapSuccessBranch';

const SAP_COMMAND_OPERATION_KEYS = new Set(Object.keys(SAP_COMMAND_FUNCTION));

export class RmSapWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM SAP',
		name: 'rmSapWorkflow',
		icon: 'file:rmSapWorkflow.svg',
		group: ['transform'],
		version: 1.5,
		description:
			'SAP Automation',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'RM SAP',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: SAP_SUCCESS_BRANCH_OUTPUTS as unknown as INodeTypeDescription['outputs'],
		outputNames: ['Success', 'Failed'],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RMS', 'SAP', 'RMSAP', 'RM SAP'],
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Open and Connect',
						value: 'openAndConnect',
						description: 'POST /sap-auto/open-and-connect',
						action: 'Open and connect',
					},
					{
						name: 'Disconnect',
						value: 'disconnect',
						description: 'POST /sap-auto/disconnect — đóng một session theo sessionId',
						action: 'Disconnect session',
					},
					{
						name: 'Session By Account',
						value: 'sessionByAccount',
						description:
							'POST /sap-auto/session/by-account — liệt kê session SAP theo server/client/username',
						action: 'Get sessions by account',
					},
					{
						name: 'Kill By Account',
						value: 'killByAccount',
						description:
							'POST /sap-auto/session/kill-by-account — đóng hết session SAP của một tài khoản',
						action: 'Kill SAP sessions by account',
					},
					{
						name: 'Kill All Sessions',
						value: 'killAllSapSessions',
						description:
							'POST /sap-auto/session/kill-all — đóng mọi session SAP trên host (không đóng web/file)',
						action: 'Kill all SAP sessions',
					},
					{
						name: 'Log',
						value: 'logMessage',
						description: 'POST to logUrl',
						action: 'Send log',
					},
					{
						name: 'ROS Wecom Send Message',
						value: 'rosWecomSendMessage',
						description: 'POST https://ros.reginamiracle.com:82/api/msg/text',
						action: 'Send ROS Wecom message',
					},
					{
						name: 'Wecom Group Message',
						value: 'wecomGroupMessage',
						description: 'POST https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=',
						action: 'Send Wecom group message',
					},
					...SAP_COMMAND_DEFINITIONS.map((cmd) => ({
						name: cmd.displayName,
						value: cmd.operation,
						description: cmd.description,
						action: cmd.action,
					})),
				],
				default: 'openAndConnect',
			},
			...getSapSuccessBranchProperties(),
			...getSapSessionPropertiesForWorkflow(),
		] as INodeProperties[],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const branchOnSuccess = this.getNodeParameter('branchOnSuccess', 0) as boolean;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'openAndConnect') {
				returnData.push(await executeOpenAndConnectItem(this, i));
			} else if (operation === 'disconnect') {
				returnData.push(await executeDisconnectItem(this, i));
			} else if (operation === 'sessionByAccount') {
				returnData.push(await executeSessionByAccountItem(this, i));
			} else if (operation === 'killByAccount') {
				returnData.push(await executeKillByAccountItem(this, i));
			} else if (operation === 'killAllSapSessions') {
				returnData.push(await executeKillAllSapSessionsItem(this, i));
			} else if (operation === 'logMessage') {
				returnData.push(await executeLogItem(this, i));
			} else if (operation === 'rosWecomSendMessage') {
				returnData.push(await executeRosWecomSendMessageItem(this, i));
			} else if (operation === 'wecomGroupMessage') {
				returnData.push(await executeWecomGroupMessageItem(this, i));
			} else if (SAP_COMMAND_OPERATION_KEYS.has(operation)) {
				returnData.push(await executeCommandShortcutItem(this, i, operation));
			} else {
				throw new Error(`Unsupported operation: ${operation}`);
			}
		}

		return buildSapExecuteOutput(returnData, branchOnSuccess);
	}
}
