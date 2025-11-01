# Frontend Specification - Universal Input Processor

> **Dokument kontekstowy dla AI** do implementacji aplikacji frontendowej w Svelte/SvelteKit

---

## 🎯 PODSUMOWANIE PROJEKTU

### Co budujemy?
**Uniwersalny interfejs webowy** do backendu Universal Input Processor - systemu AI, który automatycznie przetwarza dane tekstowe i pliki, dobierając odpowiednie narzędzia.

### Główne założenia:
- **Framework:** SvelteKit + TypeScript
- **Styling:** TailwindCSS
- **Filozofia:** "ChatGPT meets Dropzone" - prostota z potęgą
- **Target:** Nowoczesna, responsywna SPA z dark mode
- **Backend API:** REST API (http://localhost:3000)

---

## 📡 BACKEND API - Co już mamy

### Dostępne endpointy:

#### 1. `POST /v1/process`
**Główny endpoint przetwarzania**

**Request (multipart/form-data):**
```typescript
{
  instruction: string;        // Wymagane - polecenie użytkownika
  llm_config?: string;        // Opcjonalne - default: "CLAUDE_FAST"
  file?: File;                // Opcjonalne - PDF, JPG, PNG, WebP, GIF (max 10MB)
}
```

**Response (success):**
```typescript
{
  success: true;
  message: string;           // Human-readable summary
  result: unknown;           // Actual result (text, structured data, etc.)
  metadata: {
    executionTimeMs: number;
    toolsUsed: string[];     // Array of tool names used
    llmModel: string;
    planGenerated: boolean;
    stepsCompleted: number;
  };
}
```

**Response (error):**
```typescript
{
  success: false;
  error: string;
  failedAtStep?: number;
  completedSteps?: string[];
  metadata: {
    executionTimeMs: number;
    llmModel?: string;
    requestId: string;
  };
}
```

#### 2. `GET /v1/tools`
**Lista dostępnych narzędzi**

**Response:**
```typescript
{
  tools: Array<{
    name: string;
    description: string;
    capabilities: string[];
  }>;
}
```

#### 3. `GET /health`
**Health check**

**Response:**
```typescript
{
  status: "healthy";
  timestamp: string;
  version: string;
  uptime: number;
}
```

### Dostępne narzędzia AI (8 tools):
1. **simple-ask** - Proste pytania bez kontekstu
2. **pdf-extraction** - Ekstrakcja tekstu z PDF
3. **image-analysis** - Analiza obrazów (OCR, opisy, dokumenty medyczne)
4. **nutrition-analyzer** - Analiza wartości odżywczych
5. **meal-plan-generator** - Generowanie planów żywieniowych
6. **medical-explainer** - Wyjaśnianie terminów medycznych
7. **recipe-nutrition-calculator** - Kalkulacja wartości odżywczych przepisów
8. **data-extraction** - Ekstrakcja ustrukturyzowanych danych

### Modele LLM (llm_config):
- `CLAUDE_FAST` (default) - szybki i ekonomiczny
- `CLAUDE_SMART` - najinteligentniejszy, wolniejszy
- `GPT_FAST` - szybki GPT
- `GPT_SMART` - pełny GPT-4

---

## 🏗️ STRUKTURA APLIKACJI

### Routing (SvelteKit):
```
/                    → Landing page (hero + marketing)
/app                 → Główna aplikacja (procesor)
/app/history        → Historia zapytań
/app/tools          → Przeglądarka narzędzi
/docs               → Dokumentacja
/about              → O projekcie
```

### Folder structure:
```
src/
├── routes/
│   ├── +layout.svelte
│   ├── +page.svelte              # Landing
│   ├── app/
│   │   ├── +page.svelte          # Main app
│   │   ├── history/+page.svelte
│   │   └── tools/+page.svelte
│   ├── docs/+page.svelte
│   └── about/+page.svelte
│
├── lib/
│   ├── components/
│   │   ├── FileDropzone.svelte
│   │   ├── InstructionInput.svelte
│   │   ├── ProcessingIndicator.svelte
│   │   ├── ResultsDisplay.svelte
│   │   ├── AdvancedOptions.svelte
│   │   ├── Header.svelte
│   │   └── ui/                   # shadcn-svelte components
│   │
│   ├── stores/
│   │   ├── app.ts                # currentRequest, isProcessing, lastResult
│   │   ├── history.ts            # queryHistory
│   │   ├── settings.ts           # theme, selectedModel, apiEndpoint
│   │   └── tools.ts              # availableTools
│   │
│   ├── api/
│   │   └── client.ts             # API wrapper functions
│   │
│   ├── types/
│   │   ├── api.ts                # API DTOs
│   │   └── app.ts                # Frontend types
│   │
│   └── utils/
│       ├── formatters.ts
│       ├── validators.ts
│       └── storage.ts            # LocalStorage wrapper
│
└── app.css                       # Tailwind imports
```

---

## 🎨 KOMPONENTY - SZCZEGÓŁY

### 1. `/app` - Główna aplikacja

**Layout:**
```
┌─────────────────────────────────────┐
│  Header (logo, nav, settings)       │
├─────────────────────────────────────┤
│                                      │
│  FileDropzone                        │
│  (drag & drop area)                  │
│                                      │
│  InstructionInput                    │
│  (textarea + send button)            │
│                                      │
│  AdvancedOptions                     │
│  (collapsible: model selection)      │
│                                      │
│  ─────────────────────────────────   │
│                                      │
│  ProcessingIndicator                 │
│  (when processing)                   │
│                                      │
│  ResultsDisplay                      │
│  (response + metadata)               │
│                                      │
└─────────────────────────────────────┘
```

### Komponent: FileDropzone.svelte

**Props:**
```typescript
{
  onFileSelected: (file: File) => void;
  maxSize?: number;            // default: 10MB
  acceptedTypes?: string[];    // default: PDF, images
}
```

**Stany:**
- Idle - "Upuść plik tutaj lub kliknij aby wybrać"
- Hover (drag over) - highlight border, "Upuść teraz!"
- File loaded - show preview/icon, filename, size, [x] button

**Funkcjonalność:**
- Drag & drop support
- Click to select
- Walidacja: size, MIME type
- Image preview
- Remove file button

### Komponent: InstructionInput.svelte

**Props:**
```typescript
{
  onSubmit: (instruction: string) => void;
  disabled?: boolean;
  placeholder?: string;
}
```

**Features:**
- Auto-expanding textarea
- Character counter (optional)
- 📎 Attach file button (alternative to dropzone)
- Enter to submit (Shift+Enter for new line)
- Random placeholder suggestions:
  - "Wyciągnij kluczowe informacje z tego PDF"
  - "Jaka jest wartość odżywcza tego posiłku?"
  - "Przeanalizuj wyniki badań z tego zdjęcia"
  - itd.

### Komponent: ProcessingIndicator.svelte

**Props:**
```typescript
{
  currentStage: string;         // "Analizuję intencję...", "Wykonuję: pdf-extraction..."
  estimatedTime?: number;       // seconds remaining
}
```

**Wyświetla:**
- Animated spinner / progress bar
- Current stage text
- Time estimation (if available)
- Skeleton UI (loading placeholder)

### Komponent: ResultsDisplay.svelte

**Props:**
```typescript
{
  result: ProcessResponse | ErrorResponse;
}
```

**Sekcje:**

**A) Main result:**
- Jeśli text → markdown rendering
- Jeśli structured data → formatted cards/tables
- Jeśli error → error alert box

**B) Metadata (collapsible):**
- Tools used (with icons)
- Execution time per step
- Total time
- Model used
- Tokens used

**C) Action buttons:**
- 📋 Copy result
- 💾 Save as... (TXT, JSON)
- 🔄 Process again
- ⭐ Add to favorites

### Komponent: AdvancedOptions.svelte

**Collapsible panel:**
- Model dropdown (CLAUDE_FAST, CLAUDE_SMART, GPT_FAST, GPT_SMART)
- Info tooltips for each model
- Checkbox: "Pokaż szczegóły debugowania"
- Checkbox: "Zapisz w historii" (default: true)

---

## 🔄 USER FLOW

### Główny scenariusz - Processing Request:

```
1. User wpisuje instruction (np. "Oblicz kalorie tego posiłku")
2. [Opcjonalnie] User uploaduje plik (zdjęcie jedzenia)
3. [Opcjonalnie] User wybiera model (default: CLAUDE_FAST)
4. User klika "Wyślij" lub Enter

   ↓

5. Frontend validation:
   - Instruction nie puste
   - File (jeśli jest) spełnia wymagania (size, type)

   ↓

6. Set isProcessing = true
   → Show ProcessingIndicator
   → Disable form

   ↓

7. Build FormData:
   - instruction
   - llm_config
   - file (if present)

   ↓

8. POST /v1/process
   (with loading states updates: "Analizuję...", "Wykonuję...")

   ↓

9. Receive response (success or error)

   ↓

10. Parse response
    - If success → extract result, message, metadata
    - If error → extract error message, failedAtStep

   ↓

11. Update stores:
    - lastResult = response
    - Add to queryHistory
    - isProcessing = false

   ↓

12. Render ResultsDisplay
    - Show result (formatted)
    - Show metadata
    - Show action buttons

   ↓

13. Show toast: "Gotowe!" (success) or "Błąd: ..." (error)

   ↓

14. Save to LocalStorage (history, settings)
```

---

## 💾 STATE MANAGEMENT (Svelte Stores)

### stores/app.ts
```typescript
import { writable } from 'svelte/store';
import type { ProcessResponse, ErrorResponse } from '$lib/types/api';

export const currentRequest = writable<{
  instruction: string;
  file?: File;
  llmConfig: string;
} | null>(null);

export const isProcessing = writable<boolean>(false);

export const processingStage = writable<string>('');

export const lastResult = writable<ProcessResponse | ErrorResponse | null>(null);
```

### stores/history.ts
```typescript
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface HistoryItem {
  id: string;
  timestamp: number;
  instruction: string;
  fileMetadata?: {
    name: string;
    size: number;
    type: string;
  };
  result: ProcessResponse | ErrorResponse;
}

// Load from localStorage
const storedHistory = browser ? localStorage.getItem('queryHistory') : null;
const initialHistory: HistoryItem[] = storedHistory ? JSON.parse(storedHistory) : [];

export const queryHistory = writable<HistoryItem[]>(initialHistory);

// Auto-save to localStorage
if (browser) {
  queryHistory.subscribe(value => {
    localStorage.setItem('queryHistory', JSON.stringify(value));
  });
}

// Helper functions
export function addToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
  const newItem: HistoryItem = {
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now()
  };
  
  queryHistory.update(items => [newItem, ...items]);
}

export function clearHistory() {
  queryHistory.set([]);
}

export function deleteHistoryItem(id: string) {
  queryHistory.update(items => items.filter(item => item.id !== id));
}
```

### stores/settings.ts
```typescript
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Theme
const storedTheme = browser ? localStorage.getItem('theme') : null;
export const theme = writable<'light' | 'dark'>(storedTheme as 'light' | 'dark' || 'light');

if (browser) {
  theme.subscribe(value => {
    localStorage.setItem('theme', value);
    document.documentElement.classList.toggle('dark', value === 'dark');
  });
}

// Selected Model
const storedModel = browser ? localStorage.getItem('selectedModel') : null;
export const selectedModel = writable<string>(storedModel || 'CLAUDE_FAST');

if (browser) {
  selectedModel.subscribe(value => {
    localStorage.setItem('selectedModel', value);
  });
}

// API Endpoint (for dev/testing)
export const apiEndpoint = writable<string>(
  browser ? localStorage.getItem('apiEndpoint') || 'http://localhost:3000' : 'http://localhost:3000'
);

if (browser) {
  apiEndpoint.subscribe(value => {
    localStorage.setItem('apiEndpoint', value);
  });
}
```

### stores/tools.ts
```typescript
import { writable } from 'svelte/store';
import type { Tool } from '$lib/types/api';

export const availableTools = writable<Tool[]>([]);
export const toolsLoading = writable<boolean>(false);
export const toolsError = writable<string | null>(null);
```

---

## 🌐 API CLIENT

### lib/api/client.ts
```typescript
import type { ProcessResponse, ErrorResponse, ToolsResponse, HealthResponse } from '$lib/types/api';
import { get } from 'svelte/store';
import { apiEndpoint } from '$lib/stores/settings';

function getApiUrl() {
  return get(apiEndpoint);
}

export async function processRequest(
  instruction: string,
  llmConfig: string,
  file?: File
): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append('instruction', instruction);
  formData.append('llm_config', llmConfig);
  
  if (file) {
    formData.append('file', file);
  }

  const response = await fetch(`${getApiUrl()}/v1/process`, {
    method: 'POST',
    body: formData
  });

  const data = await response.json();

  if (!response.ok || !data.success) {
    throw new Error(data.error || 'Unknown error occurred');
  }

  return data;
}

export async function getAvailableTools(): Promise<ToolsResponse> {
  const response = await fetch(`${getApiUrl()}/v1/tools`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch tools');
  }

  return response.json();
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${getApiUrl()}/health`);
  
  if (!response.ok) {
    throw new Error('Health check failed');
  }

  return response.json();
}
```

---

## 🎨 DESIGN SYSTEM

### Kolory (Tailwind config):

**Light mode:**
```javascript
colors: {
  primary: {
    DEFAULT: '#6366f1',      // indigo-500
    hover: '#4f46e5',        // indigo-600
  },
  success: '#10b981',        // green-500
  error: '#ef4444',          // red-500
  warning: '#f59e0b',        // amber-500
}
```

**Dark mode:** (automatic via Tailwind `dark:` prefix)

### Typography:
- Font: Inter (Google Fonts) lub system font stack
- Headings: font-bold
- Body: font-normal
- Code: font-mono

### Tailwind classes - common patterns:

**Button:**
```html
<button class="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover 
               transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
  Wyślij
</button>
```

**Card:**
```html
<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 
            rounded-xl shadow-sm p-6">
  ...
</div>
```

**Input:**
```html
<input class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 
              rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent 
              bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />
```

---

## 📊 TYPY (TypeScript)

### lib/types/api.ts
```typescript
// Request
export interface ProcessRequest {
  instruction: string;
  llm_config?: string;
  file?: File;
}

// Success Response
export interface ProcessResponse {
  success: true;
  message: string;
  result: unknown;
  metadata: {
    executionTimeMs: number;
    toolsUsed: string[];
    llmModel: string;
    planGenerated: boolean;
    stepsCompleted: number;
  };
}

// Error Response
export interface ErrorResponse {
  success: false;
  error: string;
  failedAtStep?: number;
  completedSteps?: string[];
  metadata: {
    executionTimeMs: number;
    llmModel?: string;
    requestId: string;
  };
}

// Tools
export interface Tool {
  name: string;
  description: string;
  capabilities: string[];
}

export interface ToolsResponse {
  tools: Tool[];
}

// Health
export interface HealthResponse {
  status: 'healthy';
  timestamp: string;
  version: string;
  uptime: number;
}
```

---

## ♿ ACCESSIBILITY (A11Y)

### Wymagania:
1. **Keyboard navigation:**
   - Tab przez wszystkie interactive elementy
   - Enter/Space dla buttonów
   - Esc dla modali/dropdownów

2. **ARIA:**
   - `aria-label` dla icon buttons
   - `aria-live="polite"` dla ProcessingIndicator
   - `aria-describedby` dla error messages
   - `role="alert"` dla errors

3. **Focus management:**
   - Visible focus rings (nie usuwać outline!)
   - Focus trap w modalach
   - Focus restoration po zamknięciu modala

4. **Color contrast:**
   - Minimum WCAG AA (4.5:1 dla text)
   - Nie polegać tylko na kolorze (ikony + text)

5. **Screen readers:**
   - Alt text dla obrazów
   - Descriptive link text (nie "kliknij tutaj")
   - Status announcements (ARIA live regions)

---

## 🧪 TESTING CHECKLIST

### Manual testing scenarios:

**Podstawowe flow:**
1. [ ] User może wpisać pytanie i otrzymać odpowiedź
2. [ ] User może uploadować plik (drag & drop)
3. [ ] User może uploadować plik (click to select)
4. [ ] Processing indicator pokazuje się podczas przetwarzania
5. [ ] Wynik wyświetla się poprawnie (text)
6. [ ] Metadata jest widoczna i poprawna
7. [ ] Zapytanie zapisuje się w historii

**Error handling:**
8. [ ] Błąd walidacji (puste instruction) pokazuje error
9. [ ] Błąd walidacji (plik za duży) pokazuje error
10. [ ] Błąd API (500) pokazuje user-friendly message
11. [ ] Błąd network (offline) pokazuje odpowiedni komunikat

**Funkcjonalności:**
12. [ ] Historia pokazuje poprzednie zapytania
13. [ ] Można usunąć zapytanie z historii
14. [ ] Można wyczyścić całą historię
15. [ ] "Ponów" w historii wypełnia formularz
16. [ ] Dark mode toggle działa
17. [ ] Model selection zmienia model
18. [ ] Copy result button kopiuje do clipboard

**Responsywność:**
19. [ ] Działa na mobile (320px width)
20. [ ] Działa na tablet (768px width)
21. [ ] Działa na desktop (1920px width)

**Accessibility:**
22. [ ] Keyboard navigation działa (Tab, Enter, Esc)
23. [ ] Focus rings są widoczne
24. [ ] Screen reader announcements działają

---

## 🚀 DEPLOYMENT

### Environment variables (.env):
```bash
# Public (dostępne w browser)
PUBLIC_API_URL=http://localhost:3000

# Private (tylko server-side)
# (currently none needed)
```

### Build & deploy (Vercel):
```bash
# Local build
npm run build

# Preview
npm run preview

# Deploy to Vercel
vercel deploy

# Production
vercel --prod
```

---

## 📝 MVP CHECKLIST - Phase by Phase

### Phase 1: Setup (1-2h)
- [ ] `npm create svelte@latest frontend`
- [ ] Setup TypeScript, ESLint, Prettier
- [ ] Install TailwindCSS
- [ ] Install dependencies (svelte-french-toast, lucide-svelte, etc.)
- [ ] Configure svelte.config.js, tailwind.config.js
- [ ] Setup folder structure
- [ ] Create .env.example

### Phase 2: API & Stores (2-3h)
- [ ] Define types (lib/types/api.ts, lib/types/app.ts)
- [ ] Create API client (lib/api/client.ts)
- [ ] Create stores (app.ts, history.ts, settings.ts, tools.ts)
- [ ] Test API connection (health check)

### Phase 3: Core Components (4-6h)
- [ ] Header component (logo, nav, theme toggle)
- [ ] FileDropzone component (drag & drop, file preview)
- [ ] InstructionInput component (textarea, submit)
- [ ] ProcessingIndicator component (spinner, stages)
- [ ] ResultsDisplay component (markdown, metadata, actions)
- [ ] AdvancedOptions component (model selection)

### Phase 4: Pages (3-4h)
- [ ] Landing page (/) - hero, examples, CTA
- [ ] Main app page (/app) - integrate all components
- [ ] History page (/app/history) - list, search, delete
- [ ] Tools page (/app/tools) - grid of available tools
- [ ] About page (/about) - simple info page

### Phase 5: Features & Polish (3-4h)
- [ ] LocalStorage persistence (history, settings)
- [ ] Dark mode implementation
- [ ] Toast notifications (success, error)
- [ ] Copy to clipboard functionality
- [ ] Responsive design (mobile, tablet, desktop)
- [ ] Loading states & skeletons
- [ ] Error handling (all scenarios)

### Phase 6: Testing & Deployment (2-3h)
- [ ] Manual testing (wszystkie scenariusze)
- [ ] Fix bugs
- [ ] Performance optimization
- [ ] Accessibility audit
- [ ] Deploy to Vercel
- [ ] Test on production URL

**Total estimated time: 15-22h**

---

## 🎯 SUCCESS CRITERIA - MVP Complete when:

1. ✅ User może wysłać proste pytanie tekstowe i otrzymać odpowiedź
2. ✅ User może uploadować plik (PDF lub obraz) i go przetworzyć
3. ✅ Processing indicator pokazuje progress w czasie rzeczywistym
4. ✅ Wyniki są czytelnie wyświetlane (text + metadata)
5. ✅ Historia zapytań działa (lista, szczegóły, usuwanie)
6. ✅ Dark mode toggle działa
7. ✅ Aplikacja jest responsywna (działa na mobile i desktop)
8. ✅ Error handling działa we wszystkich scenariuszach
9. ✅ Aplikacja jest wdrożona i dostępna online
10. ✅ Performance: LCP < 2.5s, FID < 100ms

---

## 💡 WSKAZÓWKI IMPLEMENTACYJNE

### 1. Zacznij od prostego:
- Najpierw zbuduj basic flow: input → API → output
- Potem dodawaj features (file upload, history, etc.)
- Na końcu polish (animations, dark mode, etc.)

### 2. Testuj często:
- Po każdym komponencie sprawdź czy działa
- Użyj `console.log` do debugowania
- Test na różnych rozmiarach ekranu

### 3. Używaj AI do pomocy:
- Copilot/Cursor do boilerplate
- ChatGPT do rozwiązywania problemów
- Ale zawsze rozumiej co wklejasz

### 4. Performance tips:
- Lazy load komponentów (gdy nie są widoczne)
- Debounce dla textarea (optional)
- Optimize images (webp, lazy loading)
- Use Svelte transitions wisely (nie za dużo animacji)

### 5. Common pitfalls:
- ❌ Nie zapomnij o error handling (każdy fetch może fail)
- ❌ Nie pomijaj accessibility (keyboard, ARIA)
- ❌ Nie hardcoduj API URL (użyj env variables)
- ❌ Nie przesadzaj z animations (może slow down app)

---

## 📚 DODATKOWE RESOURCES

### Dokumentacja:
- SvelteKit: https://kit.svelte.dev/docs
- TailwindCSS: https://tailwindcss.com/docs
- shadcn-svelte: https://www.shadcn-svelte.com/
- TypeScript: https://www.typescriptlang.org/docs

### Inspiracje UI:
- https://v0.dev - AI-generated components
- https://ui.shadcn.com - Component examples
- https://tailwindui.com - Tailwind components

### Tools:
- https://realfavicongenerator.net/ - Favicon generator
- https://coolors.co/ - Color palette generator
- https://heroicons.com/ - Icons (alternative to lucide)

---

## 🎉 FINALNE UWAGI

**Ten dokument to kompletna specyfikacja** do zaimplementowania frontendu. Zawiera:
- ✅ Szczegółowy opis każdej strony i komponentu
- ✅ Pełny opis API i integracji z backendem
- ✅ State management z przykładami kodu
- ✅ Design system i styling guidelines
- ✅ Testing checklist
- ✅ Phase-by-phase implementation plan

**Możesz przekazać ten dokument innemu LLM** (Claude, GPT-4, etc.) z promptem:
```
Na podstawie tego dokumentu (FRONTEND-SPEC.md) zaimplementuj 
aplikację frontendową w SvelteKit. Zacznij od Phase 1 i 
przechodź kolejno przez wszystkie fazy. Pytaj jeśli coś 
jest niejasne.
```

**Backend jest gotowy i działa** - frontend może zacząć konsumować API od razu.

---

**Dokument stworzony:** 2025-10-11  
**Backend Version:** 1.0.0 (MVP Complete)  
**Target Frontend:** SvelteKit + TypeScript + TailwindCSS  
**Estimated Implementation:** 15-22h

**Powodzenia! 🚀**

