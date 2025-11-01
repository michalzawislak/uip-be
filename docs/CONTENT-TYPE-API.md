# Content Type API - Dokumentacja dla Frontend Developerów

## 📦 Envelope Pattern

Od wersji 1.1.0 API zwraca **ustrukturyzowaną odpowiedź** w formacie "envelope" z metadanymi prezentacji.

---

## 🎯 Nowa Struktura Odpowiedzi

### Sukces (200 OK)

```json
{
  "success": true,
  "contentType": "nutrition/data-v1",
  "presentation": {
    "title": "Mleko 2%",
    "summary": "50 kcal na 100g",
    "icon": "🥗",
    "displayType": "card",
    "primaryField": "productName",
    "visualPriority": {
      "highlight": ["calories", "protein"],
      "secondary": ["fiber", "salt"]
    },
    "layout": {
      "sections": [
        {
          "title": "Makroskładniki",
          "fields": ["calories", "protein", "carbohydrates", "fat"],
          "format": "key-value-vertical",
          "priority": "high"
        }
      ],
      "columnsCount": 1
    }
  },
  "data": {
    "nutritionData": {
      "productName": "Mleko 2%",
      "per100g": {
        "calories": 50,
        "protein": 3.4
      }
    }
  },
  "actions": [
    {
      "id": "add-to-meal-plan",
      "label": "Dodaj do planu posiłków",
      "description": "Użyj tych danych w generatorze planu posiłków",
      "actionType": "api-call",
      "context": {
        "toolName": "meal-plan-generator",
        "params": { ... }
      },
      "icon": "📅",
      "primary": true
    },
    {
      "id": "download-json",
      "label": "Pobierz jako JSON",
      "actionType": "download",
      "icon": "💾"
    }
  ],
  "metadata": {
    "executionTimeMs": 2341,
    "toolsUsed": ["nutrition-analyzer"],
    "llmModel": "CLAUDE_FAST",
    "planGenerated": true,
    "stepsCompleted": 1
  }
}
```

---

## 🔍 Discovery Endpoints

### GET /v1/content-types

Pobiera listę wszystkich dostępnych typów treści.

```bash
curl http://localhost:3000/v1/content-types
```

**Odpowiedź:**
```json
{
  "contentTypes": [
    {
      "contentType": "nutrition/data-v1",
      "version": "1.0.0",
      "category": "health",
      "toolName": "nutrition-analyzer",
      "icon": "🥗",
      "defaultDisplayType": "card"
    },
    {
      "contentType": "text/plain-v1",
      "version": "1.0.0",
      "category": "text",
      "toolName": "simple-ask",
      "icon": "💬",
      "defaultDisplayType": "text"
    }
  ],
  "total": 8
}
```

### GET /v1/content-types/:type

Pobiera szczegółowe informacje o konkretnym typie treści.

```bash
curl 'http://localhost:3000/v1/content-types/nutrition%2Fdata-v1'
```

**Odpowiedź:**
```json
{
  "contentType": "nutrition/data-v1",
  "version": "1.0.0",
  "category": "health",
  "toolName": "nutrition-analyzer",
  "toolDescription": "Analyze nutritional values...",
  "icon": "🥗",
  "defaultDisplayType": "card",
  "primaryField": "productName",
  "capabilities": ["nutrition", "calories", "macros"],
  "inputTypes": ["text/plain", "image/jpeg"],
  "examples": []
}
```

---

## 🎨 Implementacja Frontendu

### Architektura 3-poziomowa

#### **Poziom 1: Content Type Registry (Dedykowane Komponenty)**

```typescript
// Angular/React - content-type-registry.ts
import { NutritionDataCard } from './components/NutritionDataCard';
import { SimpleTextDisplay } from './components/SimpleTextDisplay';
import { MealPlanView } from './components/MealPlanView';

const CONTENT_TYPE_HANDLERS: Record<string, ComponentType> = {
  'nutrition/data-v1': NutritionDataCard,
  'text/plain-v1': SimpleTextDisplay,
  'meal-plan/weekly-v1': MealPlanView,
  'image/analysis-v1': ImageAnalysisResult,
  'medical/explanation-v1': MedicalExplanationCard,
  'data/structured-v1': DataTableView
};

export function getHandlerForContentType(contentType: string): ComponentType | null {
  return CONTENT_TYPE_HANDLERS[contentType] || null;
}
```

#### **Poziom 2: Generic Renderers (Fallback)**

```typescript
// generic-renderer.ts
export function renderGeneric(response: APIResponse) {
  const { presentation, data } = response;
  
  // Wykorzystaj presentation hints
  switch (presentation.displayType) {
    case 'card':
      return <GenericCard presentation={presentation} data={data} />;
    case 'table':
      return <GenericTable presentation={presentation} data={data} />;
    case 'list':
      return <GenericList presentation={presentation} data={data} />;
    case 'text':
      return <TextDisplay content={data} />;
    default:
      return <JsonViewer data={data} />;
  }
}
```

#### **Poziom 3: Universal Renderer**

```typescript
// UniversalResponseRenderer.tsx (React/Angular)
export function UniversalResponseRenderer({ response }: Props) {
  const { contentType, presentation, data, actions } = response;
  
  // 1. Próbuj dedykowany komponent
  const Handler = getHandlerForContentType(contentType);
  if (Handler) {
    return (
      <>
        <Handler data={data} presentation={presentation} />
        {actions && <ActionBar actions={actions} />}
      </>
    );
  }
  
  // 2. Użyj generic renderer z layout hints
  if (presentation.layout) {
    return (
      <>
        <LayoutRenderer layout={presentation.layout} data={data} />
        {actions && <ActionBar actions={actions} />}
      </>
    );
  }
  
  // 3. Fallback na podstawie displayType
  return (
    <>
      {renderGeneric(response)}
      {actions && <ActionBar actions={actions} />}
    </>
  );
}
```

---

## 📋 Przykłady Komponentów

### NutritionDataCard (Dedykowany)

```typescript
// components/NutritionDataCard.tsx
interface Props {
  data: NutritionResponse;
  presentation: Presentation;
}

export function NutritionDataCard({ data, presentation }: Props) {
  const { nutritionData, summary } = data;
  
  return (
    <Card>
      <CardHeader>
        <Icon>{presentation.icon}</Icon>
        <Title>{presentation.title}</Title>
      </CardHeader>
      
      <CardBody>
        <Summary>{presentation.summary}</Summary>
        
        <MacrosChart data={nutritionData.per100g} />
        
        <NutritionTable
          data={nutritionData.per100g}
          highlight={presentation.visualPriority?.highlight}
        />
      </CardBody>
    </Card>
  );
}
```

### GenericCard (Fallback)

```typescript
// components/GenericCard.tsx
interface Props {
  presentation: Presentation;
  data: unknown;
}

export function GenericCard({ presentation, data }: Props) {
  return (
    <Card>
      <CardHeader>
        {presentation.icon && <Icon>{presentation.icon}</Icon>}
        <Title>{presentation.title}</Title>
      </CardHeader>
      
      <CardBody>
        <Alert type="info">{presentation.summary}</Alert>
        
        {presentation.layout ? (
          <LayoutRenderer layout={presentation.layout} data={data} />
        ) : (
          <AutoFieldRenderer 
            data={data}
            highlight={presentation.visualPriority?.highlight}
          />
        )}
      </CardBody>
    </Card>
  );
}
```

### LayoutRenderer

```typescript
// components/LayoutRenderer.tsx
export function LayoutRenderer({ layout, data }: Props) {
  const columns = layout.columnsCount || 1;
  
  return (
    <Grid columns={columns}>
      {layout.sections.map((section, idx) => (
        <Section key={idx} priority={section.priority}>
          {section.title && <SectionTitle>{section.title}</SectionTitle>}
          
          <FieldList format={section.format}>
            {section.fields.map(field => {
              const value = getNestedValue(data, field);
              return (
                <Field key={field}>
                  <Label>{formatFieldName(field)}</Label>
                  <Value>{formatValue(value)}</Value>
                </Field>
              );
            })}
          </FieldList>
        </Section>
      ))}
    </Grid>
  );
}
```

### ActionBar

```typescript
// components/ActionBar.tsx
export function ActionBar({ actions }: { actions: ResponseAction[] }) {
  const handleAction = (action: ResponseAction) => {
    switch (action.actionType) {
      case 'api-call':
        // Wywołaj kolejne API z context
        apiClient.post('/v1/process', action.context?.params);
        break;
      case 'download':
        // Pobierz dane jako JSON
        downloadAsJson(action.context?.data);
        break;
      case 'share':
        // Udostępnij
        navigator.share({ url: window.location.href });
        break;
    }
  };
  
  return (
    <ButtonGroup>
      {actions.map(action => (
        <Button
          key={action.id}
          variant={action.primary ? 'primary' : 'secondary'}
          onClick={() => handleAction(action)}
        >
          {action.icon} {action.label}
        </Button>
      ))}
    </ButtonGroup>
  );
}
```

---

## 🔄 Strategie Ładowania Content Types

### Strategia 1: Eager Loading (Start Aplikacji)

```typescript
// app-init.ts
export async function initializeApp() {
  const response = await fetch('http://localhost:3000/v1/content-types');
  const { contentTypes } = await response.json();
  
  // Zapisz w store/context
  contentTypeStore.set(contentTypes);
}
```

### Strategia 2: Lazy Loading (On-Demand)

```typescript
// content-type-service.ts
const schemaCache = new Map<string, ContentTypeInfo>();

export async function getContentTypeInfo(type: string): Promise<ContentTypeInfo> {
  if (schemaCache.has(type)) {
    return schemaCache.get(type)!;
  }
  
  const encoded = encodeURIComponent(type);
  const response = await fetch(`http://localhost:3000/v1/content-types/${encoded}`);
  const info = await response.json();
  
  schemaCache.set(type, info);
  return info;
}
```

---

## 🎯 Wszystkie Dostępne Content Types

| Content Type | Narzędzie | Ikona | Display Type | Kategoria |
|--------------|-----------|-------|--------------|-----------|
| `nutrition/data-v1` | nutrition-analyzer | 🥗 | card | health |
| `text/plain-v1` | simple-ask | 💬 | text | text |
| `meal-plan/weekly-v1` | meal-plan-generator | 📅 | table | health |
| `medical/explanation-v1` | medical-explainer | ⚕️ | card | health |
| `image/analysis-v1` | image-analysis | 🔍 | card | vision |
| `data/structured-v1` | data-extraction | 📊 | card | data |
| `recipe/nutrition-v1` | recipe-nutrition-calculator | 🍳 | card | food |
| `document/extracted-v1` | pdf-extraction | 📄 | text | document |

---

## 💡 Best Practices

### 1. Zawsze obsługuj unknown types
```typescript
if (!handler) {
  return <GenericRenderer response={response} />;
}
```

### 2. Wykorzystuj presentation hints
```typescript
const displayType = response.presentation.displayType;
const highlighted = response.presentation.visualPriority?.highlight;
```

### 3. Cache schemas
```typescript
// Unikaj wielokrotnego pobierania tego samego schema
const schemaCache = new LRUCache<string, ContentTypeInfo>(50);
```

### 4. Graceful degradation
```typescript
// Jeśli coś pójdzie nie tak, pokaż chociaż summary
<Fallback>
  <Alert>{response.presentation.summary}</Alert>
  <JsonViewer data={response.data} />
</Fallback>
```

### 5. TypeScript Types
```typescript
// Stwórz typy dla własnych content types
interface NutritionDataResponse {
  contentType: 'nutrition/data-v1';
  data: {
    nutritionData: NutritionData;
    summary: string;
  };
}

// Type guard
function isNutritionData(response: APIResponse): response is NutritionDataResponse {
  return response.contentType === 'nutrition/data-v1';
}
```

---

## 🚀 Quick Start dla Nowego Typu

1. **Backend** - Dodaj `contentType` do `tool.config.json`
2. **Frontend** - Implementuj dedykowany komponent (opcjonalnie)
3. **Frontend** - Zarejestruj w `CONTENT_TYPE_HANDLERS`
4. **Fallback** - Działa automatycznie przez generic renderer!

---

## 📚 Dodatkowe Zasoby

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Ogólna architektura systemu
- [README.md](../README.md) - Setup i konfiguracja
- [TOOLS-IMPLEMENTATION-PLAN.md](./TOOLS-IMPLEMENTATION-PLAN.md) - Plan narzędzi

