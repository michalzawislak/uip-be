# 🧪 Przewodnik Testowania API

## Szybkie Testy

### 1. Health Check (działa bez API key)

```bash
curl http://localhost:3000/health
```

### 2. Lista Narzędzi (działa bez API key)

```bash
curl http://localhost:3000/v1/tools
```

---

## Testy z LLM (wymaga API key w .env)

### 3. Podstawowe Pytanie (PL)

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Jaka jest stolica Polski?" \
  -F "llm_config=CLAUDE_FAST"
```

**Oczekiwany output:**
```json
{
  "success": true,
  "message": "Stolicą Polski jest Warszawa.",
  "result": "Stolicą Polski jest Warszawa...",
  "metadata": {
    "executionTimeMs": 2341,
    "toolsUsed": ["simple-ask"],
    "llmModel": "CLAUDE_FAST",
    "planGenerated": true,
    "stepsCompleted": 1
  }
}
```

### 4. Pytanie po Angielsku

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=What is the capital of Poland?" \
  -F "llm_config=CLAUDE_FAST"
```

### 5. Matematyka

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Oblicz 234 * 567" \
  -F "llm_config=CLAUDE_FAST"
```

### 6. Tłumaczenie

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Przetłumacz na angielski: Dzień dobry, jak się masz?" \
  -F "llm_config=CLAUDE_FAST"
```

### 7. Generowanie Treści

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Napisz krótki wiersz o kocie" \
  -F "llm_config=CLAUDE_FAST"
```

### 8. Wyjaśnienie Konceptu

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Co to jest TypeScript?" \
  -F "llm_config=CLAUDE_FAST"
```

### 9. Analiza i Porównanie

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Wymień 3 różnice między Python a JavaScript" \
  -F "llm_config=CLAUDE_FAST"
```

### 10. Złożone Zapytanie

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Wyjaśnij jak działa async/await w JavaScript prostym językiem" \
  -F "llm_config=CLAUDE_FAST"
```

---

## Testowanie z GPT (jeśli masz klucz OpenAI)

### GPT-4o Mini (szybki)

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=What is the meaning of life?" \
  -F "llm_config=GPT_FAST"
```

### GPT-4o (pełny model)

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Write a haiku about programming" \
  -F "llm_config=GPT_SMART"
```

---

## Testowanie Błędów

### Brak instrukcji (powinno zwrócić błąd 400)

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "llm_config=CLAUDE_FAST"
```

**Oczekiwany output:**
```json
{
  "success": false,
  "error": "Instruction is required",
  "metadata": {
    "executionTimeMs": 0,
    "requestId": "req_..."
  }
}
```

### Nieprawidłowy model

```bash
curl -X POST http://localhost:3000/v1/process \
  -F "instruction=Hello" \
  -F "llm_config=INVALID_MODEL"
```

---

## Uruchomienie Pełnego Zestawu Testów

### Automatyczny skrypt

```bash
# Upewnij się że serwer działa
npm run dev

# W drugim terminalu:
./test-requests.sh
```

### Z formatowaniem JSON (jq)

```bash
curl -s http://localhost:3000/v1/tools | jq
curl -s -X POST http://localhost:3000/v1/process \
  -F "instruction=Test" \
  -F "llm_config=CLAUDE_FAST" | jq
```

---

## Testowanie z Postman/Insomnia

### Import cURL do Postman:
1. Otwórz Postman
2. Kliknij "Import" → "Raw text"
3. Wklej przykład cURL
4. Kliknij "Import"

### Przykład dla Postman:

**Method:** POST  
**URL:** `http://localhost:3000/v1/process`  
**Body:** form-data

| Key | Value |
|-----|-------|
| instruction | What is the capital of Poland? |
| llm_config | CLAUDE_FAST |

---

## Metryki Wydajności

Typowe czasy odpowiedzi:

- Health check: < 5ms
- Lista narzędzi: < 10ms
- Simple-ask (CLAUDE_FAST): 1500-3000ms
- Simple-ask (GPT_FAST): 800-2000ms

---

## Debugowanie

### Logi serwera

```bash
# Development mode z logami
npm run dev

# Zwiększ poziom logowania w .env
LOG_LEVEL=debug
```

### Sprawdzenie requestId

Każdy request ma unikalny ID w logach:
```
[INFO] Incoming request | requestId: req_1696512345_abc123
```

---

## Checklist Testowy

Przed oznaczeniem MVP jako gotowe:

- [ ] Health check zwraca 200
- [ ] Lista narzędzi pokazuje "simple-ask"
- [ ] Pytanie w języku polskim działa
- [ ] Pytanie po angielsku działa
- [ ] Matematyka działa
- [ ] Tłumaczenie działa
- [ ] Generowanie treści działa
- [ ] Błędna instrukcja zwraca 400
- [ ] Nieprawidłowy model zwraca błąd
- [ ] Response zawiera metadata (timing, tools used)

---

## Problemy i Rozwiązania

### "Connection refused"
→ Sprawdź czy serwer jest uruchomiony (`npm run dev`)

### "Missing API key"
→ Sprawdź plik `.env` i upewnij się że ANTHROPIC_API_KEY jest ustawiony

### "Tool not found"
→ Sprawdź logi startowe - tool "simple-ask" powinien być zarejestrowany

### Timeout
→ Zwiększ REQUEST_TIMEOUT_MS w .env (default 60000ms)

---

**Gotowy do testowania!** 🚀

