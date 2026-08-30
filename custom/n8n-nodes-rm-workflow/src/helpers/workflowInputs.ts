import type {
	FieldType,
	FieldValueOption,
	IDataObject,
	IExecuteFunctions,
	ILocalLoadOptionsFunctions,
	INodeExecutionData,
	ISupplyDataFunctions,
	IWorkflowNodeContext,
	ResourceMapperField,
	ResourceMapperFields,
	WorkflowInputsData,
} from 'n8n-workflow';
import { EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE, NodeOperationError, jsonParse } from 'n8n-workflow';

const INPUT_SOURCE = 'inputSource';
const WORKFLOW_INPUTS = 'workflowInputs';
const VALUES = 'values';
const JSON_EXAMPLE = 'jsonExample';
const PASSTHROUGH = 'passthrough';

const SUPPORTED_TYPES = new Set<string>(['any', 'string', 'number', 'boolean', 'array', 'object']);

function parseJsonSchema(schema: {
	type?: string | string[];
	properties?: Record<string, { type?: string | string[] }>;
}): FieldValueOption[] | string {
	if (schema.type !== 'object') {
		return 'Invalid JSON schema. Only object type is supported';
	}
	if (!schema.properties || typeof schema.properties !== 'object') {
		return 'Invalid JSON schema. Missing key `properties`';
	}

	const result: FieldValueOption[] = [];
	for (const [name, v] of Object.entries(schema.properties)) {
		const type = v?.type;
		if (type === 'null') {
			result.push({ name, type: 'any' });
		} else if (typeof type !== 'string' || !SUPPORTED_TYPES.has(type)) {
			return `Invalid JSON schema. Unsupported type for property '${name}'`;
		} else {
			result.push({ name, type: type as FieldType | 'any' });
		}
	}
	return result;
}

function getFieldEntries(context: IWorkflowNodeContext): {
	dataMode: string;
	fields: FieldValueOption[];
	subworkflowInfo?: { workflowId?: string; triggerId?: string };
} {
	const inputSource = context.getNodeParameter(INPUT_SOURCE, 0, PASSTHROUGH);
	let result: FieldValueOption[] | string = 'Internal Error: Invalid input source';

	try {
		if (inputSource === WORKFLOW_INPUTS) {
			result = context.getNodeParameter(
				`${WORKFLOW_INPUTS}.${VALUES}`,
				0,
				[],
			) as FieldValueOption[];
		} else if (inputSource === JSON_EXAMPLE) {
			const jsonString = context.getNodeParameter(JSON_EXAMPLE, 0, '') as string;
			const json = jsonParse<Record<string, unknown>>(jsonString);
			const properties: Record<string, { type: string }> = {};
			for (const [key, value] of Object.entries(json)) {
				properties[key] = {
					type: Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value,
				};
			}
			result = parseJsonSchema({ type: 'object', properties });
		} else if (inputSource === PASSTHROUGH) {
			result = [];
		}
	} catch (e: unknown) {
		result =
			e && typeof e === 'object' && 'message' in e && typeof e.message === 'string'
				? e.message
				: `Unknown error: ${JSON.stringify(e)}`;
	}

	if (Array.isArray(result)) {
		const workflow = context.getWorkflow();
		const node = context.getNode();
		return {
			fields: result,
			dataMode: String(inputSource),
			subworkflowInfo: { workflowId: workflow.id, triggerId: node.id },
		};
	}
	throw new NodeOperationError(context.getNode(), result);
}

export function getCurrentWorkflowInputData(
	this: IExecuteFunctions | ISupplyDataFunctions,
): INodeExecutionData[] {
	const inputData = this.getInputData();

	const mapped = inputData.map(({ json, binary }, itemIndex) => {
		const itemFieldValues = this.getNodeParameter(
			'workflowInputs.value',
			itemIndex,
			{},
		) as IDataObject;

		return {
			json: {
				...json,
				...itemFieldValues,
			},
			index: itemIndex,
			pairedItem: { item: itemIndex },
			binary,
		};
	});

	const schema = this.getNodeParameter('workflowInputs.schema', 0, []) as ResourceMapperField[];
	if (schema.length === 0) return mapped;

	const removedKeys = new Set(schema.filter((x) => x.removed).map((x) => x.displayName));
	return mapped.map(({ json, binary, index }) => ({
		index,
		pairedItem: { item: index },
		json: Object.fromEntries(Object.entries(json).filter(([key]) => !removedKeys.has(key))),
		binary,
	}));
}

export async function loadSubWorkflowInputs(
	this: ILocalLoadOptionsFunctions,
): Promise<ResourceMapperFields> {
	const nodeLoadContext = await this.getWorkflowNodeContext(EXECUTE_WORKFLOW_TRIGGER_NODE_TYPE);
	let fields: ResourceMapperField[] = [];
	let dataMode: string = PASSTHROUGH;
	let subworkflowInfo: WorkflowInputsData['subworkflowInfo'];

	if (nodeLoadContext) {
		const fieldValues = getFieldEntries(nodeLoadContext);
		dataMode = fieldValues.dataMode;
		subworkflowInfo = fieldValues.subworkflowInfo;
		fields = fieldValues.fields.map((currentWorkflowInput) => {
			const field: ResourceMapperField = {
				id: currentWorkflowInput.name,
				displayName: currentWorkflowInput.name,
				required: false,
				defaultMatch: false,
				display: true,
				canBeUsedToMatch: true,
			};
			if (currentWorkflowInput.type !== 'any') {
				field.type = currentWorkflowInput.type;
			}
			return field;
		});
	}

	let emptyFieldsNotice: string | undefined;
	if (fields.length === 0) {
		const { triggerId, workflowId } = subworkflowInfo ?? {};
		const path = (workflowId ?? '') + (triggerId ? `/${triggerId.slice(0, 6)}` : '');
		const subworkflowLink = workflowId
			? `<a href="/workflow/${path}" target="_blank">sub-workflow’s trigger</a>`
			: 'sub-workflow’s trigger';

		emptyFieldsNotice =
			dataMode === PASSTHROUGH
				? `This sub-workflow will consume all input data. Define expected inputs on the ${subworkflowLink}.`
				: `The sub-workflow isn't set up to accept any inputs. Change this on the ${subworkflowLink}.`;
	}

	return { fields, emptyFieldsNotice };
}
