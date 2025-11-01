export type DisplayType = 'card' | 'table' | 'list' | 'text' | 'chart' | 'custom';

export type FieldFormat = 'key-value-horizontal' | 'key-value-vertical' | 'grid' | 'inline';

export interface LayoutSection {
  title?: string;
  fields: string[];
  format: FieldFormat;
  priority?: 'high' | 'normal' | 'low';
}

export interface PresentationLayout {
  sections: LayoutSection[];
  columnsCount?: number;
}

export interface VisualPriority {
  highlight?: string[];
  secondary?: string[];
  hidden?: string[];
}

export interface Presentation {
  title: string;
  summary: string;
  icon?: string;
  displayType?: DisplayType;
  primaryField?: string;
  visualPriority?: VisualPriority;
  layout?: PresentationLayout;
}

export interface ActionContext {
  toolName?: string;
  params?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ResponseAction {
  id: string;
  label: string;
  description?: string;
  actionType: 'api-call' | 'navigation' | 'download' | 'share' | 'custom';
  context?: ActionContext;
  icon?: string;
  primary?: boolean;
}

export interface ContentTypeMetadata {
  contentType: string;
  version: string;
  category: string;
  schemaUrl?: string;
  examples?: unknown[];
}

export interface EnvelopeResponse<T = unknown> {
  success: true;
  contentType: string;
  presentation: Presentation;
  data: T;
  actions?: ResponseAction[];
  metadata: {
    executionTimeMs: number;
    toolsUsed: string[];
    llmModel: string;
    planGenerated: boolean;
    stepsCompleted: number;
    phaseTimings?: Record<string, number>;
  };
}

