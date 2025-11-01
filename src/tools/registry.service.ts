import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import type { ITool } from './tool.interface';
import { ConfigError } from '@common/types';

/**
 * Registry for managing and discovering tools
 */
export class ToolRegistryService {
  private tools: Map<string, ITool> = new Map();
  private toolsDirectory: string;

  constructor(toolsDirectory?: string) {
    this.toolsDirectory = toolsDirectory || join(process.cwd(), 'src', 'tools');
  }

  /**
   * Auto-discover and register all tools from tools directory
   */
  async discoverAndRegister(): Promise<void> {
    if (!existsSync(this.toolsDirectory)) {
      throw new ConfigError(`Tools directory not found: ${this.toolsDirectory}`);
    }

    const entries = readdirSync(this.toolsDirectory, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const toolPath = join(this.toolsDirectory, entry.name);
      const indexPath = join(toolPath, 'index.ts');
      const configPath = join(toolPath, 'tool.config.json');

      if (!existsSync(indexPath) || !existsSync(configPath)) {
        console.warn(`Skipping ${entry.name}: missing index.ts or tool.config.json`);
        continue;
      }

      try {
        const toolModule = await import(indexPath);
        const tool: ITool = toolModule.default;

        if (!this.validateTool(tool)) {
          console.warn(`Skipping ${entry.name}: invalid tool structure`);
          continue;
        }

        this.register(tool);
        console.log(`✓ Registered tool: ${tool.config.name}`);
      } catch (error) {
        console.error(`Failed to load tool ${entry.name}:`, error);
      }
    }

    if (this.tools.size === 0) {
      throw new ConfigError('No tools registered. At least one tool is required.');
    }
  }

  /**
   * Validate tool structure
   */
  private validateTool(tool: ITool): boolean {
    if (!tool || typeof tool !== 'object') {
      return false;
    }

    if (!tool.config || typeof tool.config !== 'object') {
      return false;
    }

    if (!tool.config.name || typeof tool.config.name !== 'string') {
      return false;
    }

    if (typeof tool.execute !== 'function') {
      return false;
    }

    return true;
  }

  /**
   * Register a single tool
   */
  register(tool: ITool): void {
    if (!this.validateTool(tool)) {
      throw new ConfigError(`Invalid tool structure: ${tool?.config?.name || 'unknown'}`);
    }

    if (this.tools.has(tool.config.name)) {
      throw new ConfigError(`Tool already registered: ${tool.config.name}`);
    }

    this.tools.set(tool.config.name, tool);
  }

  /**
   * Get tool by name
   */
  get(name: string): ITool {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new ConfigError(`Tool not found: ${name}`);
    }
    return tool;
  }

  /**
   * Check if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Get all registered tools
   */
  getAll(): ITool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }
}

