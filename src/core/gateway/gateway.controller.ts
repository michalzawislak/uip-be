import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ProcessRequestSchema } from './dto/process-request.dto';
import { GatewayService } from './gateway.service';

interface UploadedFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  toBuffer: () => Promise<Buffer>;
}

/**
 * Register gateway routes
 */
export async function registerGatewayRoutes(
  app: FastifyInstance,
  gatewayService: GatewayService
): Promise<void> {
  
  /**
   * POST /v1/process - Main processing endpoint
   */
  app.post('/v1/process', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      console.log('[GATEWAY] 🎬 Rozpoczynam parsowanie multipart...');
      const fields: Record<string, string> = {};
      let fileData: UploadedFile | undefined = undefined;
      
      console.log('[GATEWAY] 📦 Pobieram parts...');
      const parts = request.parts();
      console.log('[GATEWAY] 🔄 Iteruję przez parts...');
      
      let partCount = 0;
      for await (const part of parts) {
        partCount++;
        console.log(`[GATEWAY] 📝 Part ${partCount}: type=${part.type}, fieldname=${part.fieldname}`);
        
        if (part.type === 'field') {
          fields[part.fieldname] = part.value as string;
          console.log(`[GATEWAY]    ✓ Field: ${part.fieldname} = ${part.value}`);
        } else if (part.type === 'file') {
          console.log(`[GATEWAY]    📎 File: ${part.filename}, mimetype=${part.mimetype}`);
          console.log(`[GATEWAY]    ⏳ Konsumuję stream do buffer...`);
          const buffer = await part.toBuffer();
          console.log(`[GATEWAY]    ✅ Buffer gotowy: ${buffer.length} bytes`);
          fileData = {
            filename: part.filename,
            mimetype: part.mimetype,
            buffer: buffer,
            size: buffer.length,
            toBuffer: async () => buffer
          };
        }
      }
      
      console.log(`[GATEWAY] ✅ Parsowanie zakończone! Parts: ${partCount}, Fields: ${Object.keys(fields).length}, HasFile: ${!!fileData}`);

      const validated = ProcessRequestSchema.parse(fields);
      console.log(`[GATEWAY] ✅ Walidacja pól zakończona`);

      console.log(`[GATEWAY] 🚀 Przekazuję do GatewayService...`);
      const result = await gatewayService.process(
        validated,
        fileData,
        request.id
      );

      if (result.success) {
        return reply.status(200).send(result);
      } else {
        return reply.status(400).send(result);
      }

    } catch (error) {
      request.log.error({ err: error, requestId: request.id }, 'Processing error');
      
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
        metadata: {
          executionTimeMs: 0,
          requestId: request.id
        }
      });
    }
  });

  /**
   * GET /v1/tools - List available tools
   */
  app.get('/v1/tools', async (_request: FastifyRequest, reply: FastifyReply) => {
    const tools = gatewayService.getAvailableTools();
    return reply.status(200).send({ tools });
  });

  /**
   * GET /v1/content-types - List all available content types
   */
  app.get('/v1/content-types', async (_request: FastifyRequest, reply: FastifyReply) => {
    const contentTypes = gatewayService.getContentTypes();
    return reply.status(200).send({ 
      contentTypes,
      total: contentTypes.length 
    });
  });

  /**
   * GET /v1/content-types/:type - Get schema for specific content type
   */
  app.get('/v1/content-types/:type', async (request: FastifyRequest<{ Params: { type: string } }>, reply: FastifyReply) => {
    const { type } = request.params;
    const contentTypeInfo = gatewayService.getContentTypeInfo(type);
    
    if (!contentTypeInfo) {
      return reply.status(404).send({
        error: 'Content type not found',
        availableTypes: gatewayService.getContentTypes().map(ct => ct.contentType)
      });
    }
    
    return reply.status(200).send(contentTypeInfo);
  });
}

