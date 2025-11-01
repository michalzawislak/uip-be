import type { IToolContext, IToolResult } from '../tool.interface';

interface MealPlan {
  userProfile: {
    age?: number;
    gender?: string;
    activityLevel?: string;
    goal?: string;
    restrictions?: string[];
    preferences?: string[];
  };
  targetCalories: number;
  plan: Array<{
    day: string;
    meals: Array<{
      type: 'śniadanie' | 'obiad' | 'kolacja' | 'przekąska';
      name: string;
      description: string;
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    }>;
    totalCalories: number;
  }>;
  nutritionSummary: {
    avgCalories: number;
    avgProtein: number;
    avgCarbs: number;
    avgFat: number;
  };
  disclaimer: string;
}

export async function execute(context: IToolContext): Promise<IToolResult> {
  const startTime = Date.now();

  try {
    console.log('   🔧 [TOOL:meal-plan-generator] Rozpoczynam generowanie planu żywieniowego...');

    let instructionText = '';
    let userProfile: MealPlan['userProfile'] = {};

    if (context.previousResult && typeof context.previousResult === 'object') {
      const prev = context.previousResult as Record<string, unknown>;
      if (prev.userProfile && typeof prev.userProfile === 'object') {
        userProfile = prev.userProfile as MealPlan['userProfile'];
      }
      if (prev.text && typeof prev.text === 'string') {
        instructionText = prev.text;
      }
    }

    if (!instructionText) {
      instructionText = context.instruction;
    }

    if (!instructionText || instructionText.trim().length === 0) {
      return {
        success: false,
        output: null,
        error: 'No meal plan requirements provided. Please specify: age, gender, activity level, goals, dietary restrictions.',
      };
    }

    console.log(`   🍽️ [TOOL:meal-plan-generator] Tworzę plan na podstawie: "${instructionText.substring(0, 80)}..."`);

    const mealPlan = await generateMealPlan(instructionText, userProfile, context);

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:meal-plan-generator] Plan wygenerowany (${duration}ms, dni: ${mealPlan.plan.length})`);

    return {
      success: true,
      output: {
        mealPlan,
        summary: generateMealPlanSummary(mealPlan),
      },
      metadata: {
        processingTimeMs: duration,
        planType: mealPlan.plan.length > 1 ? 'weekly' : 'daily',
        daysCount: mealPlan.plan.length,
        targetCalories: mealPlan.targetCalories,
        avgCalories: mealPlan.nutritionSummary.avgCalories,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ✗ [TOOL:meal-plan-generator] Błąd: ${error instanceof Error ? error.message : 'Unknown'}`);

    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error during meal plan generation',
      metadata: {
        processingTimeMs: duration,
      },
    };
  }
}

async function generateMealPlan(
  requirements: string,
  userProfile: MealPlan['userProfile'],
  context: IToolContext
): Promise<MealPlan> {
  console.log('   🤖 [TOOL:meal-plan-generator] Używam LLM do stworzenia planu żywieniowego...');

  const systemPrompt = `Jesteś polskim dietetykiem z wieloletnim doświadczeniem. Specjalizujesz się w tworzeniu praktycznych, smacznych planów żywieniowych z wykorzystaniem polskich produktów i potraw.

TWOJA WIEDZA:
- Normy żywieniowe: BMR, TDEE, makroskładniki
- Polska kuchnia: tradycyjne potrawy, dostępne produkty
- Planowanie posiłków: 4-5 posiłków dziennie
- Dostosowanie do celów: odchudzanie, budowanie masy, utrzymanie wagi

ZASADY TWORZENIA PLANU:
1. Kalkulacja TDEE na podstawie: wiek, płeć, aktywność
2. Dostosowanie kalorii do celu (deficyt/nadwyżka/utrzymanie)
3. Rozkład makroskładników:
   - Białko: 1.6-2.2g/kg masy ciała
   - Tłuszcze: 25-35% kalorii
   - Węglowodany: reszta kalorii
4. 4-5 posiłków dziennie (śniadanie, obiad, kolacja, przekąski)
5. Różnorodność: różne potrawy każdego dnia
6. Realizm: proste przepisy, dostępne składniki
7. Polskie potrawy: rosół, pierogi, kotlety, naleśniki, itp.

UWAGA: Zawsze dodawaj disclaimer o konsultacji z dietetykiem/lekarzem!`;

  const userPrompt = `Stwórz plan żywieniowy na podstawie tych wymagań:

${requirements}

${userProfile.age ? `Wiek: ${userProfile.age}` : ''}
${userProfile.gender ? `Płeć: ${userProfile.gender}` : ''}
${userProfile.activityLevel ? `Aktywność: ${userProfile.activityLevel}` : ''}
${userProfile.goal ? `Cel: ${userProfile.goal}` : ''}
${userProfile.restrictions ? `Restrykcje: ${userProfile.restrictions.join(', ')}` : ''}
${userProfile.preferences ? `Preferencje: ${userProfile.preferences.join(', ')}` : ''}

WAŻNE: Odpowiedz TYLKO czystym JSON bez żadnego dodatkowego tekstu, markdown ani \`\`\`json.

Format odpowiedzi:
{
  "userProfile": {
    "age": wiek_lub_null,
    "gender": "płeć_lub_null",
    "activityLevel": "poziom_aktywności",
    "goal": "cel",
    "restrictions": ["restrykcja1"],
    "preferences": ["preferencja1"]
  },
  "targetCalories": docelowa_liczba_kalorii,
  "plan": [
    {
      "day": "Dzień 1" lub "Poniedziałek",
      "meals": [
        {
          "type": "śniadanie",
          "name": "Nazwa posiłku",
          "description": "Szczegóły: składniki, ilości",
          "calories": liczba,
          "protein": gramy,
          "carbs": gramy,
          "fat": gramy
        }
      ],
      "totalCalories": suma_kalorii_dnia
    }
  ],
  "nutritionSummary": {
    "avgCalories": średnia_kalorii,
    "avgProtein": średnie_białko_g,
    "avgCarbs": średnie_węgle_g,
    "avgFat": średnie_tłuszcze_g
  },
  "disclaimer": "WAŻNY tekst o konsultacji z dietetykiem/lekarzem"
}

Jeśli w requirements nie ma informacji o liczbie dni, stwórz plan na 7 dni (tydzień).`;

  const response = await context.llmClient.generateCompletion([
    {
      role: 'system',
      content: systemPrompt,
    },
    {
      role: 'user',
      content: userPrompt,
    },
  ]);

  let parsedData: unknown;
  try {
    parsedData = JSON.parse(response.content);
  } catch {
    const jsonMatch = response.content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      parsedData = JSON.parse(jsonMatch[0]);
    } else {
      throw new Error('LLM did not return valid JSON for meal plan');
    }
  }

  const mealPlan = parsedData as MealPlan;

  if (!mealPlan.disclaimer || mealPlan.disclaimer.length < 20) {
    mealPlan.disclaimer =
      '⚠️ WAŻNE: Ten plan żywieniowy jest generowany automatycznie i ma charakter ogólny. Przed rozpoczęciem jakiejkolwiek diety skonsultuj się z dietetykiem lub lekarzem, szczególnie jeśli masz choroby przewlekłe, przyjmujesz leki lub jesteś w ciąży.';
  }

  return mealPlan;
}

function generateMealPlanSummary(plan: MealPlan): string {
  let summary = `🍽️ PLAN ŻYWIENIOWY\n\n`;

  if (plan.userProfile.age || plan.userProfile.gender || plan.userProfile.goal) {
    summary += `👤 Profil:\n`;
    if (plan.userProfile.age) summary += `- Wiek: ${plan.userProfile.age}\n`;
    if (plan.userProfile.gender) summary += `- Płeć: ${plan.userProfile.gender}\n`;
    if (plan.userProfile.activityLevel) summary += `- Aktywność: ${plan.userProfile.activityLevel}\n`;
    if (plan.userProfile.goal) summary += `- Cel: ${plan.userProfile.goal}\n`;
    if (plan.userProfile.restrictions && plan.userProfile.restrictions.length > 0) {
      summary += `- Restrykcje: ${plan.userProfile.restrictions.join(', ')}\n`;
    }
    summary += `\n`;
  }

  summary += `🎯 Cel kaloryczny: ${plan.targetCalories} kcal/dzień\n`;
  summary += `📊 Średnio: ${plan.nutritionSummary.avgCalories} kcal | ${plan.nutritionSummary.avgProtein}g białka | ${plan.nutritionSummary.avgCarbs}g węgli | ${plan.nutritionSummary.avgFat}g tłuszczu\n\n`;

  summary += `═══════════════════════════════════════\n\n`;

  plan.plan.forEach((dayPlan) => {
    summary += `📅 ${dayPlan.day.toUpperCase()} (${dayPlan.totalCalories} kcal)\n\n`;

    dayPlan.meals.forEach((meal) => {
      const emoji = getMealEmoji(meal.type);
      summary += `${emoji} ${meal.type.toUpperCase()}: ${meal.name}\n`;
      summary += `   ${meal.description}\n`;
      summary += `   📊 ${meal.calories} kcal | B: ${meal.protein}g | W: ${meal.carbs}g | T: ${meal.fat}g\n\n`;
    });

    summary += `───────────────────────────────────────\n\n`;
  });

  summary += `${plan.disclaimer}\n`;

  return summary;
}

function getMealEmoji(mealType: string): string {
  switch (mealType.toLowerCase()) {
    case 'śniadanie':
      return '🌅';
    case 'obiad':
      return '🍽️';
    case 'kolacja':
      return '🌙';
    case 'przekąska':
      return '🍎';
    default:
      return '🍴';
  }
}

