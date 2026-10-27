import type {
	IExecuteFunctions,
	IExecuteWorkflowInfo,
	INodeParameterResourceLocator,
} from 'n8n-workflow';

/** Resolve sub-workflow id from database selector (RLC). */
export async function getWorkflowInfo(
	this: IExecuteFunctions,
	itemIndex = 0,
): Promise<IExecuteWorkflowInfo> {
	const { value } = this.getNodeParameter(
		'workflowId',
		itemIndex,
		{},
	) as INodeParameterResourceLocator;

	return { id: value as string };
}
