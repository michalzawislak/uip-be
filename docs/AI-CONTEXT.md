
# AI Assistant Context - Universal Input Processor

> **Purpose:** This file provides context for AI coding assistants (Cursor, Copilot, etc.) to help implement the Universal Input Processor project.

---

## 🎯 Project Overview (Quick Reference)

**What We're Building:**
- Fastify-based API with single endpoint: `POST /v1/process`
- AI-powered intent detection (Anthropic Claude / OpenAI GPT)
- Plugin-based tool system (auto-discovery from `tools/` folder)
- Pipeline execution (sequential tool chaining)
- Synchronous processing (max 60s timeout)
- Zero backend storage (stateless, in-memory only)

**Key Tech Stack:**
- Fastify (web framework)
- TypeScript (strict mode)
- Anthropic SDK + OpenAI SDK
- Zod (validation)
- Vitest (testing)

---

## 📁 Complete Folder Structure

```
universal-input-processor/
├── .cursorrules                    # AI assistant rules
├── .env.example
├── .env                            # NEVER commit
├── .gitignore
├── .prettierrc
├── .eslintrc.json
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── README.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AI-CONTEXT.md               # This file
│   └── SETUP.md
│
├── config/
│   ├── llm-models.json
│   └── app.config.json
│
├── src/
│   ├── server.ts
│   ├── app.ts
│   │
│   ├── core/
│   │   ├── gateway/
│   │   │   ├── gateway.controller.ts
│   │   │   ├── gateway.service.ts
│   │   │   └── dto/
│   │   ├── intent/
│   │   │   ├── intent-detector.service.ts
│   │   │   ├── planner.service.ts
│   │   │   └── types.ts
│   │   ├── orchestrator/
│   │   │   ├── pipeline-executor.service.ts
│   │   │   ├── tool-loader.service.ts
│   │   │   └── types.ts
│   │   └── llm/
│   │       ├── llm-factory.service.ts
│   │       ├── llm-client.interface.ts
│   │       ├── config-loader.service.ts
│   │       └── providers/
│   │           ├── anthropic.client.ts
│   │           └── openai.client.ts
│   │
│   ├── tools/
│   │   ├── registry.service.ts
│   │   ├── tool.interface.ts
│   │   ├── simple-ask/
│   │   ├── pdf-extraction/
│   │   ├── image-analysis/
│   │   └── web-search/
│   │
│   ├── common/
│   │   ├── types/
│   │   ├── utils/
│   │   └── constants/
│   │
│   └── plugins/
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## 🎨 Coding Guidelines & Patterns

### **TypeScript Standards**

```typescript
// ✅ ALWAYS use strict typing
interface User {
  id: string;
  name: string;
}

// ❌ NEVER use 'any'
const data: any = {}; // NO!

// ✅ Use 'unknown' with type guards instead
const data: unknown = {};
if (typeof data === 'object' && data !== null) {
  // safe to use
}

// ✅ Use const assertions for constants
export const TOOL_TYPES = {
  PDF: 'pdf-extraction',
  IMAGE: 'image-analysis'
} as const;

// ✅ Prefer interfaces over types for object shapes
interface ToolConfig { /* ... */ }

// ✅ Use type for unions/intersections
type LLMProvider = 'anthropic' | 'openai';
```

### **File Naming Conventions**

```
✅ service files:      some-name.service.ts
✅ controller files:   some-name.controller.ts
✅ interface files:    some-name.interface.ts
✅ type files:         some-name.types.ts
✅ util files:         some-name.utils.ts
✅ test files:         some-name.spec.ts
✅ config files:       some-name.config.json

❌ NEVER:             SomeName.ts, some_name.ts, someName.ts
```

### **Import Order & Organization**

```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';
import path from 'path';

// 2. External dependencies
import Fastify from 'fastify';
import Anthropic from '@anthropic-ai/sdk';

// 3. Internal - using path aliases
import { ILLMClient } from '@core/llm/llm-client.interface';
import { ITool } from '@tools/tool.interface';
import { ProcessingError } from '@common/types/errors';

// 4. Relative imports (same directory)
import { helperFunction } from './utils';
```

### **Error Handling Pattern**

```typescript
// ✅ Always use custom error types
throw new ToolExecutionError('pdf-extraction', 'Invalid PDF structure');

// ✅ Catch and transform errors
try {
  await tool.execute(context);
} catch (error) {
  if (error instanceof ToolExecutionError) {
    throw error;
  }
  throw new ToolExecutionError(
    tool.config.name,
    error instanceof Error ? error.message : 'Unknown error'
  );
}

// ✅ Fail fast
if (!result.success) {
  throw new ProcessingError('Step failed', 'STEP_FAILED', stepIndex);
}
```

### **Service Class Pattern**

```typescript
// ✅ Use classes for services
export class SomeService {
  private readonly dependency: OtherService;

  constructor(dependency: OtherService) {
    this.dependency = dependency;
  }

  async doSomething(input: string): Promise<Result> {
    // Implementation
  }
}
```

### **Async/Await Pattern**

```typescript
// ✅ Always use async/await
async function process(): Promise<Result> {
  const result = await someAsyncOperation();
  return result;
}

// ❌ NEVER mix promises and callbacks
someAsyncOperation().then(result => { /* NO! */ });
```

---

## 🔧 Tool Implementation Pattern

**Every tool MUST follow this structure:**

### 1. Folder Structure
```
tools/your-tool/
├── index.ts              # Export point
├── tool.config.json      # Metadata
└── handler.ts            # Logic
```

### 2. tool.config.json Template
```json
{
  "name": "your-tool-name",
  "version": "1.0.0",
  "description": "What this tool does",
  "capabilities": ["capability1", "capability2"],
  "inputTypes": ["text/plain", "image/jpeg"],
  "outputType": "structured-data",
  "estimatedDurationMs": 2000,
  "priority": 10
}
```

### 3. index.ts Template
```typescript
import config from './tool.config.json';
import { execute } from './handler';
import type { ITool } from '../tool.interface';

const tool: ITool = {
  config,
  execute
};

export default tool;
```

### 4. handler.ts Template
```typescript
import type { IToolContext, IToolResult } from '../tool.interface';

export async function execute(context: IToolContext): Promise<IToolResult> {
  try {
    const startTime = Date.now();
    const output = await processInput(context);
    
    return {
      success: true,
      output,
      metadata: {
        processingTimeMs: Date.now() - startTime
      }
    };
  } catch (error) {
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function processInput(context: IToolContext): Promise<unknown> {
  // Your tool logic here
}
```

---

## 🤖 Prompts for AI Assistant

### When Creating Services:
```
Create a TypeScript service class for [SERVICE_NAME] that:
- Follows the service pattern from docs/AI-CONTEXT.md
- Uses dependency injection via constructor
- Has proper error handling with custom error types
- Includes JSDoc comments for public methods
- Uses strict TypeScript typing (no 'any')
- Imports from path aliases (@core, @tools, @common)
```

### When Creating Tools:
```
Create a new tool in src/tools/[TOOL_NAME]/ that:
- Follows the tool implementation pattern from docs/AI-CONTEXT.md
- Has tool.config.json with proper metadata
- Implements ITool interface
- Has handler.ts with execute function
- Uses the tool result pattern (success, output, metadata)
- Handles errors gracefully without throwing
```

### When Creating Tests:
```
Create unit tests for [FILE_NAME] using Vitest that:
- Test happy path and error cases
- Mock external dependencies
- Follow Arrange-Act-Assert pattern
- Use descriptive test names
- Cover edge cases
```

---

## 📝 Code Comments Guidelines

```typescript
// ✅ Use JSDoc for public APIs
/**
 * Executes the pipeline of tools based on the execution plan.
 * 
 * @param context - Pipeline execution context
 * @returns Pipeline execution result with all step outputs
 * @throws {PipelineError} When pipeline execution fails
 */
export async function executePipeline(
  context: PipelineContext
): Promise<PipelineResult> {
  // Implementation
}

// ✅ Explain WHY, not WHAT
// Use 60s timeout to accommodate slow LLM API responses
const timeout = 60000;

// ❌ Don't state the obvious
const x = 5; // Set x to 5 - NO!
```

---

## 🚨 Critical Rules

### **MUST DO:**
1. ✅ Always validate input before processing
2. ✅ Use Zod for runtime validation where needed
3. ✅ Log errors with context (requestId, step, etc.)
4. ✅ Return structured responses
5. ✅ Clean up resources (buffers, file handles)
6. ✅ Fail fast on errors
7. ✅ Use environment variables for secrets
8. ✅ Add JSDoc to exported functions/classes

### **NEVER DO:**
1. ❌ Never use 'any' type
2. ❌ Never store files on disk
3. ❌ Never commit .env file
4. ❌ Never swallow errors silently
5. ❌ Never use synchronous operations
6. ❌ Never hardcode API keys
7. ❌ Never mutate input parameters
8. ❌ Never use console.log in production

---

## 🔄 Development Workflow

### **When Starting New Feature:**
1. Review architecture docs
2. Check if types exist in `src/common/types/`
3. Create interfaces first, implementation second
4. Write tests alongside code
5. Run `npm run lint` before commit

### **When Adding New Tool:**
1. Create folder in `src/tools/[tool-name]/`
2. Copy template from pattern above
3. Update `tool.config.json` with metadata
4. Implement `handler.ts`
5. Export from `index.ts`
6. Tool auto-discovered on server start

---

## 📚 Reference - Quick Links

**Key Files:**
- `docs/ARCHITECTURE.md` - Full system design
- `src/common/types/index.ts` - All TypeScript types
- `config/llm-models.json` - Available LLM models
- `.cursorrules` - AI assistant rules

**Common Tasks:**
- Add LLM model: Edit `config/llm-models.json`
- Add tool: Create folder in `src/tools/`
- Change timeout: Edit `config/app.config.json`

---

## 🎯 Implementation Priority Order

1. **Core Infrastructure** (Week 1)
   - Server setup
   - LLM abstraction
   - Tool registry

2. **First Tool** (Week 1)
   - Simple ASK tool
   - End-to-end test

3. **Planning & Orchestration** (Week 2)
   - Intent detector
   - Pipeline executor
   - Gateway controller

4. **Additional Tools** (Week 2-3)
   - PDF extraction
   - Image analysis
   - Web search

5. **Polish & Testing** (Week 3)
   - Error handling
   - Unit tests
   - Integration tests

---

## 💡 AI Assistant Tips

**When implementing:**
1. Check if types exist in `src/common/types/`
2. Follow exact folder structure
3. Use path aliases
4. Include error handling
5. Add JSDoc comments
6. Follow naming conventions

**When creating tools:**
1. Create 3 files (index, config, handler)
2. Follow ITool interface
3. Use templates
4. Return structured IToolResult
5. Never throw from execute()

---

## 🔐 Security Reminders

- API keys in .env ONLY
- Validate all user inputs
- Sanitize file uploads
- Use Zod for runtime validation
- Never execute user code without sandboxing
- Rate limit in production

---

## 📊 Performance Guidelines

- Keep tool execution < 10s when possible
- Monitor token usage
- Log execution times per tool
- Set reasonable timeouts (60s max)

---

**Last Updated:** 2025-10-01  
**Project Version:** 1.0.0



