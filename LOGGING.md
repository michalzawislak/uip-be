# 📊 System Logowania - Universal Input Processor

## Przegląd

System logowania w Universal Input Processor został zaprojektowany aby dostarczać **szczegółowe informacje** o każdym etapie przetwarzania requestu.

---

## 🎯 Co Jest Logowane?

### 1. **Request Start** (`[REQUEST]`)
- ID requestu
- Instrukcja użytkownika
- Wybrany model LLM
- Załączony plik (jeśli jest)

### 2. **Planning Phase** (`[PLANNER]`)
- Instrukcja do zaplanowania
- Lista dostępnych narzędzi
- Wygenerowany plan wykonania
- Wybrane narzędzia z uzasadnieniem

### 3. **Pipeline Execution** (`[PIPELINE]`)
- Liczba kroków do wykonania
- Request ID
- Status każdego kroku
- Czasy wykonania
- Użyte tokeny LLM

### 4. **Tool Execution** (`[TOOL:nazwa]`)
- Wywołanie narzędzia
- Status wykonania
- Czas wykonania
- Liczba tokenów (dla LLM calls)

### 5. **Response** (`[RESPONSE]`)
- Status (sukces/błąd)
- Całkowity czas wykonania
- Lista użytych narzędzi
- Komunikaty błędów (jeśli są)

---

## 📝 Przykładowe Logi

### Pomyślny Request

```
================================================================================
🚀 [REQUEST] Nowe zapytanie - ID: req_1759697978986_8rvicj
📝 [REQUEST] Instrukcja: "Jaka jest stolica Francji?"
🤖 [REQUEST] Model LLM: CLAUDE_FAST
================================================================================

🎯 [PLANNER] Rozpoczynam planowanie...
📝 [PLANNER] Instrukcja: Jaka jest stolica Francji?
🔧 [PLANNER] Dostępne narzędzia: simple-ask
✅ [PLANNER] Plan wygenerowany:
   1. simple-ask - Answer the user's simple question

🔄 [PIPELINE] Rozpoczynam wykonywanie 1 kroków
📋 [PIPELINE] Request ID: req_1759697978986_8rvicj

⚙️  [PIPELINE] Krok 1/1: simple-ask
   💬 [TOOL:simple-ask] Wysyłam zapytanie do LLM...
   ✓ [TOOL:simple-ask] Otrzymano odpowiedź (1847ms, 156 tokenów)
✅ [PIPELINE] Krok 1 SUCCESS
⏱️  [PIPELINE] Czas wykonania: 1847ms
🪙 [PIPELINE] Tokeny użyte: 156

✨ [PIPELINE] Wszystkie kroki ukończone pomyślnie!
⏱️  [PIPELINE] Całkowity czas: 1850ms

================================================================================
✅ [RESPONSE] Sukces!
⏱️  [RESPONSE] Całkowity czas: 3421ms
🔧 [RESPONSE] Użyte narzędzia: simple-ask
================================================================================
```

---

### Request z Błędem

```
================================================================================
🚀 [REQUEST] Nowe zapytanie - ID: req_1759697999123_xyz789
📝 [REQUEST] Instrukcja: "Test błędnego requestu"
🤖 [REQUEST] Model LLM: INVALID_MODEL
================================================================================

🎯 [PLANNER] Rozpoczynam planowanie...
📝 [PLANNER] Instrukcja: Test błędnego requestu
🔧 [PLANNER] Dostępne narzędzia: simple-ask

================================================================================
❌ [RESPONSE] Błąd!
⏱️  [RESPONSE] Czas do błędu: 15ms
💥 [RESPONSE] Error: Unknown LLM provider: INVALID_MODEL
================================================================================
```

---

### Request z Niepowodzeniem Narzędzia

```
================================================================================
🚀 [REQUEST] Nowe zapytanie - ID: req_1759698001234_abc456
📝 [REQUEST] Instrukcja: "Testuj tool failure"
🤖 [REQUEST] Model LLM: CLAUDE_FAST
================================================================================

🎯 [PLANNER] Rozpoczynam planowanie...
📝 [PLANNER] Instrukcja: Testuj tool failure
🔧 [PLANNER] Dostępne narzędzia: simple-ask
✅ [PLANNER] Plan wygenerowany:
   1. simple-ask

🔄 [PIPELINE] Rozpoczynam wykonywanie 1 kroków
📋 [PIPELINE] Request ID: req_1759698001234_abc456

⚙️  [PIPELINE] Krok 1/1: simple-ask
   💬 [TOOL:simple-ask] Wysyłam zapytanie do LLM...
   ✗ [TOOL:simple-ask] Błąd: API rate limit exceeded
❌ [PIPELINE] Krok 1 FAILED: API rate limit exceeded
⏱️  [PIPELINE] Czas wykonania: 234ms

================================================================================
❌ [RESPONSE] Błąd!
⏱️  [RESPONSE] Czas do błędu: 1456ms
💥 [RESPONSE] Error: API rate limit exceeded
================================================================================
```

---

## 🔍 Interpretacja Logów

### Emojis i ich znaczenie:

| Emoji | Znaczenie | Kontekst |
|-------|-----------|----------|
| 🚀 | Nowy request | Start przetwarzania |
| 📝 | Instrukcja | Zapytanie użytkownika |
| 🤖 | Model LLM | Wybrany model AI |
| 📎 | Plik | Załączony plik |
| 🎯 | Planner | Generowanie planu |
| 🔧 | Narzędzia | Lista/użycie narzędzi |
| ✅ | Sukces | Operacja zakończona pomyślnie |
| 🔄 | Pipeline | Wykonywanie kroków |
| 📋 | Request ID | Identyfikator requestu |
| ⚙️ | Tool execution | Wykonywanie narzędzia |
| 💬 | LLM call | Wywołanie modelu AI |
| ✓ | Tool success | Narzędzie zakończone sukcesem |
| ✗ | Tool failure | Narzędzie zakończone błędem |
| ⏱️ | Timing | Czas wykonania |
| 🪙 | Tokeny | Użycie tokenów LLM |
| ✨ | Complete | Wszystkie kroki zakończone |
| ❌ | Error | Błąd |
| 💥 | Error details | Szczegóły błędu |

---

## 🎛️ Konfiguracja Logowania

### Poziomy logowania (w .env):

```bash
# Minimalne logi (tylko błędy)
LOG_LEVEL=error

# Standardowe logi (zalecane dla dev)
LOG_LEVEL=info

# Debug (wszystkie szczegóły)
LOG_LEVEL=debug
```

**Uwaga:** Logi console.log działają niezależnie od LOG_LEVEL i zawsze są widoczne.

---

## 🔎 Debugging z Logami

### Szukanie konkretnego requestu:

```bash
# W czasie rzeczywistym
npm run dev | grep "req_1759697978986"

# W zapisanych logach
cat logs.txt | grep "req_1759697978986"
```

### Śledzenie długich requestów:

```bash
# Pokaż tylko timing
npm run dev | grep "⏱️"

# Pokaż tylko błędy
npm run dev | grep "❌"
```

### Monitorowanie użycia tokenów:

```bash
# Pokaż zużycie tokenów
npm run dev | grep "🪙"
```

---

## 📊 Metryki z Logów

### Typowe czasy wykonania (ms):

| Operacja | Czas | Opis |
|----------|------|------|
| Planning | 500-1500ms | Generowanie planu przez LLM |
| Simple-ask | 1500-3000ms | Podstawowe pytanie |
| Całkowity request | 2000-5000ms | Od przyjęcia do odpowiedzi |

### Użycie tokenów (typowe):

| Typ zapytania | Tokeny | Koszt |
|---------------|--------|-------|
| Proste pytanie | 100-300 | ~$0.001 |
| Złożone pytanie | 300-1000 | ~$0.003-0.010 |
| Planning | 50-150 | ~$0.0005 |

---

## 🛠️ Najlepsze Praktyki

### 1. **Zawsze śledź Request ID**
Request ID pozwala śledzić cały flow requestu przez wszystkie komponenty.

### 2. **Monitoruj czasy wykonania**
Jeśli czasy znacząco odbiegają od normy, może to wskazywać na problem.

### 3. **Sprawdzaj użycie tokenów**
Wysokie zużycie tokenów = wyższe koszty. Optymalizuj prompty.

### 4. **Analizuj plany**
Sprawdź czy planner wybiera właściwe narzędzia dla danego zapytania.

### 5. **Loguj do pliku w production**

```bash
# Przekieruj logi do pliku
npm start > logs/app.log 2>&1

# Rotacja logów
npm start >> logs/app-$(date +%Y%m%d).log 2>&1
```

---

## 📈 Analiza Wydajności

### Skrypt do analizy logów:

```bash
#!/bin/bash
# analyze-logs.sh

echo "📊 Analiza logów Universal Input Processor"
echo ""

# Liczba requestów
echo "Liczba requestów: $(grep '\[REQUEST\]' logs.txt | wc -l)"

# Średni czas wykonania
echo "Średni czas wykonania: $(grep 'RESPONSE.*Całkowity czas' logs.txt | \
  awk -F': ' '{print $2}' | awk '{print $1}' | \
  awk '{sum+=$1; count++} END {print sum/count "ms"}')"

# Sukces vs Błędy
echo "Sukces: $(grep '\[RESPONSE\] Sukces' logs.txt | wc -l)"
echo "Błędy: $(grep '\[RESPONSE\] Błąd' logs.txt | wc -l)"

# Najczęściej używane narzędzia
echo ""
echo "Najczęściej używane narzędzia:"
grep '\[PIPELINE\] Krok.*:' logs.txt | \
  awk -F': ' '{print $2}' | sort | uniq -c | sort -rn
```

---

## 🚨 Troubleshooting

### Problem: Brak logów

**Rozwiązanie:**
- Sprawdź czy serwer działa: `curl http://localhost:3000/health`
- Sprawdź czy logi nie są przekierowane: usuń `> /dev/null 2>&1`

### Problem: Za dużo logów

**Rozwiązanie:**
- Używaj filtrowania: `npm run dev | grep ERROR`
- Rozważ logowanie do pliku: `npm run dev > app.log 2>&1`

### Problem: Logi nie zawierają Request ID

**Rozwiązanie:**
- Request ID jest generowane przez Fastify
- Sprawdź czy middleware jest zarejestrowany w `src/app.ts`

---

## 📚 Zaawansowane

### Custom Logger w Narzędziach

Jeśli tworzysz własne narzędzie, użyj tego wzorca:

```typescript
export async function execute(context: IToolContext): Promise<IToolResult> {
  console.log(`   🔧 [TOOL:my-tool] Start...`);
  
  try {
    // Twoja logika
    const result = await doWork();
    
    console.log(`   ✓ [TOOL:my-tool] Sukces!`);
    return { success: true, output: result };
    
  } catch (error) {
    console.log(`   ✗ [TOOL:my-tool] Błąd: ${error.message}`);
    return { success: false, output: null, error: error.message };
  }
}
```

---

**Logi są kluczem do zrozumienia jak działa twój system!** 🔑



