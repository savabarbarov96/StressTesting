import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Run } from '../models/Run';
import { RunParamsSchema, RunIdParamsSchema } from '../schemas/validation';
import { RunManager } from '../services/RunManager';
import * as csv from 'fast-csv';

// Enhanced error response interface
interface ErrorResponse {
  error: string;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Helper function to create standardized error responses
const createErrorResponse = (message: string, details?: any, statusCode: number = 500): ErrorResponse => {
  return {
    error: message,
    details,
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(7)
  };
};

// Helper function to log errors with context
const logError = (context: string, error: any, requestId?: string) => {
  console.error(`❌ [${context}] ${requestId ? `[${requestId}] ` : ''}Error:`, {
    message: error.message || error,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
};

export async function runsRoutes(fastify: FastifyInstance, runManager: RunManager) {
  // POST /runs/:specId - Start a new run
  fastify.post('/:specId', async (request: FastifyRequest<{ Params: { specId: string } }>, reply: FastifyReply) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`🚀 [${requestId}] Starting new run for spec: ${request.params.specId}`);
      
      // Validate params manually
      const validation = RunParamsSchema.safeParse(request.params);
      if (!validation.success) {
        const errorResponse = createErrorResponse(
          'Invalid parameters', 
          validation.error.errors, 
          400
        );
        logError('POST /runs/:specId', 'Invalid parameters', requestId);
        return reply.status(400).send(errorResponse);
      }

      const runId = await runManager.startRun(request.params.specId);
      
      console.log(`✅ [${requestId}] Run started successfully: ${runId}`);
      return { 
        runId, 
        message: 'Run started successfully',
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      logError('POST /runs/:specId', error, requestId);
      
      if (error.message === 'Spec not found') {
        const errorResponse = createErrorResponse(
          'Test specification not found',
          { specId: request.params.specId },
          404
        );
        return reply.status(404).send(errorResponse);
      }
      
      if (error.message === 'Maximum concurrent runs reached') {
        const errorResponse = createErrorResponse(
          'Maximum concurrent runs reached. Please wait for existing runs to complete.',
          { 
            activeRuns: runManager.listActive().length,
            maxRuns: 4 // This should come from config
          },
          429
        );
        return reply.status(429).send(errorResponse);
      }

      if (error.message?.includes('Spec must have') || error.message?.includes('Invalid')) {
        const errorResponse = createErrorResponse(
          'Invalid test specification configuration',
          { validationError: error.message },
          400
        );
        return reply.status(400).send(errorResponse);
      }

      // Generic server error
      const errorResponse = createErrorResponse(
        'Failed to start load test',
        { 
          originalError: error.message,
          specId: request.params.specId
        },
        500
      );
      reply.status(500).send(errorResponse);
    }
  });

  // DELETE /runs/:id - Stop an existing run
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`🛑 [${requestId}] Stopping run: ${request.params.id}`);
      
      // Validate params manually
      const validation = RunIdParamsSchema.safeParse(request.params);
      if (!validation.success) {
        const errorResponse = createErrorResponse(
          'Invalid run ID format',
          validation.error.errors,
          400
        );
        logError('DELETE /runs/:id', 'Invalid parameters', requestId);
        return reply.status(400).send(errorResponse);
      }

      await runManager.stopRun(request.params.id);
      
      console.log(`✅ [${requestId}] Run stopped successfully: ${request.params.id}`);
      return { 
        message: 'Run stopped successfully',
        runId: request.params.id,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      logError('DELETE /runs/:id', error, requestId);
      
      if (error.message === 'Run not found or not active') {
        const errorResponse = createErrorResponse(
          'Run not found or not currently active',
          { runId: request.params.id },
          404
        );
        return reply.status(404).send(errorResponse);
      }
      
      const errorResponse = createErrorResponse(
        'Failed to stop run',
        { 
          originalError: error.message,
          runId: request.params.id
        },
        500
      );
      reply.status(500).send(errorResponse);
    }
  });

  // GET /runs - List all runs
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`📋 [${requestId}] Fetching all runs`);
      
      const runs = await Run.find()
        .populate('specId', 'name')
        .sort({ createdAt: -1 })
        .limit(100);
      
      console.log(`✅ [${requestId}] Retrieved ${runs.length} runs`);
      return { 
        runs,
        count: runs.length,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      logError('GET /runs', error, requestId);
      
      const errorResponse = createErrorResponse(
        'Failed to fetch runs',
        { originalError: error.message },
        500
      );
      reply.status(500).send(errorResponse);
    }
  });

  // GET /runs/:id - Get a specific run
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`🔍 [${requestId}] Fetching run: ${request.params.id}`);
      
      // Validate params manually
      const validation = RunIdParamsSchema.safeParse(request.params);
      if (!validation.success) {
        const errorResponse = createErrorResponse(
          'Invalid run ID format',
          validation.error.errors,
          400
        );
        logError('GET /runs/:id', 'Invalid parameters', requestId);
        return reply.status(400).send(errorResponse);
      }

      const run = await Run.findById(request.params.id).populate('specId', 'name');
      if (!run) {
        const errorResponse = createErrorResponse(
          'Run not found',
          { runId: request.params.id },
          404
        );
        console.log(`⚠️ [${requestId}] Run not found: ${request.params.id}`);
        return reply.status(404).send(errorResponse);
      }
      
      console.log(`✅ [${requestId}] Run retrieved: ${request.params.id}`);
      return { 
        run,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      logError('GET /runs/:id', error, requestId);
      
      const errorResponse = createErrorResponse(
        'Failed to fetch run',
        { 
          originalError: error.message,
          runId: request.params.id
        },
        500
      );
      reply.status(500).send(errorResponse);
    }
  });

  // GET /runs/active - List active runs
  fastify.get('/active', async (request: FastifyRequest, reply: FastifyReply) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`🔄 [${requestId}] Fetching active runs`);
      
      const activeRuns = runManager.listActive();
      
      console.log(`✅ [${requestId}] Retrieved ${activeRuns.length} active runs`);
      return { 
        activeRuns,
        count: activeRuns.length,
        timestamp: new Date().toISOString(),
        requestId
      };
    } catch (error: any) {
      logError('GET /runs/active', error, requestId);
      
      const errorResponse = createErrorResponse(
        'Failed to fetch active runs',
        { originalError: error.message },
        500
      );
      reply.status(500).send(errorResponse);
    }
  });

  // GET /runs/:id/csv - Download run results as CSV
  fastify.get('/:id/csv', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`📊 [${requestId}] Generating CSV for run: ${request.params.id}`);
      
      // Validate params manually
      const validation = RunIdParamsSchema.safeParse(request.params);
      if (!validation.success) {
        const errorResponse = createErrorResponse(
          'Invalid run ID format',
          validation.error.errors,
          400
        );
        logError('GET /runs/:id/csv', 'Invalid parameters', requestId);
        return reply.status(400).send(errorResponse);
      }

      const run = await Run.findById(request.params.id).populate('specId', 'name');
      if (!run) {
        const errorResponse = createErrorResponse(
          'Run not found',
          { runId: request.params.id },
          404
        );
        console.log(`⚠️ [${requestId}] Run not found for CSV: ${request.params.id}`);
        return reply.status(404).send(errorResponse);
      }

      if (!run.summary) {
        const errorResponse = createErrorResponse(
          'Run has no summary data available. The run may still be in progress or may have failed.',
          { 
            runId: request.params.id,
            status: run.status
          },
          400
        );
        console.log(`⚠️ [${requestId}] No summary data for CSV: ${request.params.id}`);
        return reply.status(400).send(errorResponse);
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

      console.log(`✅ [${requestId}] CSV generated for run: ${request.params.id}`);
      return reply.send(csvStream);
    } catch (error: any) {
      logError('GET /runs/:id/csv', error, requestId);
      
      const errorResponse = createErrorResponse(
        'Failed to generate CSV',
        { 
          originalError: error.message,
          runId: request.params.id
        },
        500
      );
      reply.status(500).send(errorResponse);
    }
  });
} 