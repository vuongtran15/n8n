import { NodeConnectionTypes, NodeOperationError, parseErrorMetadata } from 'n8n-workflow';
import type {
	ExecuteWorkflowData,
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { getWorkflowInfo } from '../../ExecuteWorkflow/ExecuteWorkflow/GenericFunctions';
import { localResourceMapping } from '../../ExecuteWorkflow/ExecuteWorkflow/methods';
import { getCurrentWorkflowInputData } from '../../../utils/workflowInputsResourceMapping/GenericFunctions';

/**
 * RM Workflow — Call Subworkflow
 * Pick a workflow by ID; UI auto-loads that sub-workflow's declared input fields.
 */
export class RmCallSubworkflow implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'RM Call Subworkflow',
		name: 'rmCallSubworkflow',
		icon: 'fa:sitemap',
		iconColor: 'blue',
		group: ['transform'],
		version: 1.1,
		subtitle: '={{"RM → " + $parameter["workflowId"]}}',
		description: 'Call a sub-workflow by ID and map its declared inputs',
		defaults: {
			name: 'RM Call Subworkflow',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		codex: {
			categories: ['RM Workflow'],
			subcategories: {
				'RM Workflow': ['RM Workflow'],
			},
			alias: ['rm', 'subworkflow', 'execute workflow'],
		},
		properties: [
			{
				displayName: 'Workflow',
				name: 'workflowId',
				type: 'workflowSelector',
				default: '',
				required: true,
			},
			{
				displayName: 'Workflow Inputs',
				name: 'workflowInputs',
				type: 'resourceMapper',
				noDataExpression: true,
				default: {
					mappingMode: 'defineBelow',
					value: null,
				},
				required: true,
				typeOptions: {
					loadOptionsDependsOn: ['workflowId.value'],
					resourceMapper: {
						localResourceMapperMethod: 'loadSubWorkflowInputs',
						valuesLabel: 'Workflow Inputs',
						mode: 'map',
						fieldWords: {
							singular: 'input',
							plural: 'inputs',
						},
						addAllFields: true,
						multiKeyMatch: false,
						supportAutoMap: false,
						showTypeConversionOptions: true,
						refreshStaleSchemaOnOpen: true,
					},
				},
				displayOptions: {
					hide: {
						workflowId: [''],
					},
				},
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Run once with all items',
						value: 'once',
						description: 'Pass all items into a single execution of the sub-workflow',
					},
					{
						name: 'Run once for each item',
						value: 'each',
						description: 'Call the sub-workflow individually for each item',
					},
				],
				default: 'once',
			},
			{
				displayName: 'Options',
				name: 'options',
				type: 'collection',
				default: {},
				placeholder: 'Add option',
				options: [
					{
						displayName: 'Wait For Sub-Workflow Completion',
						name: 'waitForSubWorkflow',
						type: 'boolean',
						default: true,
						description:
							'Whether the main workflow should wait for the sub-workflow to finish before continuing',
					},
				],
			},
		],
	};

	methods = {
		localResourceMapping,
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const source = 'database';
		const mode = this.getNodeParameter('mode', 0, false) as string;
		const items = getCurrentWorkflowInputData.call(this);

		const workflowProxy = this.getWorkflowDataProxy(0);
		const currentWorkflowId = workflowProxy.$workflow.id as string;

		if (mode === 'each') {
			const returnData: INodeExecutionData[][] = [];

			for (let i = 0; i < items.length; i++) {
				try {
					const waitForSubWorkflow = this.getNodeParameter(
						'options.waitForSubWorkflow',
						i,
						true,
					) as boolean;
					const workflowInfo = await getWorkflowInfo.call(this, source, i);

					if (waitForSubWorkflow) {
						const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
							workflowInfo,
							[items[i]],
							undefined,
							{
								parentExecution: {
									executionId: workflowProxy.$execution.id,
									workflowId: workflowProxy.$workflow.id,
									shouldResume: waitForSubWorkflow,
								},
								executionMode: this.getMode(),
							},
						);
						const workflowResult = executionResult.data as INodeExecutionData[][];

						for (const [outputIndex, outputData] of workflowResult.entries()) {
							for (const item of outputData) {
								item.pairedItem = { item: i };
								item.metadata = {
									subExecution: {
										executionId: executionResult.executionId,
										workflowId: workflowInfo.id ?? currentWorkflowId,
									},
								};
							}

							if (returnData[outputIndex] === undefined) {
								returnData[outputIndex] = [];
							}

							returnData[outputIndex].push(...outputData);
						}
					} else {
						const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
							workflowInfo,
							[items[i]],
							undefined,
							{
								doNotWaitToFinish: true,
								parentExecution: {
									executionId: workflowProxy.$execution.id,
									workflowId: workflowProxy.$workflow.id,
									shouldResume: waitForSubWorkflow,
								},
								executionMode: this.getMode(),
							},
						);

						if (returnData.length === 0) {
							returnData.push([]);
						}

						returnData[0].push({
							...items[i],
							metadata: {
								subExecution: {
									workflowId: workflowInfo.id ?? currentWorkflowId,
									executionId: executionResult.executionId,
								},
							},
						});
					}
				} catch (error) {
					if (this.continueOnFail()) {
						returnData[0] ??= [];
						const metadata = parseErrorMetadata(error);
						returnData[0].push({
							json: { error: (error as Error).message },
							pairedItem: { item: i },
							metadata,
						});
						continue;
					}
					throw new NodeOperationError(this.getNode(), error as Error, {
						message: `Error executing workflow with item at index ${i}`,
						description: (error as Error).message,
						itemIndex: i,
					});
				}
			}

			this.setMetadata({
				subExecutionsCount: items.length,
			});

			return returnData;
		}

		try {
			const waitForSubWorkflow = this.getNodeParameter(
				'options.waitForSubWorkflow',
				0,
				true,
			) as boolean;
			const workflowInfo = await getWorkflowInfo.call(this, source);

			const executionResult: ExecuteWorkflowData = await this.executeWorkflow(
				workflowInfo,
				items,
				undefined,
				{
					doNotWaitToFinish: !waitForSubWorkflow,
					parentExecution: {
						executionId: workflowProxy.$execution.id,
						workflowId: workflowProxy.$workflow.id,
						shouldResume: waitForSubWorkflow,
					},
					executionMode: this.getMode(),
				},
			);

			this.setMetadata({
				subExecutionsCount: 1,
			});

			if (!waitForSubWorkflow) {
				return [
					items.map((item) => ({
						...item,
						metadata: {
							subExecution: {
								workflowId: workflowInfo.id ?? currentWorkflowId,
								executionId: executionResult.executionId,
							},
						},
					})),
				];
			}

			const workflowResult = executionResult.data as INodeExecutionData[][];
			return workflowResult;
		} catch (error) {
			if (this.continueOnFail()) {
				const metadata = parseErrorMetadata(error);
				return [[{ json: { error: (error as Error).message }, metadata }]];
			}
			throw error;
		}
	}
}
