"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecIdParamsSchema = exports.RunIdParamsSchema = exports.RunParamsSchema = exports.UpdateSpecSchema = exports.CreateSpecSchema = exports.RequestConfigSchema = exports.LoadProfileSchema = void 0;
const zod_1 = require("zod");
exports.LoadProfileSchema = zod_1.z.object({
    rampUp: zod_1.z.number().min(0),
    users: zod_1.z.number().min(1),
    steady: zod_1.z.number().min(0),
    rampDown: zod_1.z.number().min(0)
});
exports.RequestConfigSchema = zod_1.z.object({
    method: zod_1.z.enum(['GET', 'POST', 'PUT', 'DELETE', 'PATCH']),
    url: zod_1.z.string().url(),
    headers: zod_1.z.record(zod_1.z.string()).optional(),
    queryParams: zod_1.z.record(zod_1.z.string()).optional(),
    body: zod_1.z.string().optional(),
    attachmentId: zod_1.z.string().optional()
});
exports.CreateSpecSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    request: exports.RequestConfigSchema,
    loadProfile: exports.LoadProfileSchema,
    attachmentId: zod_1.z.string().optional()
});
exports.UpdateSpecSchema = exports.CreateSpecSchema.partial();
exports.RunParamsSchema = zod_1.z.object({
    specId: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
});
exports.RunIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
});
exports.SpecIdParamsSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId')
});
//# sourceMappingURL=validation.js.map