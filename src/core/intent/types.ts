/**
 * Intent analysis result
 */
export interface IIntentAnalysis {
  intent: string;
  confidence: number;
  requiresFile: boolean;
  suggestedTools: string[];
  reasoning?: string;
}

/**
 * Context for intent detection
 */
export interface IIntentContext {
  instruction: string;
  fileMetadata?: {
    mimetype: string;
    originalname: string;
    size: number;
  };
  availableTools: string[];
}

