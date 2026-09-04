import { Z } from '@n8n/api-types';
import { z } from 'zod';

export class UpdateRmWorkflowSettingsDto extends Z.class({
	apiBaseUrl: z.string().trim().min(1),
}) {}
