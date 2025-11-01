import type { ILLMClient } from '@core/llm/llm-client.interface';
import type { IExecutionPlan } from '@core/orchestrator/types';
import type { IIntentContext } from './types';
import { PlannerService } from './planner.service';
import { ToolRegistryService } from '@tools/registry.service';
import { ConfigError } from '@common/types';

/**
 * Service for detecting user intent and generating execution plans
 */
export class IntentDetectorService {
  private readonly planner: PlannerService;
  private readonly toolRegistry: ToolRegistryService;

  constructor(toolRegistry: ToolRegistryService) {
    this.toolRegistry = toolRegistry;
    this.planner = new PlannerService();
  }

  /**
   * Detect intent and generate execution plan
   */
  async detectAndPlan(
    instruction: string,
    llmClient: ILLMClient,
    fileMetadata?: { mimetype: string; originalname: string; size: number }
  ): Promise<IExecutionPlan> {
    const context: IIntentContext = {
      instruction,
      fileMetadata,
      availableTools: this.toolRegistry.getToolNames()
    };

    const plan = await this.planner.generatePlan(context, llmClient);

    this.validatePlan(plan);

    return plan;
  }

  /**
   * Validate that all tools in plan exist in registry
   */
  private validatePlan(plan: IExecutionPlan): void {
    for (const step of plan.steps) {
      if (!this.toolRegistry.has(step.toolName)) {
        throw new ConfigError(`Tool not found in registry: ${step.toolName}`);
      }
    }
  }
}

