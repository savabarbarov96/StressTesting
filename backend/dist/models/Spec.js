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
exports.Spec = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const LoadProfileSchema = new mongoose_1.Schema({
    rampUp: { type: Number, required: true, min: 0 },
    users: { type: Number, required: true, min: 1 },
    steady: { type: Number, required: true, min: 0 },
    rampDown: { type: Number, required: true, min: 0 }
});
const RequestConfigSchema = new mongoose_1.Schema({
    method: { type: String, required: true, enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'] },
    url: { type: String, required: true },
    headers: { type: Map, of: String, default: {} },
    queryParams: { type: Map, of: String, default: {} },
    body: { type: String },
    attachmentId: { type: String }
});
const SpecSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    request: { type: RequestConfigSchema, required: true },
    loadProfile: { type: LoadProfileSchema, required: true },
    attachmentId: { type: String }
}, {
    timestamps: true
});
exports.Spec = mongoose_1.default.model('Spec', SpecSchema);
//# sourceMappingURL=Spec.js.map