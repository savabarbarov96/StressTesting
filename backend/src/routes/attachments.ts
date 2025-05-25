import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { MultipartFile } from '@fastify/multipart';
import { uploadFile, downloadFile, deleteFile, getFileInfo } from '../utils/gridfs';

export async function attachmentsRoutes(fastify: FastifyInstance) {
  // POST /attachments - Upload a file
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = await (request as any).file();
      
      if (!data) {
        return reply.status(400).send({ error: 'No file uploaded' });
      }

      // Check file size (25MB limit)
      const maxSize = 25 * 1024 * 1024; // 25MB in bytes
      if (data.file.readableLength && data.file.readableLength > maxSize) {
        return reply.status(413).send({ error: 'File too large. Maximum size is 25MB' });
      }

      const fileId = await uploadFile(data.filename, data.file);
      
      return { 
        fileId: fileId.toString(),
        filename: data.filename,
        message: 'File uploaded successfully'
      };
    } catch (error) {
      console.error('File upload error:', error);
      reply.status(500).send({ error: 'Failed to upload file' });
    }
  });

  // GET /attachments/:id - Download a file
  fastify.get('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { stream, filename } = await downloadFile(request.params.id);
      
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('Content-Type', 'application/octet-stream');
      
      return reply.send(stream);
    } catch (error) {
      if (error instanceof Error && error.message === 'File not found') {
        return reply.status(404).send({ error: 'File not found' });
      }
      reply.status(500).send({ error: 'Failed to download file' });
    }
  });

  // GET /attachments/:id/info - Get file information
  fastify.get('/:id/info', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const fileInfo = await getFileInfo(request.params.id);
      
      return {
        id: fileInfo._id.toString(),
        filename: fileInfo.filename,
        length: fileInfo.length,
        uploadDate: fileInfo.uploadDate,
        metadata: fileInfo.metadata
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'File not found') {
        return reply.status(404).send({ error: 'File not found' });
      }
      reply.status(500).send({ error: 'Failed to get file info' });
    }
  });

  // DELETE /attachments/:id - Delete a file
  fastify.delete('/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      await deleteFile(request.params.id);
      return { message: 'File deleted successfully' };
    } catch (error) {
      if (error instanceof Error && error.message === 'File not found') {
        return reply.status(404).send({ error: 'File not found' });
      }
      reply.status(500).send({ error: 'Failed to delete file' });
    }
  });
} 