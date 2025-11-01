import type { IToolContext, IToolResult } from '../tool.interface';

interface ParsedPdfData {
  text: string;
  numpages: number;
  info?: {
    Title?: string;
    Author?: string;
    Creator?: string;
  };
}

interface PdfAnalysisOutput {
  analysis: string;
  extractedText: string;
  pages: number;
  metadata: {
    title?: string;
    author?: string;
    creator?: string;
  };
  info: {
    fileSize: number;
    encrypted: boolean;
  };
}

/**
 * Clean and normalize extracted text
 */
function cleanExtractedText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n')
    .trim();
}

/**
 * Extract text from PDF and analyze it using LLM
 */
export async function execute(context: IToolContext): Promise<IToolResult> {
  try {
    const startTime = Date.now();

    console.log(`   🔧 [TOOL:pdf-extraction] Rozpoczynam ekstrakcję i analizę PDF...`);

    if (!context.file) {
      console.log(`   ✗ [TOOL:pdf-extraction] Brak pliku PDF`);
      return {
        success: false,
        output: null,
        error: 'No file provided'
      };
    }

    if (context.file.mimetype !== 'application/pdf') {
      console.log(`   ✗ [TOOL:pdf-extraction] Nieprawidłowy typ pliku: ${context.file.mimetype}`);
      return {
        success: false,
        output: null,
        error: `Invalid file type: ${context.file.mimetype}. Expected: application/pdf`
      };
    }

    const extractionStartTime = Date.now();
    const pdfParseModule = await import('pdf-parse/lib/pdf-parse.js');
    const pdf = pdfParseModule.default || pdfParseModule;
    const pdfData = await pdf(context.file.buffer) as ParsedPdfData;

    const cleanedText = cleanExtractedText(pdfData.text);
    const extractionTime = Date.now() - extractionStartTime;

    console.log(`   📄 [TOOL:pdf-extraction] Wyekstrahowano tekst z ${pdfData.numpages} stron (${extractionTime}ms)`);
    console.log(`   📝 [TOOL:pdf-extraction] Długość tekstu: ${cleanedText.length} znaków`);

    const prompt = context.instruction || 'Przeanalizuj dokument i podsumuj jego treść.';

    console.log(`   🤖 [TOOL:pdf-extraction] Wysyłam tekst do LLM do analizy...`);

    const llmStartTime = Date.now();
    const response = await context.llmClient.generateCompletion([
      {
        role: 'user',
        content: `${prompt}

<document>
${cleanedText}
</document>

Przeanalizuj powyższy dokument i odpowiedz na pytanie/instrukcję użytkownika.`
      }
    ]);
    const llmTime = Date.now() - llmStartTime;

    const output: PdfAnalysisOutput = {
      analysis: response.content,
      extractedText: cleanedText,
      pages: pdfData.numpages,
      metadata: {
        title: pdfData.info?.Title,
        author: pdfData.info?.Author,
        creator: pdfData.info?.Creator
      },
      info: {
        fileSize: context.file.size,
        encrypted: false
      }
    };

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:pdf-extraction] Analiza ukończona (${duration}ms, ${response.usage?.totalTokens || 0} tokenów)`);
    console.log(`   ⏱️  [TOOL:pdf-extraction] Timing: ekstrakcja ${extractionTime}ms, LLM ${llmTime}ms`);

    return {
      success: true,
      output,
      metadata: {
        processingTimeMs: duration,
        extractionTimeMs: extractionTime,
        llmTimeMs: llmTime,
        tokensUsed: response.usage?.totalTokens,
        model: response.model,
        pagesProcessed: output.pages,
        fileSizeBytes: context.file.size,
        textLength: cleanedText.length
      }
    };
  } catch (error) {
    console.log(`   ✗ [TOOL:pdf-extraction] Błąd: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred during PDF extraction and analysis'
    };
  }
}

