import type { ILLMClient } from '@core/llm/llm-client.interface';
import type { IExecutionPlan } from '@core/orchestrator/types';
import type { IIntentContext } from './types';
import { LLMError } from '@common/types';

/**
 * Service for generating execution plans using LLM
 */
export class PlannerService {
  /**
   * Generate execution plan based on intent and available tools
   */
  async generatePlan(
    context: IIntentContext,
    llmClient: ILLMClient
  ): Promise<IExecutionPlan> {
    console.log('\n🎯 [PLANNER] Rozpoczynam planowanie...');
    console.log('📝 [PLANNER] Instrukcja:', context.instruction);
    console.log('🔧 [PLANNER] Dostępne narzędzia:', context.availableTools.join(', '));
    
    const prompt = this.buildPlanningPrompt(context);

    try {
      const response = await llmClient.generateCompletion([
        {
          role: 'user',
          content: prompt
        }
      ]);

      const plan = this.parseAndValidate(response.content);
      
      console.log('✅ [PLANNER] Plan wygenerowany:');
      plan.steps.forEach((step, idx) => {
        console.log(`   ${idx + 1}. ${step.toolName}${step.reason ? ` - ${step.reason}` : ''}`);
      });
      
      return plan;

    } catch (error) {
      throw new LLMError(
        'planning',
        error instanceof Error ? error.message : 'Failed to generate execution plan'
      );
    }
  }

  /**
   * Build prompt for LLM planning
   */
  private buildPlanningPrompt(context: IIntentContext): string {
    return `You are a task planning system. Analyze the user's instruction and create an execution plan.

<instructions>
USER INSTRUCTION: "${context.instruction}"
${context.fileMetadata ? `FILE PROVIDED: ${context.fileMetadata.originalname} (${context.fileMetadata.mimetype})` : 'NO FILE PROVIDED'}
AVAILABLE TOOLS: ${context.availableTools.join(', ')}
</instructions>

<task>
Return a JSON object with execution plan. Use this exact format:

{
  "steps": [
    {
      "toolName": "tool-name",
      "reason": "why this tool is needed"
    }
  ]
}

Rules:
1. Keep plan simple and minimal (prefer 1-2 steps)
2. Only use tools from AVAILABLE TOOLS list
3. Order matters: tool A output feeds into tool B
4. For simple questions without files, use "simple-ask" tool only
5. Return ONLY valid JSON, no additional text
</task>`;
  }

  /**
   * Parse and validate LLM response
   */
  private parseAndValidate(response: string): IExecutionPlan {
    try {
      let jsonStr = response.trim();
      
      const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
      }

      const parsed = JSON.parse(jsonStr);

      if (!parsed.steps || !Array.isArray(parsed.steps)) {
        throw new Error('Invalid plan structure: missing or invalid steps array');
      }

      if (parsed.steps.length === 0) {
        throw new Error('Invalid plan: steps array is empty');
      }

      for (const step of parsed.steps) {
        if (!step.toolName || typeof step.toolName !== 'string') {
          throw new Error('Invalid step: missing or invalid toolName');
        }
      }

      return {
        steps: parsed.steps,
        estimatedDurationMs: parsed.estimatedDurationMs
      };

    } catch (error) {
      throw new LLMError(
        'planning',
        `Failed to parse plan: ${error instanceof Error ? error.message : 'Invalid JSON'}`
      );
    }
  }
}

