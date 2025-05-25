import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import https from 'https';
import http from 'http';
import { URL } from 'url';

interface TestRequestBody {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  data?: any;
}

// Helper function to make HTTP requests using native modules
function makeHttpRequest(method: string, url: string, headers: Record<string, string> = {}, data?: any): Promise<{
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: any;
}> {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestHeaders: Record<string, string> = {
      'User-Agent': 'StressTesting-Tool/1.0',
      ...headers
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const bodyData = typeof data === 'string' ? data : JSON.stringify(data);
      requestHeaders['Content-Length'] = Buffer.byteLength(bodyData).toString();
      if (!requestHeaders['Content-Type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: method.toUpperCase(),
      headers: requestHeaders,
      timeout: 10000
    };

    const req = httpModule.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(responseData);
        } catch {
          parsedData = responseData;
        }
        
        resolve({
          status: res.statusCode || 0,
          statusText: res.statusMessage || '',
          headers: res.headers as Record<string, string>,
          data: parsedData
        });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    // Write data for POST/PUT/PATCH requests
    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      const bodyData = typeof data === 'string' ? data : JSON.stringify(data);
      req.write(bodyData);
    }

    req.end();
  });
}

export async function testRoutes(fastify: FastifyInstance) {
  // POST /test-request - Test an HTTP request
  fastify.post('/test-request', async (request: FastifyRequest<{ Body: TestRequestBody }>, reply: FastifyReply) => {
    const requestId = Math.random().toString(36).substring(7);
    
    try {
      console.log(`🧪 [${requestId}] Testing request: ${request.body.method} ${request.body.url}`);
      
      const { method, url, headers = {}, data } = request.body;
      
      // Validate required fields
      if (!method || !url) {
        return reply.status(400).send({
          error: 'Method and URL are required',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      // Validate URL format
      try {
        new URL(url);
      } catch (err) {
        return reply.status(400).send({
          error: 'Invalid URL format',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      const startTime = Date.now();
      
      // Make the test request with a timeout
      const response = await makeHttpRequest(method, url, headers, data);
      const responseTime = Date.now() - startTime;

      console.log(`✅ [${requestId}] Test request completed: ${response.status} (${responseTime}ms)`);

      return {
        success: true,
        status: response.status,
        statusText: response.statusText,
        responseTime,
        headers: response.headers,
        data: response.data,
        timestamp: new Date().toISOString(),
        requestId
      };

    } catch (error: any) {
      const responseTime = Date.now() - Date.now();
      
      console.error(`❌ [${requestId}] Test request failed:`, {
        message: error.message,
        code: error.code,
        status: error.response?.status
      });

      // Handle different types of errors
      if (error.code === 'ECONNABORTED') {
        return reply.status(408).send({
          error: 'Request timeout - the server took too long to respond',
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return reply.status(502).send({
          error: 'Unable to connect to the target server',
          details: error.message,
          timestamp: new Date().toISOString(),
          requestId
        });
      }

      if (error.response) {
        // Server responded with an error status
        return {
          success: false,
          status: error.response.status,
          statusText: error.response.statusText,
          responseTime,
          error: `HTTP ${error.response.status}: ${error.response.statusText}`,
          data: error.response.data,
          timestamp: new Date().toISOString(),
          requestId
        };
      }

      // Generic error
      return reply.status(500).send({
        error: 'Test request failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId
      });
    }
  });
} 