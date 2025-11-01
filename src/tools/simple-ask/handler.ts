import type { IToolContext, IToolResult } from '../tool.interface';

/**
 * Execute simple question answering using LLM
 */
export async function execute(context: IToolContext): Promise<IToolResult> {
  try {
    const startTime = Date.now();

    console.log(`   💬 [TOOL:simple-ask] Wysyłam zapytanie do LLM...`);
    
    const response = await context.llmClient.generateCompletion([
      {
        role: 'user',
        content: context.instruction
      }
    ]);

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:simple-ask] Otrzymano odpowiedź (${duration}ms, ${response.usage?.totalTokens || 0} tokenów)`);

    return {
      success: true,
      output: response.content,
      metadata: {
        processingTimeMs: duration,
        tokensUsed: response.usage?.totalTokens,
        model: response.model
      }
    };
  } catch (error) {
    console.log(`   ✗ [TOOL:simple-ask] Błąd: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}

