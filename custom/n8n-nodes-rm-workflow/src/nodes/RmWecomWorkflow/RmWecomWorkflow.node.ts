import {
	NodeConnectionTypes,
	type IExecuteFunctions,
	type INodeExecutionData,
	type INodeProperties,
	type INodeType,
	type INodeTypeDescription,
} from 'n8n-workflow';

import { getWecomPropertiesForWorkflow } from './command/wecomCommandFields';
import {
	executeSendFileItem,
	executeSendImageItem,
	executeSendMarkdownItem,
	executeSendTextItem,
} from './command/wecomCommandLogic';
import {
	buildWecomExecuteOutput,
	getWecomSuccessBranchProperties,
	WECOM_SUCCESS_BRANCH_OUTPUTS,
} from './shared/wecomSuccessBranch';

export class RmWecomWorkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM WECOM',
		name: 'rmWecomWorkflow',
		icon: 'file:rmWecomWorkflow.svg',
		group: ['transform'],
		version: 1,
		description: 'Gửi tin nhóm WeCom qua portal RMAI (/api/n8n/wecom)',
		subtitle: '={{$parameter["operation"]}}',
		defaults: {
			name: 'RM WECOM',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: WECOM_SUCCESS_BRANCH_OUTPUTS as unknown as INodeTypeDescription['outputs'],
		outputNames: ['Success', 'Failed'],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['RMW', 'WECOM', 'RMWECOM', 'RM WECOM', 'WeChat Work', '企业微信'],
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Send Text',
						value: 'sendText',
						description: 'POST /api/n8n/wecom/send-text — gửi plain text (+ mention tùy chọn)',
						action: 'Send WeCom text',
					},
					{
						name: 'Send Markdown',
						value: 'sendMarkdown',
						description:
							'POST /api/n8n/wecom/send-markdown — gửi markdown WeCom (mention bằng <@userid>)',
						action: 'Send WeCom markdown',
					},
					{
						name: 'Send Image',
						value: 'sendImage',
						description:
							'POST /api/n8n/wecom/send-image — gửi ảnh JPG/PNG ≤ 2 MB (multipart, từ binary)',
						action: 'Send WeCom image',
					},
					{
						name: 'Send File',
						value: 'sendFile',
						description:
							'POST /api/n8n/wecom/send-file — gửi file ≤ 20 MB (multipart, từ binary)',
						action: 'Send WeCom file',
					},
				],
				default: 'sendText',
			},
			...getWecomSuccessBranchProperties(),
			...getWecomPropertiesForWorkflow(),
		] as INodeProperties[],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const branchOnSuccess = this.getNodeParameter('branchOnSuccess', 0) as boolean;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			const operation = this.getNodeParameter('operation', i) as string;

			if (operation === 'sendText') {
				returnData.push(await executeSendTextItem(this, i));
			} else if (operation === 'sendMarkdown') {
				returnData.push(await executeSendMarkdownItem(this, i));
			} else if (operation === 'sendImage') {
				returnData.push(await executeSendImageItem(this, i));
			} else if (operation === 'sendFile') {
				returnData.push(await executeSendFileItem(this, i));
			} else {
				throw new Error(`Unsupported operation: ${operation}`);
			}
		}

		return buildWecomExecuteOutput(returnData, branchOnSuccess);
	}
}
