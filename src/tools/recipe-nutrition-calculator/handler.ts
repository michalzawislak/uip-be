import type { IToolContext, IToolResult } from '../tool.interface';

interface RecipeNutrition {
  recipeName: string;
  servings: number;
  ingredients: Array<{
    name: string;
    amount: string;
    estimatedGrams: number;
  }>;
  nutritionPerServing: {
    calories: number;
    protein: number;
    carbohydrates: number;
    sugars: number;
    fat: number;
    saturatedFat: number;
    fiber: number;
    salt: number;
  };
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbohydrates: number;
    sugars: number;
    fat: number;
    saturatedFat: number;
    fiber: number;
    salt: number;
  };
  totalWeight: number;
}

export async function execute(context: IToolContext): Promise<IToolResult> {
  const startTime = Date.now();

  try {
    console.log('   🔧 [TOOL:recipe-nutrition-calculator] Rozpoczynam obliczanie wartości odżywczych przepisu...');

    let recipeText = '';

    if (context.previousResult && typeof context.previousResult === 'object') {
      const prev = context.previousResult as Record<string, unknown>;
      if (prev.text && typeof prev.text === 'string') {
        recipeText = prev.text;
      } else if (prev.recipe && typeof prev.recipe === 'string') {
        recipeText = prev.recipe;
      }
    }

    if (!recipeText) {
      recipeText = context.instruction;
    }

    if (!recipeText || recipeText.trim().length === 0) {
      return {
        success: false,
        output: null,
        error: 'No recipe provided. Please provide recipe text with ingredients and amounts.',
      };
    }

    console.log(`   🍳 [TOOL:recipe-nutrition-calculator] Analizuję przepis (${recipeText.length} znaków)...`);

    const recipeNutrition = await calculateRecipeNutrition(recipeText, context);

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:recipe-nutrition-calculator] Obliczenia zakończone (${duration}ms)`);

    return {
      success: true,
      output: {
        recipeNutrition,
        summary: generateRecipeSummary(recipeNutrition),
      },
      metadata: {
        processingTimeMs: duration,
        ingredientsCount: recipeNutrition.ingredients.length,
        servings: recipeNutrition.servings,
        totalWeight: recipeNutrition.totalWeight,
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ✗ [TOOL:recipe-nutrition-calculator] Błąd: ${error instanceof Error ? error.message : 'Unknown'}`);

    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error during recipe calculation',
      metadata: {
        processingTimeMs: duration,
      },
    };
  }
}

async function calculateRecipeNutrition(recipeText: string, context: IToolContext): Promise<RecipeNutrition> {
  console.log('   🤖 [TOOL:recipe-nutrition-calculator] Używam LLM do analizy składników...');

  const systemPrompt = `Jesteś ekspertem kulinarnym i dietetykiem. Znasz polskie składniki, jednostki miary i typowe wartości odżywcze produktów.

POLSKIE JEDNOSTKI MIARY (orientacyjne przeliczniki):
- 1 szklanka (250ml) mąki = ~150g
- 1 szklanka cukru = ~200g
- 1 szklanka mleka = ~250g
- 1 szklanka oleju = ~200g
- 1 łyżka (15ml) = ~15g (płyny), ~10g (mąka, cukier)
- 1 łyżeczka (5ml) = ~5g (płyny), ~3g (mąka, cukier)
- 1 jajko duże = ~50g

Twoim zadaniem jest:
1. Zidentyfikować składniki z przepisu
2. Przeliczyć polskie jednostki na gramy
3. Oszacować wartości odżywcze każdego składnika
4. Zsumować wszystko i podać wartości na porcję i na 100g`;

  const userPrompt = `Przeanalizuj ten przepis i oblicz wartości odżywcze:

${recipeText}

WAŻNE: Odpowiedz TYLKO czystym JSON bez żadnego dodatkowego tekstu, markdown ani \`\`\`json.

Format odpowiedzi:
{
  "recipeName": "nazwa przepisu",
  "servings": liczba_porcji,
  "ingredients": [
    {
      "name": "nazwa składnika",
      "amount": "oryginalna ilość z przepisu",
      "estimatedGrams": liczba_gramów
    }
  ],
  "nutritionPerServing": {
    "calories": kcal,
    "protein": g,
    "carbohydrates": g,
    "sugars": g,
    "fat": g,
    "saturatedFat": g,
    "fiber": g,
    "salt": g
  },
  "nutritionPer100g": {
    "calories": kcal,
    "protein": g,
    "carbohydrates": g,
    "sugars": g,
    "fat": g,
    "saturatedFat": g,
    "fiber": g,
    "salt": g
  },
  "totalWeight": całkowita_waga_w_gramach
}`;

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
      throw new Error('LLM did not return valid JSON for recipe analysis');
    }
  }

  return parsedData as RecipeNutrition;
}

function generateRecipeSummary(recipe: RecipeNutrition): string {
  let summary = `📊 ${recipe.recipeName}\n`;
  summary += `Porcji: ${recipe.servings} | Całkowita waga: ${recipe.totalWeight}g\n\n`;

  summary += `🥘 Składniki (${recipe.ingredients.length}):\n`;
  recipe.ingredients.forEach((ing) => {
    summary += `- ${ing.name}: ${ing.amount} (~${ing.estimatedGrams}g)\n`;
  });

  summary += `\n📈 Wartości odżywcze NA PORCJĘ:\n`;
  const perServ = recipe.nutritionPerServing;
  summary += `- Kalorie: ${perServ.calories} kcal\n`;
  summary += `- Białko: ${perServ.protein}g\n`;
  summary += `- Węglowodany: ${perServ.carbohydrates}g (w tym cukry: ${perServ.sugars}g)\n`;
  summary += `- Tłuszcz: ${perServ.fat}g (w tym nasycone: ${perServ.saturatedFat}g)\n`;
  summary += `- Błonnik: ${perServ.fiber}g\n`;
  summary += `- Sól: ${perServ.salt}g\n`;

  summary += `\n📈 Wartości odżywcze NA 100g:\n`;
  const per100 = recipe.nutritionPer100g;
  summary += `- Kalorie: ${per100.calories} kcal\n`;
  summary += `- Białko: ${per100.protein}g\n`;
  summary += `- Węglowodany: ${per100.carbohydrates}g (w tym cukry: ${per100.sugars}g)\n`;
  summary += `- Tłuszcz: ${per100.fat}g (w tym nasycone: ${per100.saturatedFat}g)\n`;
  summary += `- Błonnik: ${per100.fiber}g\n`;
  summary += `- Sól: ${per100.salt}g\n`;

  summary += `\n⚠️ Wartości są estymacją. Rzeczywiste wartości mogą się różnić w zależności od konkretnych produktów.`;

  return summary;
}

