"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.attachmentsRoutes = attachmentsRoutes;
const gridfs_1 = require("../utils/gridfs");
async function attachmentsRoutes(fastify) {
    // POST /attachments - Upload a file
    fastify.post('/', async (request, reply) => {
        try {
            const data = await request.file();
            if (!data) {
                return reply.status(400).send({ error: 'No file uploaded' });
            }
            // Check file size (25MB limit)
            const maxSize = 25 * 1024 * 1024; // 25MB in bytes
            if (data.file.readableLength && data.file.readableLength > maxSize) {
                return reply.status(413).send({ error: 'File too large. Maximum size is 25MB' });
            }
            const fileId = await (0, gridfs_1.uploadFile)(data.filename, data.file);
            return {
                fileId: fileId.toString(),
                filename: data.filename,
                message: 'File uploaded successfully'
            };
        }
        catch (error) {
            console.error('File upload error:', error);
            reply.status(500).send({ error: 'Failed to upload file' });
        }
    });
    // GET /attachments/:id - Download a file
    fastify.get('/:id', async (request, reply) => {
        try {
            const { stream, filename } = await (0, gridfs_1.downloadFile)(request.params.id);
            reply.header('Content-Disposition', `attachment; filename="${filename}"`);
            reply.header('Content-Type', 'application/octet-stream');
            return reply.send(stream);
        }
        catch (error) {
            if (error instanceof Error && error.message === 'File not found') {
                return reply.status(404).send({ error: 'File not found' });
            }
            reply.status(500).send({ error: 'Failed to download file' });
        }
    });
    // GET /attachments/:id/info - Get file information
    fastify.get('/:id/info', async (request, reply) => {
        try {
            const fileInfo = await (0, gridfs_1.getFileInfo)(request.params.id);
            return {
                id: fileInfo._id.toString(),
                filename: fileInfo.filename,
                length: fileInfo.length,
                uploadDate: fileInfo.uploadDate,
                metadata: fileInfo.metadata
            };
        }
        catch (error) {
            if (error instanceof Error && error.message === 'File not found') {
                return reply.status(404).send({ error: 'File not found' });
            }
            reply.status(500).send({ error: 'Failed to get file info' });
        }
    });
    // DELETE /attachments/:id - Delete a file
    fastify.delete('/:id', async (request, reply) => {
        try {
            await (0, gridfs_1.deleteFile)(request.params.id);
            return { message: 'File deleted successfully' };
        }
        catch (error) {
            if (error instanceof Error && error.message === 'File not found') {
                return reply.status(404).send({ error: 'File not found' });
            }
            reply.status(500).send({ error: 'Failed to delete file' });
        }
    });
}
//# sourceMappingURL=attachments.js.map