import sharp from 'sharp';
import type { IToolContext, IToolResult } from '../tool.interface';

interface ImageAnalysisOutput {
  analysis: string;
  image_format: string;
  image_size: number;
  original_size?: number;
  compressed_size?: number;
}

/**
 * Compress and resize image to optimize for LLM Vision API
 * Reduces size dramatically while maintaining quality for OCR/analysis
 */
async function compressImage(buffer: Buffer, mimetype: string): Promise<Buffer> {
  const MAX_WIDTH = 1920;
  const MAX_HEIGHT = 1920;
  const JPEG_QUALITY = 85;

  try {
    let pipeline = sharp(buffer);
    const metadata = await pipeline.metadata();

    if (metadata.width && metadata.height) {
      if (metadata.width > MAX_WIDTH || metadata.height > MAX_HEIGHT) {
        pipeline = pipeline.resize(MAX_WIDTH, MAX_HEIGHT, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }
    }

    if (mimetype === 'image/png') {
      return await pipeline
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();
    } else {
      return await pipeline
        .jpeg({ quality: JPEG_QUALITY, progressive: true })
        .toBuffer();
    }
  } catch (error) {
    console.log(`   ⚠️  [TOOL:image-analysis] Kompresja nie powiodła się, używam oryginalnego obrazu`);
    return buffer;
  }
}

/**
 * Analyze images using AI vision models (OCR, description, medical scans)
 */
export async function execute(context: IToolContext): Promise<IToolResult> {
  try {
    const startTime = Date.now();

    console.log(`   🔧 [TOOL:image-analysis] Rozpoczynam analizę obrazu...`);

    if (!context.file) {
      console.log(`   ✗ [TOOL:image-analysis] Brak pliku obrazu`);
      return {
        success: false,
        output: null,
        error: 'No image file provided'
      };
    }

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(context.file.mimetype)) {
      console.log(`   ✗ [TOOL:image-analysis] Nieprawidłowy typ pliku: ${context.file.mimetype}`);
      return {
        success: false,
        output: null,
        error: `Invalid file type: ${context.file.mimetype}. Expected: ${validTypes.join(', ')}`
      };
    }

    const originalSize = context.file.size;
    console.log(`   🖼️  [TOOL:image-analysis] Oryginalny rozmiar: ${(originalSize / 1024).toFixed(2)} KB`);

    const compressStartTime = Date.now();
    const compressedBuffer = await compressImage(context.file.buffer, context.file.mimetype);
    const compressedSize = compressedBuffer.length;
    const compressionTime = Date.now() - compressStartTime;
    
    const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(1);
    console.log(`   ✨ [TOOL:image-analysis] Skompresowano: ${(compressedSize / 1024).toFixed(2)} KB (-${compressionRatio}%) w ${compressionTime}ms`);

    const base64Image = compressedBuffer.toString('base64');
    const dataUrl = `data:${context.file.mimetype};base64,${base64Image}`;

    const prompt = context.instruction || 'Describe this image in detail. If there is any text, transcribe it accurately.';

    console.log(`   📸 [TOOL:image-analysis] Wysyłam obraz do LLM Vision...`);

    const response = await context.llmClient.generateCompletion([
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image',
            image: dataUrl
          }
        ]
      }
    ]);

    const output: ImageAnalysisOutput = {
      analysis: response.content,
      image_format: context.file.mimetype,
      image_size: compressedSize,
      original_size: originalSize,
      compressed_size: compressedSize
    };

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:image-analysis] Analiza ukończona (${duration}ms, ${response.usage?.totalTokens || 0} tokenów)`);

    return {
      success: true,
      output,
      metadata: {
        processingTimeMs: duration,
        tokensUsed: response.usage?.totalTokens,
        model: response.model,
        imageFormat: context.file.mimetype,
        imageSizeBytes: compressedSize,
        originalSizeBytes: originalSize,
        compressionRatio: compressionRatio
      }
    };
  } catch (error) {
    console.log(`   ✗ [TOOL:image-analysis] Błąd: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred during image analysis'
    };
  }
}

