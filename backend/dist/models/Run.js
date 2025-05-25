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
exports.Run = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const RunSummarySchema = new mongoose_1.Schema({
    totalRequests: { type: Number, required: true },
    successfulRequests: { type: Number, required: true },
    failedRequests: { type: Number, required: true },
    averageRps: { type: Number, required: true },
    p50Latency: { type: Number, required: true },
    p95Latency: { type: Number, required: true },
    p99Latency: { type: Number, required: true },
    errorRate: { type: Number, required: true },
    duration: { type: Number, required: true }
});
const ProgressMetricsSchema = new mongoose_1.Schema({
    currentRps: { type: Number, default: 0 },
    totalRequests: { type: Number, default: 0 },
    successfulRequests: { type: Number, default: 0 },
    failedRequests: { type: Number, default: 0 },
    averageLatency: { type: Number, default: 0 },
    elapsedTime: { type: Number, default: 0 }
});
const RunSchema = new mongoose_1.Schema({
    specId: { type: String, required: true, ref: 'Spec' },
    status: {
        type: String,
        required: true,
        enum: ['running', 'completed', 'stopped', 'failed'],
        default: 'running'
    },
    startedAt: { type: Date, required: true, default: Date.now },
    completedAt: { type: Date },
    summary: { type: RunSummarySchema },
    progress: { type: ProgressMetricsSchema, required: true, default: {} }
}, {
    timestamps: true
});
exports.Run = mongoose_1.default.model('Run', RunSchema);
//# sourceMappingURL=Run.js.map