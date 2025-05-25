import { z } from 'zod';

export const LoadProfileSchema = z.object({
  rampUp: z.number().min(0),
  users: z.number().min(1),
  steady: z.number().min(0),
  rampDown: z.number().min(0)
});

export const RequestConfigSchema = z.object({
  method: z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
  queryParams: z.record(z.string()).optional(),
  body: z.string().optional(),
  attachmentId: z.string().optional()
});

export const CreateSpecSchema = z.object({
  name: z.string().min(1).max(100),
  request: RequestConfigSchema,
  loadProfile: LoadProfileSchema,
  attachmentId: z.string().optional()
});

export const UpdateSpecSchema = CreateSpecSchema.partial();

export const RunParamsSchema = z.object({
  specId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
});

export const RunIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
});

export const SpecIdParamsSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
}); 