"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: process.env.PORT || 3001,
    mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/loadforge',
    maxWorkers: parseInt(process.env.MAX_WORKERS || '4'),
    maxSockets: parseInt(process.env.MAX_SOCKETS || '1000'),
    nodeEnv: process.env.NODE_ENV || 'development'
};
//# sourceMappingURL=index.js.map