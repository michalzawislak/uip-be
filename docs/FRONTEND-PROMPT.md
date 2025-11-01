# Prompt Template dla LLM - Implementacja Frontendu

> **Ten dokument to gotowy prompt do przekazania innemu AI (Claude, GPT-4, etc.) w celu implementacji aplikacji**

---

## 📋 PROMPT DO SKOPIOWANIA

```
Twoim zadaniem jest zaimplementowanie aplikacji frontendowej w SvelteKit dla projektu Universal Input Processor.

# KONTEKST

Backend jest już gotowy i działa pod adresem http://localhost:3000. 
To REST API z głównym endpointem POST /v1/process, który przyjmuje:
- instruction (string) - polecenie użytkownika
- file (optional) - plik do przetworzenia (PDF, obrazy)
- llm_config (optional) - model AI (default: CLAUDE_FAST)

Backend automatycznie:
1. Analizuje intencję użytkownika
2. Dobiera odpowiednie narzędzia AI (8 dostępnych: pdf-extraction, image-analysis, nutrition-analyzer, etc.)
3. Wykonuje pipeline przetwarzania
4. Zwraca wynik + metadata (użyte narzędzia, czas wykonania)

# ZADANIE

Zaimplementuj nowoczesną, responsywną aplikację webową w SvelteKit, która będzie interfejsem do tego API.

# WYMAGANIA TECHNICZNE

## Stack:
- SvelteKit (latest)
- TypeScript (strict mode)
- TailwindCSS (styling)
- shadcn-svelte lub bits-ui (UI components - optional)
- lucide-svelte (icons)
- svelte-french-toast (notifications)

## Struktura projektu:
```
src/
├── routes/
│   ├── +page.svelte              # Landing page
│   └── app/
│       ├── +page.svelte          # Main app
│       ├── history/+page.svelte  # History view
│       └── tools/+page.svelte    # Tools browser
├── lib/
│   ├── components/
│   │   ├── FileDropzone.svelte
│   │   ├── InstructionInput.svelte
│   │   ├── ProcessingIndicator.svelte
│   │   ├── ResultsDisplay.svelte
│   │   └── Header.svelte
│   ├── stores/
│   │   ├── app.ts                # isProcessing, lastResult
│   │   ├── history.ts            # queryHistory (LocalStorage)
│   │   └── settings.ts           # theme, selectedModel
│   ├── api/
│   │   └── client.ts             # API wrapper
│   └── types/
│       └── api.ts                # TypeScript types
└── app.css
```

# GŁÓWNE KOMPONENTY

## 1. Landing Page (/)
- Hero section z gradient background
- Headline: "Uniwersalny Procesor AI dla Twoich Danych"
- CTA button → /app
- Sekcja "Jak to działa?" (3 kroki)
- Przykłady użycia (karty z ikonami)

## 2. Main App (/app)
Layout z góry do dołu:
- Header (logo, nav, theme toggle)
- FileDropzone (drag & drop, max 10MB)
- InstructionInput (textarea + send button)
- AdvancedOptions (collapsible: model selection)
- ProcessingIndicator (podczas przetwarzania)
- ResultsDisplay (wynik + metadata + action buttons)

### FileDropzone:
- Drag & drop support
- Click to select
- Walidacja: size (10MB), type (PDF, JPG, PNG, WebP, GIF)
- Preview dla obrazów
- Remove button
- States: idle, hover, file-loaded

### InstructionInput:
- Auto-expanding textarea
- Placeholder z przykładami (rotacja)
- 📎 Attach file button
- Enter to submit
- Disabled podczas przetwarzania

### ProcessingIndicator:
- Animated spinner
- Current stage text: "Analizuję intencję...", "Wykonuję: pdf-extraction..."
- Skeleton UI

### ResultsDisplay:
- Markdown rendering (dla text results)
- Formatted cards (dla structured data)
- Error alert (dla errors)
- Metadata section (collapsible):
  - Tools used
  - Execution time
  - Model used
- Action buttons:
  - 📋 Copy result
  - 🔄 Process again
  - ⭐ Add to favorites

## 3. History (/app/history)
- Lista poprzednich zapytań (z LocalStorage)
- Search/filter
- Grupowanie po dacie
- Każdy item: instruction, timestamp, tool used
- Actions: Zobacz wynik, Ponów, Usuń
- Clear all button

## 4. Tools Browser (/app/tools)
- Grid kart narzędzi (fetch z GET /v1/tools)
- Każda karta: icon, name, description, capabilities
- Modal z details
- "Wypróbuj teraz" button → /app

# API INTEGRATION

## API Client (lib/api/client.ts):

```typescript
export async function processRequest(
  instruction: string,
  llmConfig: string,
  file?: File
): Promise<ProcessResponse> {
  const formData = new FormData();
  formData.append('instruction', instruction);
  formData.append('llm_config', llmConfig);
  if (file) formData.append('file', file);

  const response = await fetch('http://localhost:3000/v1/process', {
    method: 'POST',
    body: formData
  });

  const data = await response.json();
  if (!data.success) throw new Error(data.error);
  return data;
}

export async function getAvailableTools() {
  const response = await fetch('http://localhost:3000/v1/tools');
  return response.json();
}
```

## Response Types:

Success:
```typescript
{
  success: true,
  message: string,
  result: unknown,
  metadata: {
    executionTimeMs: number,
    toolsUsed: string[],
    llmModel: string,
    planGenerated: boolean,
    stepsCompleted: number
  }
}
```

Error:
```typescript
{
  success: false,
  error: string,
  failedAtStep?: number,
  completedSteps?: string[],
  metadata: { ... }
}
```

# STATE MANAGEMENT

Użyj Svelte stores:

## stores/app.ts
```typescript
export const isProcessing = writable(false);
export const processingStage = writable('');
export const lastResult = writable<ProcessResponse | null>(null);
```

## stores/history.ts
```typescript
export const queryHistory = writable<HistoryItem[]>(loadFromLocalStorage());

// Auto-save do LocalStorage
queryHistory.subscribe(value => {
  localStorage.setItem('queryHistory', JSON.stringify(value));
});
```

## stores/settings.ts
```typescript
export const theme = writable<'light' | 'dark'>('light');
export const selectedModel = writable('CLAUDE_FAST');

// Sync with DOM
theme.subscribe(value => {
  document.documentElement.classList.toggle('dark', value === 'dark');
});
```

# DESIGN SYSTEM

## Kolory (Tailwind):
- Primary: indigo-500 (#6366f1)
- Success: green-500
- Error: red-500
- Background (light): white, gray-50
- Background (dark): gray-900, gray-800
- Text (light): gray-900
- Text (dark): gray-100

## Typography:
- Font: Inter (Google Fonts) lub system font
- Headings: font-bold
- Body: font-normal

## Components styling:
- Border radius: 8-12px
- Shadows: subtle (shadow-sm)
- Transitions: transition-colors duration-200
- Focus rings: ring-2 ring-primary

# USER FLOW

1. User wpisuje instruction (np. "Przeanalizuj ten PDF")
2. [Optional] User uploaduje plik
3. [Optional] User wybiera model (default: CLAUDE_FAST)
4. User klika "Wyślij"
5. Frontend: walidacja → set isProcessing=true → POST /v1/process
6. Podczas przetwarzania: show ProcessingIndicator
7. Otrzymanie response → parse → update stores
8. Show ResultsDisplay z wynikiem
9. Save do history (LocalStorage)
10. Toast notification "Gotowe!"

# FEATURES CHECKLIST

MVP (must-have):
- [ ] Wysyłanie prostych zapytań tekstowych
- [ ] Upload plików (drag & drop)
- [ ] Processing indicator
- [ ] Wyświetlanie wyników (text + metadata)
- [ ] Historia zapytań (LocalStorage)
- [ ] Dark mode toggle
- [ ] Responsywny design (mobile + desktop)
- [ ] Error handling
- [ ] Model selection
- [ ] Copy result button

Nice-to-have (v2):
- [ ] Export wyników (PDF, JSON)
- [ ] Favorites
- [ ] Keyboard shortcuts
- [ ] Voice input

# ACCESSIBILITY (A11Y)

- Keyboard navigation (Tab, Enter, Esc)
- ARIA labels (aria-label, aria-describedby)
- Focus management (visible focus rings)
- Color contrast (WCAG AA)
- Screen reader support (aria-live dla processing indicator)

# TESTING

Manual test scenarios:
1. Proste pytanie tekstowe → otrzymanie odpowiedzi
2. Upload pliku (drag & drop) → przetworzenie
3. Upload pliku (click to select) → przetworzenie
4. Błąd walidacji (puste instruction) → error message
5. Błąd API → user-friendly error
6. Historia → zapisuje się, można usunąć, można ponowić
7. Dark mode → toggle działa, persists w LocalStorage
8. Mobile → działa responsywnie

# IMPLEMENTATION PLAN

## Phase 1: Setup (1-2h)
- npm create svelte@latest frontend
- Setup TypeScript, TailwindCSS
- Install dependencies
- Configure svelte.config.js, tailwind.config.js
- Create folder structure

## Phase 2: API & Types (1-2h)
- Define types (lib/types/api.ts)
- Create API client (lib/api/client.ts)
- Create stores (app, history, settings)
- Test API connection

## Phase 3: Core Components (4-6h)
- FileDropzone
- InstructionInput
- ProcessingIndicator
- ResultsDisplay
- AdvancedOptions
- Header (with theme toggle)

## Phase 4: Pages (3-4h)
- Landing page (/)
- Main app (/app) - integrate components
- History (/app/history)
- Tools (/app/tools)

## Phase 5: Features & Polish (3-4h)
- LocalStorage persistence
- Dark mode implementation
- Toast notifications
- Copy to clipboard
- Responsive design
- Error handling

## Phase 6: Testing (2h)
- Manual testing wszystkich scenariuszy
- Fix bugs
- Performance check
- Accessibility audit

# SUCCESS CRITERIA

MVP complete when:
1. ✅ User może wysłać pytanie i otrzymać odpowiedź
2. ✅ User może uploadować plik i go przetworzyć
3. ✅ Processing indicator działa
4. ✅ Wyniki są czytelnie wyświetlane
5. ✅ Historia działa (save, load, delete)
6. ✅ Dark mode działa
7. ✅ Responsywność (mobile + desktop)
8. ✅ Error handling we wszystkich scenariuszach

# DODATKOWE WSKAZÓWKI

- Zacznij od prostego: najpierw basic flow (input → API → output)
- Testuj często po każdym komponencie
- Używaj console.log do debugowania
- Nie przesadzaj z animacjami (performance)
- Pamiętaj o error handling (każdy fetch może fail)
- Używaj environment variables dla API URL (PUBLIC_API_URL)

# PEŁNA SPECYFIKACJA

Kompletna dokumentacja (wszystkie szczegóły) znajduje się w pliku:
`docs/FRONTEND-SPEC.md`

Jeśli potrzebujesz więcej szczegółów o jakimkolwiek komponencie lub flow - sprawdź ten dokument.

# PYTANIE DO CIEBIE (LLM)

Czy rozumiesz zadanie i jesteś gotowy do implementacji?
Jeśli tak, zacznij od Phase 1 (Setup) i informuj mnie o postępach.
Pytaj jeśli coś jest niejasne.

Zaczynajmy! 🚀
```

---

## 📝 JAK UŻYĆ TEGO PROMPTU

1. **Skopiuj** cały tekst między \`\`\` (od "Twoim zadaniem..." do "Zaczynajmy! 🚀")

2. **Wklej** do nowej konwersacji z AI (Claude, GPT-4, Cursor, etc.)

3. **Opcjonalnie dodaj** na końcu:
   ```
   Mam pytanie: [twoje pytanie]
   ```
   lub
   ```
   Zacznij od implementacji Phase 1
   ```

4. **Załącz** też plik `FRONTEND-SPEC.md` jeśli AI potrafi czytać pliki

5. **Monitoruj** postępy i odpowiadaj na pytania AI

---

## ✅ CHECKLIST PRZED WYSŁANIEM PROMPTU

Upewnij się że:
- [ ] Backend działa (http://localhost:3000)
- [ ] Endpoint /v1/process odpowiada
- [ ] Endpoint /v1/tools zwraca listę narzędzi
- [ ] Masz Node.js >= 18 zainstalowany
- [ ] Masz npm >= 9 zainstalowany
- [ ] Znasz hasła/klucze (jeśli potrzebne dla backend)

---

## 🎯 EXPECTED OUTPUT

AI powinno:
1. Potwierdzić zrozumienie zadania
2. Zacząć od Phase 1 (Setup projektu)
3. Informować o postępach ("✅ Zakończono Phase 1, przechodzę do Phase 2...")
4. Pytać gdy coś jest niejasne
5. Pokazywać kod dla każdego komponentu
6. Na końcu: "✅ MVP Complete - aplikacja gotowa do testowania"

---

**Dokument stworzony:** 2025-10-11  
**Przeznaczenie:** Prompt template dla AI do implementacji frontendu  
**Kompatybilność:** Claude, GPT-4, Cursor, Copilot, etc.

**Powodzenia z implementacją! 🚀**

