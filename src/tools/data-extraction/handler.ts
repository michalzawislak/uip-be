import type { IToolContext, IToolResult } from '../tool.interface';

interface ExtractedData {
  [key: string]: unknown;
}

/**
 * Extract structured data from text using LLM
 */
export async function execute(context: IToolContext): Promise<IToolResult> {
  try {
    const startTime = Date.now();

    console.log(`   🔧 [TOOL:data-extraction] Rozpoczynam ekstrakcję strukturyzowanych danych...`);

    const text = extractTextFromContext(context);

    if (!text) {
      console.log(`   ✗ [TOOL:data-extraction] Brak tekstu do przetworzenia`);
      return {
        success: false,
        output: null,
        error: 'No text provided for extraction'
      };
    }

    const prompt = buildExtractionPrompt(text, context.instruction);

    const response = await context.llmClient.generateCompletion([
      {
        role: 'user',
        content: prompt
      }
    ]);

    const extractedData = parseJsonResponse(response.content);

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:data-extraction] Wyekstrahowano dane (${duration}ms, ${response.usage?.totalTokens || 0} tokenów)`);

    return {
      success: true,
      output: extractedData,
      metadata: {
        processingTimeMs: duration,
        tokensUsed: response.usage?.totalTokens,
        model: response.model,
        dataType: detectDataType(extractedData)
      }
    };
  } catch (error) {
    console.log(`   ✗ [TOOL:data-extraction] Błąd: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred during data extraction'
    };
  }
}

/**
 * Extract text from context (previousResult or instruction)
 */
function extractTextFromContext(context: IToolContext): string {
  if (context.previousResult) {
    const prev = context.previousResult as Record<string, unknown>;
    
    if (typeof prev.text === 'string') {
      return prev.text;
    }
    
    if (typeof prev.output === 'string') {
      return prev.output;
    }
    
    if (typeof context.previousResult === 'string') {
      return context.previousResult;
    }
    
    return JSON.stringify(context.previousResult);
  }

  return context.instruction || '';
}

/**
 * Build extraction prompt with smart detection
 */
function buildExtractionPrompt(text: string, instruction: string): string {
  return `Analyze the following text and extract structured data as JSON.

<text>
${text}
</text>

<instruction>
${instruction}
</instruction>

<rules>
- Return ONLY valid JSON without any markdown formatting
- Detect the type of data automatically
- For medical lab results, use this format:
  {
    "type": "medical_lab_results",
    "test_date": "YYYY-MM-DD or null",
    "patient_info": {"name": "...", ...} or null,
    "parameters": [
      {
        "name": "Parameter name",
        "value": number or string,
        "unit": "unit" or null,
        "reference_range": "min-max" or null,
        "status": "normal|low|high" or null
      }
    ]
  }
- For invoices/receipts, use:
  {
    "type": "invoice",
    "date": "YYYY-MM-DD",
    "total": number,
    "items": [...],
    "vendor": "..."
  }
- For contacts, use:
  {
    "type": "contact",
    "name": "...",
    "email": "...",
    "phone": "..."
  }
- For generic data, use key-value pairs:
  {
    "type": "generic",
    "data": { ... }
  }
- Extract ALL available information
- Use null for missing values
- Preserve original units and values
- Do not invent data
</rules>

Return ONLY the JSON object, no explanations.`;
}

/**
 * Parse JSON from LLM response
 */
function parseJsonResponse(response: string): ExtractedData {
  let jsonStr = response.trim();

  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  jsonStr = jsonStr.trim();

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed as ExtractedData;
  } catch (error) {
    throw new Error(`Failed to parse JSON response: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Detect data type from extracted structure
 */
function detectDataType(data: ExtractedData): string {
  if (typeof data !== 'object' || data === null) {
    return 'unknown';
  }

  if ('type' in data && typeof data.type === 'string') {
    return data.type;
  }

  if ('parameters' in data && Array.isArray(data.parameters)) {
    return 'medical_lab_results';
  }

  if ('items' in data && 'total' in data) {
    return 'invoice';
  }

  if ('name' in data && ('email' in data || 'phone' in data)) {
    return 'contact';
  }

  return 'generic';
}

