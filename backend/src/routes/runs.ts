import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Run } from '../models/Run';
import { RunParamsSchema, RunIdParamsSchema } from '../schemas/validation';
import { RunManager } from '../services/RunManager';
import * as csv from 'fast-csv';

export async function runsRoutes(fastify: FastifyInstance, runManager: RunManager) {
  // POST /runs/:specId - Start a new run
  fastify.post('/:specId', async (request: FastifyRequest<{ Params: { specId: string } }>, reply: FastifyReply) => {
    try {
      // Validate params manually
      const validation = RunParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid parameters', details: validation.error.errors });
      }

      const runId = await runManager.startRun(request.params.specId);
      return { runId, message: 'Run started successfully' };
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Spec not found') {
          return reply.status(404).send({ error: error.message });
        }
        if (error.message === 'Maximum concurrent runs reached') {
          return reply.status(429).send({ error: error.message });
        }
      }
      reply.status(500).send({ error: 'Failed to start run' });
    }
  });

  // DELETE /runs/:id - Stop an existing run
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      // Validate params manually
      const validation = RunIdParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid parameters', details: validation.error.errors });
      }

      await runManager.stopRun(request.params.id);
      return { message: 'Run stopped successfully' };
    } catch (error) {
      if (error instanceof Error && error.message === 'Run not found or not active') {
        return reply.status(404).send({ error: error.message });
      }
      reply.status(500).send({ error: 'Failed to stop run' });
    }
  });

  // GET /runs - List all runs
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const runs = await Run.find()
        .populate('specId', 'name')
        .sort({ createdAt: -1 })
        .limit(100);
      return { runs };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch runs' });
    }
  });

  // GET /runs/:id - Get a specific run
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      // Validate params manually
      const validation = RunIdParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid parameters', details: validation.error.errors });
      }

      const run = await Run.findById(request.params.id).populate('specId', 'name');
      if (!run) {
        return reply.status(404).send({ error: 'Run not found' });
      }
      return { run };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch run' });
    }
  });

  // GET /runs/active - List active runs
  fastify.get('/active', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const activeRuns = runManager.listActive();
      return { activeRuns };
    } catch (error) {
      reply.status(500).send({ error: 'Failed to fetch active runs' });
    }
  });

  // GET /runs/:id/csv - Download run results as CSV
  fastify.get('/:id/csv', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      // Validate params manually
      const validation = RunIdParamsSchema.safeParse(request.params);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid parameters', details: validation.error.errors });
      }

      const run = await Run.findById(request.params.id).populate('specId', 'name');
      if (!run) {
        return reply.status(404).send({ error: 'Run not found' });
      }

      if (!run.summary) {
        return reply.status(400).send({ error: 'Run has no summary data available' });
      }

      // Prepare CSV data
      const csvData = [
        {
          'Run ID': run.id,
          'Spec Name': (run.specId as any)?.name || 'Unknown',
          'Status': run.status,
          'Started At': run.startedAt.toISOString(),
          'Completed At': run.completedAt?.toISOString() || 'N/A',
          'Total Requests': run.summary.totalRequests,
          'Successful Requests': run.summary.successfulRequests,
          'Failed Requests': run.summary.failedRequests,
          'Average RPS': run.summary.averageRps,
          'P50 Latency (ms)': run.summary.p50Latency,
          'P95 Latency (ms)': run.summary.p95Latency,
          'P99 Latency (ms)': run.summary.p99Latency,
          'Error Rate (%)': run.summary.errorRate,
          'Duration (s)': run.summary.duration
        }
      ];

      // Set headers for CSV download
      reply.header('Content-Type', 'text/csv');
      reply.header('Content-Disposition', `attachment; filename="run-${run.id}-results.csv"`);

      // Create CSV stream
      const csvStream = csv.format({ headers: true });
      
      // Write data to CSV
      csvData.forEach(row => csvStream.write(row));
      csvStream.end();

      return reply.send(csvStream);
    } catch (error) {
      reply.status(500).send({ error: 'Failed to generate CSV' });
    }
  });
} 