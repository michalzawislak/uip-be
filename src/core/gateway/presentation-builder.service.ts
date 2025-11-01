import type { Presentation, ResponseAction } from '@common/types';
import type { IToolConfig } from '@tools/tool.interface';

export class PresentationBuilderService {
  build(
    toolConfig: IToolConfig,
    data: unknown
  ): Presentation {
    if (toolConfig.contentType) {
      return this.buildFromMetadata(toolConfig, data);
    }

    return this.buildGeneric(toolConfig, data);
  }

  private buildFromMetadata(toolConfig: IToolConfig, data: unknown): Presentation {
    const metadata = toolConfig.contentType!;
    
    const title = this.extractTitle(data, metadata.primaryField);
    const summary = this.generateSummary(data, toolConfig.name);
    const displayType = (metadata.defaultDisplayType as 'card' | 'table' | 'list' | 'text' | 'chart' | 'custom' | undefined) || this.inferDisplayType(data);
    
    return {
      title: title || toolConfig.description,
      summary,
      icon: metadata.icon,
      displayType,
      primaryField: metadata.primaryField,
      visualPriority: this.detectVisualPriority(data),
      layout: this.generateLayout(data)
    };
  }

  private buildGeneric(
    toolConfig: IToolConfig,
    data: unknown
  ): Presentation {
    const displayType = this.inferDisplayType(data);
    const summary = this.generateSummary(data, toolConfig.name);
    
    return {
      title: toolConfig.description,
      summary,
      displayType,
      layout: this.generateLayout(data)
    };
  }

  private extractTitle(data: unknown, primaryField?: string): string | null {
    if (!data || typeof data !== 'object') {
      return null;
    }

    const obj = data as Record<string, unknown>;

    if (primaryField && obj[primaryField]) {
      return String(obj[primaryField]);
    }

    const titleFields = ['title', 'name', 'productName', 'heading', 'subject'];
    for (const field of titleFields) {
      if (obj[field] && typeof obj[field] === 'string') {
        return obj[field] as string;
      }
    }

    return null;
  }

  private generateSummary(data: unknown, _toolName: string): string {
    if (typeof data === 'string') {
      return data.length > 100 ? `${data.substring(0, 97)}...` : data;
    }

    if (Array.isArray(data)) {
      return `Znaleziono ${data.length} element${data.length === 1 ? '' : 'ów'}`;
    }

    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      
      if (obj.summary && typeof obj.summary === 'string') {
        return obj.summary;
      }

      const keys = Object.keys(obj);
      if (keys.length === 0) {
        return 'Przetworzono dane';
      }

      const sampleValue = obj[keys[0]];
      if (typeof sampleValue === 'string' && sampleValue.length < 50) {
        return sampleValue;
      }

      return `Zwrócono ${keys.length} pól danych`;
    }

    return 'Przetwarzanie zakończone pomyślnie';
  }

  private inferDisplayType(data: unknown): 'card' | 'table' | 'list' | 'text' {
    if (typeof data === 'string') {
      return 'text';
    }

    if (Array.isArray(data)) {
      if (data.length === 0) {
        return 'list';
      }

      const firstItem = data[0];
      if (firstItem && typeof firstItem === 'object') {
        return 'table';
      }
      return 'list';
    }

    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      const keys = Object.keys(obj);
      
      if (keys.length > 10) {
        return 'table';
      }

      return 'card';
    }

    return 'text';
  }

  private detectVisualPriority(data: unknown): { highlight?: string[]; secondary?: string[] } {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return {};
    }

    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);

    const highlightKeywords = ['name', 'title', 'value', 'amount', 'total', 'result', 'score', 'calories', 'price'];
    const secondaryKeywords = ['id', 'date', 'timestamp', 'updated', 'created', 'version', 'source', 'note'];

    const highlight = keys.filter(key => 
      highlightKeywords.some(keyword => key.toLowerCase().includes(keyword))
    );

    const secondary = keys.filter(key => 
      secondaryKeywords.some(keyword => key.toLowerCase().includes(keyword))
    );

    return {
      highlight: highlight.length > 0 ? highlight : undefined,
      secondary: secondary.length > 0 ? secondary : undefined
    };
  }

  private generateLayout(data: unknown) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return undefined;
    }

    const obj = data as Record<string, unknown>;
    const keys = Object.keys(obj);

    if (keys.length === 0) {
      return undefined;
    }

    const sections = [];
    const nestedKeys: string[] = [];
    const simpleKeys: string[] = [];

    for (const key of keys) {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        nestedKeys.push(key);
      } else {
        simpleKeys.push(key);
      }
    }

    if (simpleKeys.length > 0) {
      sections.push({
        title: undefined,
        fields: simpleKeys,
        format: 'key-value-vertical' as const,
        priority: 'high' as const
      });
    }

    for (const nestedKey of nestedKeys) {
      const nestedObj = obj[nestedKey];
      if (nestedObj && typeof nestedObj === 'object') {
        const nestedFields = Object.keys(nestedObj as Record<string, unknown>);
        sections.push({
          title: this.formatFieldName(nestedKey),
          fields: nestedFields.map(f => `${nestedKey}.${f}`),
          format: 'key-value-vertical' as const,
          priority: 'normal' as const
        });
      }
    }

    if (sections.length === 0) {
      return undefined;
    }

    return {
      sections,
      columnsCount: sections.length > 2 ? 2 : 1
    };
  }

  private formatFieldName(fieldName: string): string {
    return fieldName
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/^\w/, c => c.toUpperCase());
  }

  buildActions(
    toolName: string,
    data: unknown
  ): ResponseAction[] {
    const actions: ResponseAction[] = [];

    if (toolName === 'nutrition-analyzer' && data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (obj.nutritionData) {
        actions.push({
          id: 'add-to-meal-plan',
          label: 'Dodaj do planu posiłków',
          description: 'Użyj tych danych w generatorze planu posiłków',
          actionType: 'api-call',
          context: {
            toolName: 'meal-plan-generator',
            params: { nutritionData: obj.nutritionData }
          },
          icon: '📅',
          primary: true
        });
      }
    }

    if (toolName === 'image-analysis') {
      actions.push({
        id: 'extract-more-details',
        label: 'Wyciągnij więcej szczegółów',
        actionType: 'api-call',
        context: {
          toolName: 'data-extraction'
        },
        icon: '🔍'
      });
    }

    if (typeof data === 'string' || (data && typeof data === 'object')) {
      actions.push({
        id: 'download-json',
        label: 'Pobierz jako JSON',
        actionType: 'download',
        icon: '💾'
      });
    }

    actions.push({
      id: 'share',
      label: 'Udostępnij',
      actionType: 'share',
      icon: '🔗'
    });

    return actions;
  }
}

