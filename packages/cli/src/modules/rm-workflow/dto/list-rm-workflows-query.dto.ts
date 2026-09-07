import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class ListRmWorkflowsQueryDto extends Z.class({
	search: z.string().trim().optional(),
	page: z.coerce.number().int().positive().optional(),
	pageSize: z.coerce.number().int().positive().optional(),
	catalogId: z.coerce.number().int().positive().optional(),
}) {}
