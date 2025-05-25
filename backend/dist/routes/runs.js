"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.runsRoutes = runsRoutes;
const Run_1 = require("../models/Run");
const validation_1 = require("../schemas/validation");
const csv = __importStar(require("fast-csv"));
async function runsRoutes(fastify, runManager) {
    // POST /runs/:specId - Start a new run
    fastify.post('/:specId', {
        schema: {
            params: validation_1.RunParamsSchema
        }
    }, async (request, reply) => {
        try {
            const runId = await runManager.startRun(request.params.specId);
            return { runId, message: 'Run started successfully' };
        }
        catch (error) {
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
    fastify.delete('/:id', {
        schema: {
            params: validation_1.RunIdParamsSchema
        }
    }, async (request, reply) => {
        try {
            await runManager.stopRun(request.params.id);
            return { message: 'Run stopped successfully' };
        }
        catch (error) {
            if (error instanceof Error && error.message === 'Run not found or not active') {
                return reply.status(404).send({ error: error.message });
            }
            reply.status(500).send({ error: 'Failed to stop run' });
        }
    });
    // GET /runs - List all runs
    fastify.get('/', async (request, reply) => {
        try {
            const runs = await Run_1.Run.find()
                .populate('specId', 'name')
                .sort({ createdAt: -1 })
                .limit(100);
            return { runs };
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to fetch runs' });
        }
    });
    // GET /runs/:id - Get a specific run
    fastify.get('/:id', {
        schema: {
            params: validation_1.RunIdParamsSchema
        }
    }, async (request, reply) => {
        try {
            const run = await Run_1.Run.findById(request.params.id).populate('specId', 'name');
            if (!run) {
                return reply.status(404).send({ error: 'Run not found' });
            }
            return { run };
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to fetch run' });
        }
    });
    // GET /runs/active - List active runs
    fastify.get('/active', async (request, reply) => {
        try {
            const activeRuns = runManager.listActive();
            return { activeRuns };
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to fetch active runs' });
        }
    });
    // GET /runs/:id/csv - Download run results as CSV
    fastify.get('/:id/csv', {
        schema: {
            params: validation_1.RunIdParamsSchema
        }
    }, async (request, reply) => {
        try {
            const run = await Run_1.Run.findById(request.params.id).populate('specId', 'name');
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
                    'Spec Name': run.specId?.name || 'Unknown',
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
        }
        catch (error) {
            reply.status(500).send({ error: 'Failed to generate CSV' });
        }
    });
}
//# sourceMappingURL=runs.js.map