# Universal Input Processor

> AI-powered universal input processing API with dynamic tool orchestration

[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)
[![Fastify](https://img.shields.io/badge/Fastify-4.26-black.svg)](https://www.fastify.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Status:** ✅ MVP Complete (v1.0.0)

---

## 📖 Opis

Universal Input Processor to inteligentny system przetwarzania danych tekstowych i plików, wykorzystujący modele LLM (Claude, GPT) do automatycznej detekcji intencji użytkownika i dynamicznego wyboru narzędzi przetwarzania.

### Główne Cechy

- 🤖 **AI-powered Intent Detection** - Automatyczna analiza zapytań użytkownika
- 🔧 **Plugin-based Tool System** - Łatwe dodawanie nowych narzędzi
- 🔄 **Pipeline Orchestration** - Sekwencyjne wykonywanie wielu narzędzi
- 🎯 **Multi-provider LLM** - Wsparcie dla Anthropic Claude i OpenAI GPT
- ⚡ **Fast & Lightweight** - Fastify + TypeScript
- 🔒 **Type-safe** - Pełne typowanie TypeScript (zero `any`)
- 📝 **Zero Storage** - Stateless architecture, przetwarzanie in-memory

---

## 🚀 Quick Start

### 1. Wymagania

- Node.js >= 18.0.0
- npm >= 9.0.0
- Klucz API: Anthropic lub OpenAI

### 2. Instalacja

```bash
# Klonuj repozytorium
git clone <repository-url>
cd universal-input-processor

# Zainstaluj zależności
npm install
```

### 3. Konfiguracja

```bash
# Skopiuj przykładową konfigurację
cp .env.example .env

# Edytuj .env i dodaj swój klucz API
nano .env
```

**Zawartość .env:**
```bash
PORT=3000
HOST=0.0.0.0

# Dodaj swój klucz (wystarczy jeden)
ANTHROPIC_API_KEY=sk-ant-api03-TWOJ_KLUCZ
OPENAI_API_KEY=sk-proj-TWOJ_KLUCZ

LOG_LEVEL=info
REQUEST_TIMEOUT_MS=60000
MAX_FILE_SIZE_MB=10
CORS_ORIGIN=*
```

### 4. Uruchomienie

```bash
# Development mode z hot reload
npm run dev

# Production build
npm run build
npm start
```

Serwer będzie dostępny pod adresem: **http://localhost:3000**

---

## 🧪 Testowanie API

### Health Check

```bash
curl http://localhost:3000/health
```

**Odpowiedź:**
```json
{
  "status": "healthy",
  "timestamp": "2025-10-05T20:50:44.991Z",
  "version": "1.0.0",
  "uptime": 120.20
}
```

### Lista dostępnych narzędzi

```bash
curl http://localhost:3000/v1/tools
```

**Odpowiedź:**
```json
{
  "tools": [
    {
      "name": "simple-ask",
      "description": "Answer simple questions using LLM without additional context",
      "capabilities": ["question-answering", "general-knowledge", "text-generation"]
    }
  ]
}
```

### Przetwarzanie zapytania (Simple Ask)

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=What is the capital of Poland?" \
  -F "llm_config=CLAUDE_FAST"
```

**Odpowiedź:**
```json
{
  "success": true,
  "message": "The capital of Poland is Warsaw (Warszawa in Polish)...",
  "result": "The capital of Poland is Warsaw (Warszawa in Polish)...",
  "metadata": {
    "executionTimeMs": 2341,
    "toolsUsed": ["simple-ask"],
    "llmModel": "CLAUDE_FAST",
    "planGenerated": true,
    "stepsCompleted": 1
  }
}
```

### Przykłady zapytań

**Pytanie matematyczne:**
```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Oblicz 234 * 567" \
  -F "llm_config=CLAUDE_FAST"
```

**Tłumaczenie:**
```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Przetłumacz na angielski: Dzień dobry, jak się masz?" \
  -F "llm_config=CLAUDE_FAST"
```

**Generowanie treści:**
```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Napisz krótki wiersz o kocie" \
  -F "llm_config=CLAUDE_FAST"
```

**Test z GPT:**
```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Co to jest TypeScript?" \
  -F "llm_config=GPT_FAST"
```

---

## 📚 Dostępne Modele LLM

Możesz wybrać model poprzez parametr `llm_config`:

| Alias | Provider | Model | Opis |
|-------|----------|-------|------|
| `CLAUDE_FAST` | Anthropic | claude-sonnet-4 | Szybki i ekonomiczny (domyślny) |
| `CLAUDE_SMART` | Anthropic | claude-opus-4 | Najinteligentniejszy, wolniejszy |
| `GPT_FAST` | OpenAI | gpt-4o-mini | Szybki GPT |
| `GPT_SMART` | OpenAI | gpt-4o | Pełny GPT-4 |

Konfiguracja modeli w pliku: `config/llm-models.json`

---

## 🏗️ Architektura

```
┌─────────────────────────────────────┐
│  POST /v1/process                    │
│  { instruction, file?, llm_config }  │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Gateway Layer                       │
│  - Request validation                │
│  - Multipart handling                │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Intent Detection                    │
│  - LLM-based planning                │
│  - Tool selection                    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│  Pipeline Orchestrator               │
│  - Sequential execution              │
│  - Fail-fast error handling          │
└─────────────┬───────────────────────┘
              │
      ┌───────┼───────┐
      │       │       │
┌─────▼─┐ ┌──▼───┐ ┌─▼──────┐
│ Tool 1│ │Tool 2│ │ Tool N │
└───────┘ └──────┘ └────────┘
```

### Główne Komponenty

- **Gateway** - HTTP endpoints, validation, response formatting
- **Intent Detector** - Analiza zapytania i generowanie planu wykonania
- **Pipeline Executor** - Sekwencyjne wykonywanie narzędzi
- **Tool Registry** - Auto-discovery i zarządzanie narzędziami
- **LLM Factory** - Abstrakcja dla różnych providerów LLM

---

## 🔧 Dodawanie Nowego Narzędzia

Narzędzia są automatycznie wykrywane z folderu `src/tools/`.

### Struktura narzędzia:

```
src/tools/my-tool/
├── index.ts              # Export point
├── tool.config.json      # Metadata
└── handler.ts            # Logika wykonania
```

### Przykład: tool.config.json

```json
{
  "name": "my-tool",
  "version": "1.0.0",
  "description": "Description of what tool does",
  "capabilities": ["capability1", "capability2"],
  "inputTypes": ["text/plain", "application/pdf"],
  "outputType": "structured-data",
  "estimatedDurationMs": 2000,
  "priority": 10
}
```

### Przykład: handler.ts

```typescript
import type { IToolContext, IToolResult } from '../tool.interface';

export async function execute(context: IToolContext): Promise<IToolResult> {
  try {
    const startTime = Date.now();
    
    // Twoja logika tutaj
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
  // Implementacja...
  return { result: 'example' };
}
```

### Przykład: index.ts

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

Po dodaniu narzędzia, uruchom ponownie serwer - zostanie automatycznie wykryte!

---

## 🧪 Testowanie

```bash
# Wszystkie testy
npm test

# Tylko testy jednostkowe
npm run test:unit

# Tylko testy integracyjne
npm run test:integration

# Watch mode
npm run test -- --watch
```

---

## 📁 Struktura Projektu

```
universal-input-processor/
├── src/
│   ├── core/
│   │   ├── gateway/          # HTTP endpoints i business logic
│   │   ├── intent/           # Intent detection & planning
│   │   ├── orchestrator/     # Pipeline execution
│   │   └── llm/              # LLM abstraction layer
│   ├── tools/
│   │   ├── tool.interface.ts # Interfejs narzędzi
│   │   ├── registry.service.ts # Auto-discovery
│   │   └── simple-ask/       # Przykładowe narzędzie
│   ├── common/
│   │   ├── types/            # TypeScript types
│   │   └── utils/            # Utility functions
│   ├── app.ts                # Fastify application
│   └── server.ts             # Entry point
├── config/
│   ├── llm-models.json       # Konfiguracja modeli LLM
│   └── app.config.json       # Konfiguracja aplikacji
├── tests/
│   ├── unit/                 # Testy jednostkowe
│   └── integration/          # Testy integracyjne
├── docs/
│   ├── ARCHITECTURE.md       # Dokumentacja architektury
│   ├── AI-CONTEXT.md         # Guidelines dla AI
│   └── MVP.md                # Plan implementacji MVP
├── .env.example              # Przykład konfiguracji
├── tsconfig.json             # TypeScript config
└── package.json              # Dependencies
```

---

## 🛠️ Scripts

| Command | Opis |
|---------|------|
| `npm run dev` | Uruchom serwer dev z hot reload |
| `npm run build` | Kompilacja TypeScript do /dist |
| `npm start` | Uruchom skompilowaną wersję |
| `npm test` | Uruchom wszystkie testy |
| `npm run test:unit` | Tylko testy jednostkowe |
| `npm run test:integration` | Tylko testy integracyjne |
| `npm run lint` | Sprawdź kod (ESLint) |
| `npm run format` | Formatuj kod (Prettier) |

---

## 🔐 Bezpieczeństwo

- ✅ Input validation (Zod)
- ✅ File size limits (10MB default)
- ✅ Request timeout (60s)
- ✅ CORS configuration
- ✅ Environment variables for secrets
- ⚠️ **Nigdy nie commituj pliku `.env`**
- ⚠️ W produkcji użyj rate limiting

---

## 📊 Wymagania Systemowe

- **Node.js:** >= 18.0.0
- **RAM:** Minimum 512MB (dla podstawowych operacji)
- **Dysk:** ~200MB (node_modules + app)
- **API Key:** Anthropic lub OpenAI

---

## 📝 Licencja

MIT License - zobacz plik LICENSE

---

## 🤝 Contributing

1. Fork projektu
2. Utwórz branch (`git checkout -b feature/AmazingFeature`)
3. Commit zmian (`git commit -m 'Add AmazingFeature'`)
4. Push do brancha (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

---

## 📚 Dokumentacja

- [ARCHITECTURE.md](docs/ARCHITECTURE.md) - Pełna dokumentacja architektury
- [AI-CONTEXT.md](docs/AI-CONTEXT.md) - Guidelines dla AI assistants
- [MVP.md](docs/MVP.md) - Plan implementacji MVP i status

---

## 🐛 Known Issues

- [ ] Obsługa plików > 10MB wymaga streamingu
- [ ] Brak retry logic dla LLM API
- [ ] Brak request caching

---

## 🚧 Roadmap

### v1.1 (Q4 2025)
- [ ] PDF extraction tool
- [ ] Image analysis tool
- [ ] Web search tool
- [ ] Unit tests coverage >80%

### v1.2 (Q1 2026)
- [ ] Request caching (Redis)
- [ ] Rate limiting per API key
- [ ] Metrics & monitoring (Prometheus)
- [ ] Docker support

### v2.0 (Q2 2026)
- [ ] Async processing (Bull + Redis)
- [ ] Webhook notifications
- [ ] Multi-file support
- [ ] Tool marketplace

---

## 💬 Support

Masz pytania? Otwórz issue na GitHubie!

---

## 👥 Autorzy

- Twoje Imię - Initial work

---

**Made with ❤️ and TypeScript**

**Status:** ✅ Production Ready MVP
