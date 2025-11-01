# Przykład Implementacji w SvelteKit + TypeScript

## 🎯 Typy TypeScript

```typescript
// src/lib/types/api.ts
export type DisplayType = 'card' | 'table' | 'list' | 'text' | 'chart' | 'custom';

export interface Presentation {
  title: string;
  summary: string;
  icon?: string;
  displayType?: DisplayType;
  primaryField?: string;
  visualPriority?: {
    highlight?: string[];
    secondary?: string[];
  };
  layout?: {
    sections: Array<{
      title?: string;
      fields: string[];
      format: string;
      priority?: 'high' | 'normal' | 'low';
    }>;
    columnsCount?: number;
  };
}

export interface ResponseAction {
  id: string;
  label: string;
  description?: string;
  actionType: 'api-call' | 'navigation' | 'download' | 'share' | 'custom';
  context?: Record<string, unknown>;
  icon?: string;
  primary?: boolean;
}

export interface APIResponse<T = unknown> {
  success: boolean;
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
  };
}

export interface ContentType {
  contentType: string;
  version: string;
  category: string;
  toolName: string;
  icon?: string;
  defaultDisplayType?: string;
}
```

---

## 🏪 Content Type Registry Store

```typescript
// src/lib/stores/contentTypeRegistry.ts
import { writable } from 'svelte/store';
import type { ComponentType } from 'svelte';

interface ContentTypeHandler {
  component: ComponentType;
  name: string;
}

const handlers = new Map<string, ContentTypeHandler>();

// Registry store
function createContentTypeRegistry() {
  const { subscribe, update } = writable(handlers);

  return {
    subscribe,
    register: (contentType: string, component: ComponentType, name: string) => {
      update((h) => {
        h.set(contentType, { component, name });
        return h;
      });
    },
    get: (contentType: string): ContentTypeHandler | undefined => {
      return handlers.get(contentType);
    },
    has: (contentType: string): boolean => {
      return handlers.has(contentType);
    }
  };
}

export const contentTypeRegistry = createContentTypeRegistry();

// Rejestracja komponentów (w hooks.client.ts lub layout)
import NutritionCard from '$lib/components/content-types/NutritionCard.svelte';
import SimpleText from '$lib/components/content-types/SimpleText.svelte';
import MealPlanTable from '$lib/components/content-types/MealPlanTable.svelte';

export function initializeContentTypes() {
  contentTypeRegistry.register('nutrition/data-v1', NutritionCard, 'NutritionCard');
  contentTypeRegistry.register('text/plain-v1', SimpleText, 'SimpleText');
  contentTypeRegistry.register('meal-plan/weekly-v1', MealPlanTable, 'MealPlanTable');
}
```

---

## 🔌 API Client

```typescript
// src/lib/api/client.ts
import type { APIResponse } from '$lib/types/api';

const API_BASE = 'http://localhost:3000';

export async function processRequest(
  instruction: string,
  file?: File,
  llmConfig = 'CLAUDE_FAST'
): Promise<APIResponse> {
  const formData = new FormData();
  formData.append('instruction', instruction);
  formData.append('llm_config', llmConfig);

  if (file) {
    formData.append('file', file);
  }

  const response = await fetch(`${API_BASE}/v1/process`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  return response.json();
}

export async function getContentTypes() {
  const response = await fetch(`${API_BASE}/v1/content-types`);
  return response.json();
}

export async function getContentTypeInfo(type: string) {
  const encoded = encodeURIComponent(type);
  const response = await fetch(`${API_BASE}/v1/content-types/${encoded}`);
  return response.json();
}
```

---

## 🎨 Universal Response Renderer

```svelte
<!-- src/lib/components/UniversalResponseRenderer.svelte -->
<script lang="ts">
  import { contentTypeRegistry } from '$lib/stores/contentTypeRegistry';
  import GenericCard from './GenericCard.svelte';
  import ActionBar from './ActionBar.svelte';
  import type { APIResponse } from '$lib/types/api';

  export let response: APIResponse;

  $: handler = $contentTypeRegistry.get(response.contentType);
  $: Component = handler?.component || GenericCard;
</script>

<div class="response-container">
  <!-- Dynamicznie renderowany komponent -->
  <svelte:component 
    this={Component} 
    data={response.data}
    presentation={response.presentation}
  />

  <!-- Action bar -->
  {#if response.actions && response.actions.length > 0}
    <ActionBar actions={response.actions} />
  {/if}
</div>

<style>
  .response-container {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
</style>
```

---

## 🥗 Przykład Dedykowanego Komponentu

```svelte
<!-- src/lib/components/content-types/NutritionCard.svelte -->
<script lang="ts">
  import type { Presentation } from '$lib/types/api';

  export let data: {
    nutritionData: {
      productName: string;
      brand?: string;
      per100g: {
        calories: number;
        protein: number;
        carbohydrates: number;
        sugars: number;
        fat: number;
        saturatedFat: number;
        fiber: number;
        salt: number;
      };
    };
    summary: string;
  };
  
  export let presentation: Presentation;

  $: macros = [
    {
      name: 'Białko',
      value: data.nutritionData.per100g.protein,
      color: '#4caf50'
    },
    {
      name: 'Węglowodany',
      value: data.nutritionData.per100g.carbohydrates,
      color: '#2196f3'
    },
    {
      name: 'Tłuszcze',
      value: data.nutritionData.per100g.fat,
      color: '#ff9800'
    }
  ];

  $: total = macros.reduce((sum, m) => sum + m.value, 0);
  $: macrosWithPercent = macros.map(m => ({
    ...m,
    percentage: (m.value / total) * 100
  }));

  $: nutritionItems = [
    { key: 'calories', label: 'Kalorie', value: data.nutritionData.per100g.calories, unit: 'kcal' },
    { key: 'protein', label: 'Białko', value: data.nutritionData.per100g.protein, unit: 'g' },
    { key: 'carbohydrates', label: 'Węglowodany', value: data.nutritionData.per100g.carbohydrates, unit: 'g' },
    { key: 'sugars', label: 'Cukry', value: data.nutritionData.per100g.sugars, unit: 'g' },
    { key: 'fat', label: 'Tłuszcz', value: data.nutritionData.per100g.fat, unit: 'g' },
    { key: 'saturatedFat', label: 'Tłuszcz nasycony', value: data.nutritionData.per100g.saturatedFat, unit: 'g' },
    { key: 'fiber', label: 'Błonnik', value: data.nutritionData.per100g.fiber, unit: 'g' },
    { key: 'salt', label: 'Sól', value: data.nutritionData.per100g.salt, unit: 'g' }
  ];

  function isHighlighted(key: string): boolean {
    return presentation.visualPriority?.highlight?.includes(key) || false;
  }
</script>

<div class="nutrition-card">
  <div class="card-header">
    {#if presentation.icon}
      <span class="icon">{presentation.icon}</span>
    {/if}
    <h2>{presentation.title}</h2>
  </div>

  <div class="card-body">
    <p class="summary">{presentation.summary}</p>

    <!-- Wykres makroskładników -->
    <div class="macros-chart">
      {#each macrosWithPercent as macro}
        <div 
          class="macro" 
          style="width: {macro.percentage}%; background: {macro.color};"
        >
          <span class="label">{macro.name}</span>
          <span class="value">{macro.value}g</span>
        </div>
      {/each}
    </div>

    <!-- Tabela wartości odżywczych -->
    <table class="nutrition-table">
      <tbody>
        {#each nutritionItems as item}
          <tr class:highlight={isHighlighted(item.key)}>
            <td class="label">{item.label}</td>
            <td class="value">{item.value} {item.unit}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
</div>

<style>
  .nutrition-card {
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    overflow: hidden;
    background: white;
  }

  .card-header {
    background: #f5f5f5;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .icon {
    font-size: 1.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .card-body {
    padding: 1rem;
  }

  .summary {
    color: #666;
    margin-bottom: 1rem;
  }

  .macros-chart {
    display: flex;
    height: 40px;
    margin-bottom: 1rem;
    border-radius: 4px;
    overflow: hidden;
  }

  .macro {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    color: white;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .nutrition-table {
    width: 100%;
    border-collapse: collapse;
  }

  .nutrition-table tr {
    border-bottom: 1px solid #f0f0f0;
  }

  .nutrition-table tr.highlight {
    background: #fff3cd;
    font-weight: 600;
  }

  .nutrition-table td {
    padding: 0.5rem;
  }

  .nutrition-table .value {
    text-align: right;
    font-weight: 500;
  }
</style>
```

---

## 🎴 Generic Card Component

```svelte
<!-- src/lib/components/GenericCard.svelte -->
<script lang="ts">
  import type { Presentation } from '$lib/types/api';

  export let data: any;
  export let presentation: Presentation;

  let showJson = false;

  function formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  function getFieldValue(fieldPath: string): any {
    return fieldPath.split('.').reduce((obj, key) => obj?.[key], data);
  }

  function getDataFields() {
    if (typeof data !== 'object' || !data) {
      return [];
    }

    return Object.entries(data).map(([key, value]) => ({
      label: formatFieldName(key),
      value: typeof value === 'object' ? JSON.stringify(value) : String(value)
    }));
  }

  $: fields = getDataFields();
</script>

<div class="card">
  <div class="card-header">
    {#if presentation.icon}
      <span class="icon">{presentation.icon}</span>
    {/if}
    <h2>{presentation.title}</h2>
  </div>

  <div class="card-body">
    <div class="alert alert-info">
      {presentation.summary}
    </div>

    <!-- Layout-based rendering -->
    {#if presentation.layout}
      <div class="layout-container">
        {#each presentation.layout.sections as section}
          <div 
            class="section" 
            class:priority-high={section.priority === 'high'}
          >
            {#if section.title}
              <h3>{section.title}</h3>
            {/if}

            <div class="fields format-{section.format}">
              {#each section.fields as field}
                <div class="field">
                  <span class="label">{formatFieldName(field)}:</span>
                  <span class="value">{getFieldValue(field)}</span>
                </div>
              {/each}
            </div>
          </div>
        {/each}
      </div>
    {:else}
      <!-- Fallback: auto fields -->
      <div class="auto-fields">
        {#each fields as item}
          <div class="field">
            <span class="label">{item.label}:</span>
            <span class="value">{item.value}</span>
          </div>
        {/each}
      </div>
    {/if}

    <!-- JSON viewer toggle -->
    <details class="json-details" bind:open={showJson}>
      <summary>Zobacz surowe dane</summary>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </details>
  </div>
</div>

<style>
  .card {
    border: 1px solid #ddd;
    border-radius: 8px;
    background: white;
  }

  .card-header {
    background: #f8f9fa;
    padding: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .icon {
    font-size: 1.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1.25rem;
  }

  .card-body {
    padding: 1rem;
  }

  .alert {
    padding: 0.75rem;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  .alert-info {
    background: #d1ecf1;
    color: #0c5460;
  }

  .section {
    margin-bottom: 1.5rem;
  }

  .section.priority-high {
    border-left: 3px solid #007bff;
    padding-left: 1rem;
  }

  .fields.format-key-value-vertical .field {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem 0;
    border-bottom: 1px solid #f0f0f0;
  }

  .json-details {
    margin-top: 1rem;
  }

  .json-details pre {
    background: #f5f5f5;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.875rem;
  }
</style>
```

---

## 🔧 Action Bar Component

```svelte
<!-- src/lib/components/ActionBar.svelte -->
<script lang="ts">
  import type { ResponseAction } from '$lib/types/api';
  import { processRequest } from '$lib/api/client';

  export let actions: ResponseAction[];

  async function handleAction(action: ResponseAction) {
    switch (action.actionType) {
      case 'api-call':
        // Wywołaj kolejne API
        try {
          const result = await processRequest(
            action.context?.instruction as string,
            undefined,
            action.context?.llmConfig as string
          );
          console.log('API result:', result);
          // Możesz emitować event lub zaktualizować store
        } catch (error) {
          console.error('Action failed:', error);
        }
        break;

      case 'download':
        // Pobierz jako JSON
        const blob = new Blob([JSON.stringify(action.context?.data, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        a.click();
        URL.revokeObjectURL(url);
        break;

      case 'share':
        // Udostępnij
        if (navigator.share) {
          await navigator.share({
            title: 'Wyniki przetwarzania',
            url: window.location.href
          });
        }
        break;

      case 'navigation':
        // Nawiguj do innej strony
        window.location.href = action.context?.url as string;
        break;

      default:
        console.log('Unknown action:', action);
    }
  }
</script>

<div class="action-bar">
  {#each actions as action}
    <button
      class="action-button"
      class:primary={action.primary}
      on:click={() => handleAction(action)}
      title={action.description}
    >
      {#if action.icon}
        <span class="icon">{action.icon}</span>
      {/if}
      {action.label}
    </button>
  {/each}
</div>

<style>
  .action-bar {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .action-button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
    cursor: pointer;
    font-size: 0.875rem;
    transition: all 0.2s;
  }

  .action-button:hover {
    background: #f8f9fa;
    border-color: #adb5bd;
  }

  .action-button.primary {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }

  .action-button.primary:hover {
    background: #0056b3;
    border-color: #0056b3;
  }
</style>
```

---

## 📄 Przykład Strony (Route)

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { processRequest } from '$lib/api/client';
  import UniversalResponseRenderer from '$lib/components/UniversalResponseRenderer.svelte';
  import type { APIResponse } from '$lib/types/api';

  let instruction = '';
  let selectedFile: File | undefined;
  let loading = false;
  let error: string | null = null;
  let response: APIResponse | null = null;

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedFile = target.files?.[0];
  }

  async function handleSubmit(event: Event) {
    event.preventDefault();

    if (!instruction.trim()) {
      error = 'Wpisz instrukcję';
      return;
    }

    loading = true;
    error = null;
    response = null;

    try {
      response = await processRequest(instruction, selectedFile);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Wystąpił błąd';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Universal Input Processor</title>
</svelte:head>

<div class="container">
  <h1>Universal Input Processor</h1>

  <form on:submit={handleSubmit}>
    <div class="form-group">
      <label for="instruction">Instrukcja:</label>
      <textarea
        id="instruction"
        bind:value={instruction}
        rows="3"
        placeholder="Co chcesz zrobić?"
        disabled={loading}
      />
    </div>

    <div class="form-group">
      <label for="file">Plik (opcjonalnie):</label>
      <input
        type="file"
        id="file"
        on:change={handleFileSelect}
        disabled={loading}
      />
      {#if selectedFile}
        <span class="file-info">
          Wybrany: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </span>
      {/if}
    </div>

    <button type="submit" disabled={loading}>
      {loading ? 'Przetwarzanie...' : 'Wyślij'}
    </button>
  </form>

  {#if error}
    <div class="error">
      ❌ {error}
    </div>
  {/if}

  {#if response}
    <UniversalResponseRenderer {response} />
  {/if}
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
  }

  h1 {
    margin-bottom: 2rem;
  }

  form {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }

  .form-group {
    margin-bottom: 1rem;
  }

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  textarea,
  input[type='file'] {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    font-family: inherit;
  }

  textarea {
    resize: vertical;
  }

  .file-info {
    display: block;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #666;
  }

  button {
    width: 100%;
    padding: 0.75rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  button:hover:not(:disabled) {
    background: #0056b3;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  .error {
    padding: 1rem;
    background: #f8d7da;
    color: #721c24;
    border-radius: 4px;
    margin-bottom: 1rem;
  }

  :global(body) {
    background: #f8f9fa;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }
</style>
```

---

## 🔧 Inicjalizacja (Layout lub Hooks)

```typescript
// src/routes/+layout.ts (lub +layout.server.ts)
import { initializeContentTypes } from '$lib/stores/contentTypeRegistry';

export const load = () => {
  // Inicjalizuj registry komponentów
  initializeContentTypes();
  
  return {};
};
```

Lub w `src/hooks.client.ts`:

```typescript
// src/hooks.client.ts
import { initializeContentTypes } from '$lib/stores/contentTypeRegistry';

initializeContentTypes();
```

---

## 📦 Struktura Projektu

```
src/
├── lib/
│   ├── api/
│   │   └── client.ts              # API client
│   ├── components/
│   │   ├── UniversalResponseRenderer.svelte
│   │   ├── GenericCard.svelte
│   │   ├── ActionBar.svelte
│   │   └── content-types/
│   │       ├── NutritionCard.svelte
│   │       ├── SimpleText.svelte
│   │       └── MealPlanTable.svelte
│   ├── stores/
│   │   └── contentTypeRegistry.ts
│   └── types/
│       └── api.ts                 # TypeScript types
└── routes/
    ├── +layout.ts
    └── +page.svelte               # Główna strona
```

---

## 🚀 Quick Start

1. **Zainstaluj SvelteKit** (jeśli jeszcze nie masz):
```bash
npm create svelte@latest frontend
cd frontend
npm install
```

2. **Skopiuj typy i komponenty** z przykładów powyżej

3. **Uruchom dev server**:
```bash
npm run dev
```

4. **Otwórz** http://localhost:5173

---

## 💡 Zalety tego podejścia w SvelteKit

✅ **Reaktywność** - `$:` statements automatycznie przeliczają wartości  
✅ **Type-safe** - TypeScript w całym stacku  
✅ **Prosty store** - Svelte stores zamiast Redux/NgRx  
✅ **Dynamiczne komponenty** - `<svelte:component this={...}>`  
✅ **Małe bundle size** - Svelte kompiluje do vanilla JS  
✅ **SSR-ready** - SvelteKit wspiera server-side rendering  

To kompletny przykład dla SvelteKit + TypeScript! 🎉

