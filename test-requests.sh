#!/bin/bash

# Universal Input Processor - Test Requests
# Uruchom serwer przed testami: npm run dev

echo "🧪 Universal Input Processor - Test Suite"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"

# Kolory dla output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📊 Test 1: Health Check${NC}"
echo "Endpoint: GET /health"
echo "---"
curl -s "$BASE_URL/health" | jq
echo ""
echo ""

echo -e "${BLUE}🔧 Test 2: Lista Narzędzi${NC}"
echo "Endpoint: GET /v1/tools"
echo "---"
curl -s "$BASE_URL/v1/tools" | jq
echo ""
echo ""

echo -e "${BLUE}💬 Test 3: Proste Pytanie (PL)${NC}"
echo "Endpoint: POST /v1/process"
echo "Instruction: Jaka jest stolica Polski?"
echo "---"
curl -s -X POST "$BASE_URL/v1/process" \
  -F "instruction=Jaka jest stolica Polski?" \
  -F "llm_config=CLAUDE_FAST" | jq
echo ""
echo ""

echo -e "${BLUE}🔢 Test 4: Matematyka${NC}"
echo "Instruction: Oblicz 234 * 567 i wyjaśnij krok po kroku"
echo "---"
curl -s -X POST "$BASE_URL/v1/process" \
  -F "instruction=Oblicz 234 * 567 i wyjaśnij krok po kroku" \
  -F "llm_config=CLAUDE_FAST" | jq
echo ""
echo ""

echo -e "${BLUE}🌍 Test 5: Tłumaczenie${NC}"
echo "Instruction: Przetłumacz na angielski: Dzień dobry, jak się masz?"
echo "---"
curl -s -X POST "$BASE_URL/v1/process" \
  -F "instruction=Przetłumacz na angielski: Dzień dobry, jak się masz?" \
  -F "llm_config=CLAUDE_FAST" | jq
echo ""
echo ""

echo -e "${BLUE}📝 Test 6: Generowanie Treści${NC}"
echo "Instruction: Napisz krótki wiersz o kocie (4 linijki)"
echo "---"
curl -s -X POST "$BASE_URL/v1/process" \
  -F "instruction=Napisz krótki wiersz o kocie (4 linijki)" \
  -F "llm_config=CLAUDE_FAST" | jq
echo ""
echo ""

echo -e "${BLUE}💡 Test 7: Wyjaśnienie Konceptu${NC}"
echo "Instruction: Co to jest TypeScript i czym się różni od JavaScript?"
echo "---"
curl -s -X POST "$BASE_URL/v1/process" \
  -F "instruction=Co to jest TypeScript i czym się różni od JavaScript?" \
  -F "llm_config=CLAUDE_FAST" | jq
echo ""
echo ""

echo -e "${BLUE}🎯 Test 8: Analiza Tekstu${NC}"
echo "Instruction: Znajdź 3 główne zalety używania Fastify zamiast Express"
echo "---"
curl -s -X POST "$BASE_URL/v1/process" \
  -F "instruction=Znajdź 3 główne zalety używania Fastify zamiast Express" \
  -F "llm_config=CLAUDE_FAST" | jq
echo ""
echo ""

echo -e "${GREEN}✅ Wszystkie testy zakończone!${NC}"
echo ""




