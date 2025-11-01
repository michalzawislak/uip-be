import type { IToolContext, IToolResult } from '../tool.interface';

interface AbnormalValue {
  parameter: string;
  your_value: string;
  normal_range: string;
  explanation: string;
  severity: 'low' | 'medium' | 'high';
}

interface NormalValue {
  parameter: string;
  your_value: string;
}

interface MedicalExplanation {
  summary: string;
  abnormal_values: AbnormalValue[];
  normal_values: NormalValue[];
  overall_assessment: string;
  recommendations: string[];
  questions_for_doctor: string[];
  disclaimer: string;
}

/**
 * Translate medical documents and lab results into plain language
 */
export async function execute(context: IToolContext): Promise<IToolResult> {
  try {
    const startTime = Date.now();

    console.log(`   🔧 [TOOL:medical-explainer] Rozpoczynam tłumaczenie dokumentu medycznego...`);

    const medicalData = extractMedicalData(context);

    if (!medicalData) {
      console.log(`   ✗ [TOOL:medical-explainer] Brak danych medycznych do przetworzenia`);
      return {
        success: false,
        output: null,
        error: 'No medical data provided for explanation'
      };
    }

    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(medicalData, context.instruction);

    console.log(`   🏥 [TOOL:medical-explainer] Wysyłam dane do LLM (medyczny translator)...`);

    const response = await context.llmClient.generateCompletion(
      [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: userPrompt
        }
      ]
    );

    const explanation = parseExplanation(response.content);

    ensureDisclaimer(explanation);

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:medical-explainer] Wyjaśnienie wygenerowane (${duration}ms, ${response.usage?.totalTokens || 0} tokenów)`);

    return {
      success: true,
      output: explanation,
      metadata: {
        processingTimeMs: duration,
        tokensUsed: response.usage?.totalTokens,
        model: response.model,
        dataType: 'medical_explanation'
      }
    };
  } catch (error) {
    console.log(`   ✗ [TOOL:medical-explainer] Błąd: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error occurred during medical explanation'
    };
  }
}

/**
 * Extract medical data from context
 */
function extractMedicalData(context: IToolContext): string {
  if (context.previousResult) {
    if (typeof context.previousResult === 'string') {
      return context.previousResult;
    }
    return JSON.stringify(context.previousResult, null, 2);
  }

  return context.instruction || '';
}

/**
 * Build system prompt for medical translator
 */
function buildSystemPrompt(): string {
  return `Jesteś tłumaczem dokumentów medycznych i edukatorem pacjentów. Twoim zadaniem jest tłumaczenie medycznego żargonu na prosty, zrozumiały język polski.

ZASADY:
1. Tłumacz terminologię medyczną na prosty język polski
2. Wyjaśniaj co każdy parametr oznacza dla zdrowia pacjenta
3. Podkreślaj nieprawidłowe wartości i ich znaczenie
4. Dostarczaj kontekst (przyczyny, na co zwracać uwagę)
5. Bądź empatyczny ale rzeczowy
6. Formatuj output jako strukturyzowany JSON
7. Używaj poziomów ważności: "low", "medium", "high"

NIGDY:
- NIE diagnozuj chorób (mów "może wskazywać na..." a nie "masz...")
- NIE zalecaj konkretnych leków/terapii
- NIE twórz niepotrzebnej paniki
- NIE zastępuj profesjonalnej porady medycznej

ZAWSZE:
- Dołącz ostrzeżenie o konieczności konsultacji z lekarzem
- Zasugeruj pytania które pacjent powinien zadać lekarzowi
- Wyjaśniaj w prostych słowach (jakbyś rozmawiał z osobą niebędącą lekarzem)
- Używaj języka polskiego`;
}

/**
 * Build user prompt with medical data
 */
function buildUserPrompt(data: string, instruction: string): string {
  return `Przeanalizuj te wyniki medyczne i wyjaśnij w prostym języku polskim:

<dane_medyczne>
${data}
</dane_medyczne>

<pytanie_pacjenta>
${instruction || 'Wytłumacz mi te wyniki'}
</pytanie_pacjenta>

Zwróć JSON w następującej strukturze:
{
  "summary": "Ogólne podsumowanie w 2-3 zdaniach",
  "abnormal_values": [
    {
      "parameter": "Nazwa parametru",
      "your_value": "Twoja wartość z jednostką",
      "normal_range": "Zakres normy",
      "explanation": "Co to oznacza prostym językiem",
      "severity": "low|medium|high"
    }
  ],
  "normal_values": [
    {
      "parameter": "Nazwa parametru",
      "your_value": "Twoja wartość z jednostką"
    }
  ],
  "overall_assessment": "Ogólna ocena stanu zdrowia",
  "recommendations": ["Praktyczna rekomendacja 1", "..."],
  "questions_for_doctor": ["Pytanie do lekarza 1", "..."],
  "disclaimer": "⚠️ Ostrzeżenie"
}

Zwróć TYLKO poprawny JSON, bez dodatkowego tekstu.`;
}

/**
 * Parse explanation from LLM response
 */
function parseExplanation(response: string): MedicalExplanation {
  let jsonStr = response.trim();

  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
  } else if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/```\n?/g, '');
  }

  jsonStr = jsonStr.trim();

  const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    jsonStr = jsonMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);
    return parsed as MedicalExplanation;
  } catch (error) {
    throw new Error(`Failed to parse medical explanation: ${error instanceof Error ? error.message : 'Invalid JSON'}`);
  }
}

/**
 * Ensure disclaimer is present
 */
function ensureDisclaimer(explanation: MedicalExplanation): void {
  if (!explanation.disclaimer || explanation.disclaimer.length < 10) {
    explanation.disclaimer = '⚠️ To wyjaśnienie ma charakter edukacyjny i nie zastępuje konsultacji medycznej. Zawsze skonsultuj wyniki badań z lekarzem.';
  }
}

