import type { ProcessRequestDto } from './dto/process-request.dto';
import type { ProcessResponseDto, ErrorResponseDto } from './dto';

import { LLMFactoryService } from '@core/llm/llm-factory.service';
import { IntentDetectorService } from '@core/intent/intent-detector.service';
import { PipelineExecutorService } from '@core/orchestrator/pipeline-executor.service';
import { ToolRegistryService } from '@tools/registry.service';
import { PresentationBuilderService } from './presentation-builder.service';

interface UploadedFile {
  filename: string;
  mimetype: string;
  buffer: Buffer;
  size: number;
  toBuffer: () => Promise<Buffer>;
}

/**
 * Service handling main processing logic
 */
export class GatewayService {
  private readonly llmFactory: LLMFactoryService;
  private readonly intentDetector: IntentDetectorService;
  private readonly pipelineExecutor: PipelineExecutorService;
  private readonly toolRegistry: ToolRegistryService;
  private readonly presentationBuilder: PresentationBuilderService;

  constructor() {
    this.llmFactory = new LLMFactoryService();
    this.toolRegistry = new ToolRegistryService();
    this.intentDetector = new IntentDetectorService(this.toolRegistry);
    this.pipelineExecutor = new PipelineExecutorService(this.toolRegistry);
    this.presentationBuilder = new PresentationBuilderService();
  }

  /**
   * Initialize service (discover tools)
   */
  async initialize(): Promise<void> {
    await this.toolRegistry.discoverAndRegister();
  }

  /**
   * Process user request
   */
  async process(
    request: ProcessRequestDto,
    file?: UploadedFile,
    requestId?: string
  ): Promise<ProcessResponseDto | ErrorResponseDto> {
    const startTime = Date.now();

    console.log('\n' + '='.repeat(80));
    console.log(`🚀 [REQUEST] Nowe zapytanie - ID: ${requestId || 'unknown'}`);
    console.log(`📝 [REQUEST] Instrukcja: "${request.instruction}"`);
    console.log(`🤖 [REQUEST] Model LLM: ${request.llm_config || 'CLAUDE_FAST'}`);
    if (file) {
      console.log(`📎 [REQUEST] Plik: ${file.filename} (${file.mimetype})`);
    }
    console.log('='.repeat(80));

    try {
      const phaseTimings: Record<string, number> = {};
      
      const llmClientStartTime = Date.now();
      const llmClient = this.llmFactory.create(request.llm_config || 'CLAUDE_FAST');
      phaseTimings.llmClientCreation = Date.now() - llmClientStartTime;
      console.log(`⏱️  [TIMING] LLM Client creation: ${phaseTimings.llmClientCreation}ms`);

      const fileMetadata = file ? {
        mimetype: file.mimetype,
        originalname: file.filename,
        size: file.size
      } : undefined;

      const planningStartTime = Date.now();
      const plan = await this.intentDetector.detectAndPlan(
        request.instruction,
        llmClient,
        fileMetadata
      );
      phaseTimings.planning = Date.now() - planningStartTime;
      console.log(`⏱️  [TIMING] Planning phase: ${phaseTimings.planning}ms`);

      let fileBuffer: Buffer | undefined;
      if (file) {
        const fileBufferStartTime = Date.now();
        fileBuffer = await file.toBuffer();
        phaseTimings.fileBuffer = Date.now() - fileBufferStartTime;
        console.log(`⏱️  [TIMING] File buffer access: ${phaseTimings.fileBuffer}ms (${(fileBuffer.length / 1024).toFixed(2)} KB)`);
      }
      
      const pipelineStartTime = Date.now();
      const result = await this.pipelineExecutor.execute({
        instruction: request.instruction,
        file: fileBuffer ? {
          buffer: fileBuffer,
          mimetype: file!.mimetype,
          originalname: file!.filename,
          size: fileBuffer.length
        } : undefined,
        plan,
        llmClient,
        requestId: requestId || 'unknown'
      });
      phaseTimings.pipeline = Date.now() - pipelineStartTime;
      console.log(`⏱️  [TIMING] Pipeline execution: ${phaseTimings.pipeline}ms`);

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'Pipeline execution failed',
          failedAtStep: result.steps.length > 0 ? result.steps[result.steps.length - 1].stepIndex : undefined,
          completedSteps: result.steps.filter(s => s.success).map(s => s.toolName),
          metadata: {
            executionTimeMs: Date.now() - startTime,
            llmModel: request.llm_config || 'CLAUDE_FAST',
            requestId: requestId || 'unknown'
          }
        };
      }

      const executionTime = Date.now() - startTime;
      phaseTimings.total = executionTime;
      
      const toolsUsed = result.steps.map(s => s.toolName);
      const lastTool = this.toolRegistry.get(toolsUsed[toolsUsed.length - 1]);
      
      const contentType = lastTool.config.contentType?.contentType || 
                          `${lastTool.config.name}/output-v1`;
      
      const presentation = this.presentationBuilder.build(
        lastTool.config,
        result.finalOutput
      );
      
      const actions = this.presentationBuilder.buildActions(
        lastTool.config.name,
        result.finalOutput
      );
      
      console.log('\n' + '='.repeat(80));
      console.log(`✅ [RESPONSE] Sukces!`);
      console.log(`⏱️  [RESPONSE] Całkowity czas: ${executionTime}ms`);
      console.log(`🔧 [RESPONSE] Użyte narzędzia: ${toolsUsed.join(', ')}`);
      console.log(`📦 [RESPONSE] Content Type: ${contentType}`);
      console.log(`🎨 [RESPONSE] Display Type: ${presentation.displayType}`);
      console.log('\n📊 [TIMING BREAKDOWN]');
      Object.entries(phaseTimings).forEach(([phase, time]) => {
        const percentage = ((time / executionTime) * 100).toFixed(1);
        console.log(`   ${phase}: ${time}ms (${percentage}%)`);
      });
      console.log('='.repeat(80) + '\n');
      
      return {
        success: true,
        contentType,
        presentation,
        data: result.finalOutput,
        actions: actions.length > 0 ? actions : undefined,
        metadata: {
          executionTimeMs: executionTime,
          toolsUsed,
          llmModel: request.llm_config || 'CLAUDE_FAST',
          planGenerated: true,
          stepsCompleted: result.steps.length,
          phaseTimings
        }
      };

    } catch (error) {
      const executionTime = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      console.log('\n' + '='.repeat(80));
      console.log(`❌ [RESPONSE] Błąd!`);
      console.log(`⏱️  [RESPONSE] Czas do błędu: ${executionTime}ms`);
      console.log(`💥 [RESPONSE] Error: ${errorMessage}`);
      console.log('='.repeat(80) + '\n');
      
      return {
        success: false,
        error: errorMessage,
        metadata: {
          executionTimeMs: executionTime,
          requestId: requestId || 'unknown'
        }
      };
    }
  }

  /**
   * Get list of available tools
   */
  getAvailableTools() {
    return this.toolRegistry.getAll().map(tool => ({
      name: tool.config.name,
      description: tool.config.description,
      capabilities: tool.config.capabilities
    }));
  }

  /**
   * Get all available content types
   */
  getContentTypes() {
    return this.toolRegistry.getAll()
      .filter(tool => tool.config.contentType)
      .map(tool => ({
        contentType: tool.config.contentType!.contentType,
        version: tool.config.contentType!.version,
        category: tool.config.contentType!.category,
        toolName: tool.config.name,
        icon: tool.config.contentType!.icon,
        defaultDisplayType: tool.config.contentType!.defaultDisplayType
      }));
  }

  /**
   * Get detailed info for specific content type
   */
  getContentTypeInfo(type: string) {
    const tool = this.toolRegistry.getAll().find(
      t => t.config.contentType?.contentType === type
    );

    if (!tool || !tool.config.contentType) {
      return null;
    }

    return {
      contentType: tool.config.contentType.contentType,
      version: tool.config.contentType.version,
      category: tool.config.contentType.category,
      toolName: tool.config.name,
      toolDescription: tool.config.description,
      icon: tool.config.contentType.icon,
      defaultDisplayType: tool.config.contentType.defaultDisplayType,
      primaryField: tool.config.contentType.primaryField,
      capabilities: tool.config.capabilities,
      inputTypes: tool.config.inputTypes,
      schemaUrl: tool.config.contentType.schemaUrl,
      examples: tool.config.contentType.examples || []
    };
  }
}

