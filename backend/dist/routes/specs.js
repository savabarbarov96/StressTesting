"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.specsRoutes = specsRoutes;
const Spec_1 = require("../models/Spec");
const validation_1 = require("../schemas/validation");
async function specsRoutes(fastify) {
    // GET /specs - List all specs
    fastify.get('/', async (request, reply) => {
        try {
            const specs = await Spec_1.Spec.find().sort({ createdAt: -1 });
            return { specs };
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to fetch specs' });
        }
    });
    // GET /specs/:id - Get a specific spec
    fastify.get('/:id', async (request, reply) => {
        try {
            // Validate params manually
            const validation = validation_1.SpecIdParamsSchema.safeParse(request.params);
            if (!validation.success) {
                return reply.status(400).send({ error: 'Invalid parameters', details: validation.error.errors });
            }
            const spec = await Spec_1.Spec.findById(request.params.id);
            if (!spec) {
                return reply.status(404).send({ error: 'Spec not found' });
            }
            return { spec };
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to fetch spec' });
        }
    });
    // POST /specs - Create a new spec
    fastify.post('/', async (request, reply) => {
        try {
            // Validate body manually
            const validation = validation_1.CreateSpecSchema.safeParse(request.body);
            if (!validation.success) {
                return reply.status(400).send({ error: 'Invalid request body', details: validation.error.errors });
            }
            const spec = new Spec_1.Spec(validation.data);
            await spec.save();
            return { spec };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'ValidationError') {
                return reply.status(400).send({ error: 'Validation error', details: error.message });
            }
            reply.status(500).send({ error: 'Failed to create spec' });
        }
    });
    // PUT /specs/:id - Update a spec
    fastify.put('/:id', async (request, reply) => {
        try {
            // Validate params manually
            const paramsValidation = validation_1.SpecIdParamsSchema.safeParse(request.params);
            if (!paramsValidation.success) {
                return reply.status(400).send({ error: 'Invalid parameters', details: paramsValidation.error.errors });
            }
            // Validate body manually
            const bodyValidation = validation_1.UpdateSpecSchema.safeParse(request.body);
            if (!bodyValidation.success) {
                return reply.status(400).send({ error: 'Invalid request body', details: bodyValidation.error.errors });
            }
            const spec = await Spec_1.Spec.findByIdAndUpdate(request.params.id, { $set: bodyValidation.data }, { new: true, runValidators: true });
            if (!spec) {
                return reply.status(404).send({ error: 'Spec not found' });
            }
            return { spec };
        }
        catch (error) {
            if (error instanceof Error && error.name === 'ValidationError') {
                return reply.status(400).send({ error: 'Validation error', details: error.message });
            }
            reply.status(500).send({ error: 'Failed to update spec' });
        }
    });
    // DELETE /specs/:id - Delete a spec
    fastify.delete('/:id', async (request, reply) => {
        try {
            // Validate params manually
            const validation = validation_1.SpecIdParamsSchema.safeParse(request.params);
            if (!validation.success) {
                return reply.status(400).send({ error: 'Invalid parameters', details: validation.error.errors });
            }
            const spec = await Spec_1.Spec.findByIdAndDelete(request.params.id);
            if (!spec) {
                return reply.status(404).send({ error: 'Spec not found' });
            }
            return { message: 'Spec deleted successfully' };
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to delete spec' });
        }
    });
}
//# sourceMappingURL=specs.js.map