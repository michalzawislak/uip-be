import type { 
  IPipelineContext, 
  IPipelineResult, 
  IStepResult 
} from './types';
import type { IToolContext } from '@tools/tool.interface';
import { ToolRegistryService } from '@tools/registry.service';

/**
 * Execute function with timeout
 */
async function executeWithTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Operation '${operationName}' timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

/**
 * Service for executing pipeline of tools
 */
export class PipelineExecutorService {
  private readonly toolRegistry: ToolRegistryService;

  constructor(toolRegistry: ToolRegistryService) {
    this.toolRegistry = toolRegistry;
  }

  /**
   * Execute pipeline of tools sequentially
   * 
   * @param context - Pipeline execution context
   * @returns Pipeline result with all step outputs
   * @throws {PipelineError} When pipeline execution fails critically
   */
  async execute(context: IPipelineContext): Promise<IPipelineResult> {
    const startTime = Date.now();
    const steps: IStepResult[] = [];
    let previousOutput: unknown = undefined;

    console.log(`\n🔄 [PIPELINE] Rozpoczynam wykonywanie ${context.plan.steps.length} kroków`);
    console.log(`📋 [PIPELINE] Request ID: ${context.requestId}`);

    for (let i = 0; i < context.plan.steps.length; i++) {
      const planStep = context.plan.steps[i];
      
      console.log(`\n⚙️  [PIPELINE] Krok ${i + 1}/${context.plan.steps.length}: ${planStep.toolName}`);
      
      try {
        const tool = this.toolRegistry.get(planStep.toolName);
        const toolStartTime = Date.now();
        
        const toolContext: IToolContext = this.buildToolContext(
          context,
          previousOutput
        );

        const toolTimeout = tool.config.estimatedDurationMs * 6 || 120000;
        console.log(`   ⏱️  [PIPELINE] Timeout dla narzędzia: ${toolTimeout}ms`);

        const result = await executeWithTimeout(
          tool.execute(toolContext),
          toolTimeout,
          `tool:${planStep.toolName}`
        );
        const toolDuration = Date.now() - toolStartTime;

        const stepResult: IStepResult = {
          stepIndex: i,
          toolName: planStep.toolName,
          success: result.success,
          output: result.output,
          metadata: result.metadata,
          error: result.error
        };

        steps.push(stepResult);

        if (!result.success) {
          console.log(`❌ [PIPELINE] Krok ${i + 1} FAILED: ${result.error}`);
          console.log(`⏱️  [PIPELINE] Czas wykonania: ${toolDuration}ms`);
          return {
            success: false,
            steps,
            finalOutput: null,
            metadata: {
              totalDurationMs: Date.now() - startTime,
              stepsCompleted: i,
              totalSteps: context.plan.steps.length
            },
            error: result.error || 'Tool execution failed'
          };
        }

        console.log(`✅ [PIPELINE] Krok ${i + 1} SUCCESS`);
        console.log(`⏱️  [PIPELINE] Czas wykonania: ${toolDuration}ms`);
        if (result.metadata?.tokensUsed) {
          console.log(`🪙 [PIPELINE] Tokeny użyte: ${result.metadata.tokensUsed}`);
        }

        previousOutput = result.output;

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        console.log(`❌ [PIPELINE] Krok ${i + 1} ERROR: ${errorMessage}`);
        
        steps.push({
          stepIndex: i,
          toolName: planStep.toolName,
          success: false,
          output: null,
          error: errorMessage
        });

        return {
          success: false,
          steps,
          finalOutput: null,
          metadata: {
            totalDurationMs: Date.now() - startTime,
            stepsCompleted: i,
            totalSteps: context.plan.steps.length
          },
          error: errorMessage
        };
      }
    }

    const totalDuration = Date.now() - startTime;
    console.log(`\n✨ [PIPELINE] Wszystkie kroki ukończone pomyślnie!`);
    console.log(`⏱️  [PIPELINE] Całkowity czas: ${totalDuration}ms`);

    return {
      success: true,
      steps,
      finalOutput: previousOutput,
      metadata: {
        totalDurationMs: totalDuration,
        stepsCompleted: steps.length,
        totalSteps: context.plan.steps.length
      }
    };
  }

  /**
   * Build tool context from pipeline context and previous result
   */
  private buildToolContext(
    pipelineContext: IPipelineContext,
    previousResult: unknown
  ): IToolContext {
    return {
      instruction: pipelineContext.instruction,
      file: pipelineContext.file,
      previousResult,
      llmClient: pipelineContext.llmClient,
      metadata: {
        requestId: pipelineContext.requestId
      }
    };
  }
}

