#!/bin/bash

# Test script for image analysis with proper timeouts

echo "🧪 Testing image analysis with wyniki_badań.png"
echo "================================================"
echo ""

# Check if file exists
if [ ! -f "test_files/wyniki_badań.png" ]; then
    echo "❌ Error: test_files/wyniki_badań.png not found!"
    exit 1
fi

echo "📤 Sending request to http://localhost:3000/v1/process"
echo "⏱️  Max timeout: 180 seconds"
echo ""

# Run curl with extended timeout
curl -X POST http://localhost:3000/v1/process \
  --max-time 180 \
  --connect-timeout 10 \
  -F "instruction=Przeanalizuj dokładnie wyniki badań krwi z tego obrazu. Wymień wszystkie parametry i ich wartości." \
  -F "file=@test_files/wyniki_badań.png" \
  -F "llm_config=CLAUDE_FAST" \
  -H "Accept: application/json" \
  --write-out "\n\n⏱️  Total time: %{time_total}s\n" \
  --verbose

echo ""
echo "✅ Test completed!"

