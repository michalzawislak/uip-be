import axios from 'axios';
import type { IToolContext, IToolResult } from '../tool.interface';

interface OpenFoodFactsProduct {
  product?: {
    product_name?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'proteins_100g'?: number;
      'carbohydrates_100g'?: number;
      'sugars_100g'?: number;
      'fat_100g'?: number;
      'saturated-fat_100g'?: number;
      'fiber_100g'?: number;
      'sodium_100g'?: number;
      'salt_100g'?: number;
    };
    brands?: string;
    categories?: string;
    ingredients_text?: string;
  };
  status: number;
}

interface NutritionData {
  productName: string;
  brand?: string;
  per100g: {
    calories: number;
    protein: number;
    carbohydrates: number;
    sugars: number;
    fat: number;
    saturatedFat: number;
    fiber: number;
    salt: number;
  };
  ingredients?: string;
  categories?: string;
  source: 'open-food-facts' | 'llm-estimation';
}

export async function execute(context: IToolContext): Promise<IToolResult> {
  const startTime = Date.now();

  try {
    console.log('   🔧 [TOOL:nutrition-analyzer] Rozpoczynam analizę wartości odżywczych...');

    let productName = '';
    let barcode: string | undefined;

    if (context.file && context.file.mimetype.startsWith('image/')) {
      console.log('   📸 [TOOL:nutrition-analyzer] Wykryto obraz - wymaga najpierw OCR przez image-analysis');
      return {
        success: false,
        output: null,
        error: 'Image input requires image-analysis tool first in pipeline. Use instruction like: "Przeanalizuj wartości odżywcze z etykiety"',
      };
    }

    if (context.previousResult && typeof context.previousResult === 'object') {
      const prev = context.previousResult as Record<string, unknown>;
      if (prev.text && typeof prev.text === 'string') {
        productName = prev.text;
      } else if (prev.productName && typeof prev.productName === 'string') {
        productName = prev.productName;
      }
    }

    if (!productName) {
      productName = context.instruction;
    }

    if (!productName || productName.trim().length === 0) {
      return {
        success: false,
        output: null,
        error: 'No product name provided. Please specify a product name or provide previous result with product information.',
      };
    }

    console.log(`   🔍 [TOOL:nutrition-analyzer] Szukam produktu: "${productName.substring(0, 50)}..."`);

    const barcodeMatch = productName.match(/\b\d{8,13}\b/);
    if (barcodeMatch) {
      barcode = barcodeMatch[0];
      console.log(`   📊 [TOOL:nutrition-analyzer] Wykryto kod kreskowy: ${barcode}`);
    }

    let nutritionData: NutritionData | null = null;

    if (barcode) {
      try {
        nutritionData = await fetchFromOpenFoodFactsByBarcode(barcode);
      } catch (error) {
        console.log(`   ⚠️ [TOOL:nutrition-analyzer] Błąd API dla kodu kreskowego, próbuję wyszukiwania tekstowego...`);
      }
    }

    if (!nutritionData) {
      try {
        nutritionData = await searchOpenFoodFactsByName(productName);
      } catch (error) {
        console.log(`   ⚠️ [TOOL:nutrition-analyzer] Open Food Facts API niedostępne, używam LLM fallback`);
      }
    }

    if (!nutritionData) {
      nutritionData = await estimateWithLLM(productName, context);
    }

    const duration = Date.now() - startTime;
    console.log(`   ✓ [TOOL:nutrition-analyzer] Analiza zakończona (${duration}ms, źródło: ${nutritionData.source})`);

    return {
      success: true,
      output: {
        nutritionData,
        summary: generateSummary(nutritionData),
      },
      metadata: {
        processingTimeMs: duration,
        source: nutritionData.source,
        productName: nutritionData.productName,
        apiUsed: nutritionData.source === 'open-food-facts',
        fallbackUsed: nutritionData.source === 'llm-estimation',
      },
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`   ✗ [TOOL:nutrition-analyzer] Błąd: ${error instanceof Error ? error.message : 'Unknown'}`);

    return {
      success: false,
      output: null,
      error: error instanceof Error ? error.message : 'Unknown error during nutrition analysis',
      metadata: {
        processingTimeMs: duration,
      },
    };
  }
}

async function fetchFromOpenFoodFactsByBarcode(barcode: string): Promise<NutritionData | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`;

  const response = await axios.get<OpenFoodFactsProduct>(url, {
    timeout: 10000,
    headers: {
      'User-Agent': 'UniversalInputProcessor/1.0',
    },
  });

  if (response.data.status !== 1 || !response.data.product) {
    return null;
  }

  return parseOpenFoodFactsProduct(response.data.product);
}

async function searchOpenFoodFactsByName(productName: string): Promise<NutritionData | null> {
  const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl`;

  const response = await axios.get(searchUrl, {
    params: {
      search_terms: productName,
      search_simple: 1,
      action: 'process',
      json: 1,
      page_size: 3,
    },
    timeout: 10000,
    headers: {
      'User-Agent': 'UniversalInputProcessor/1.0',
    },
  });

  if (!response.data.products || response.data.products.length === 0) {
    return null;
  }

  return parseOpenFoodFactsProduct(response.data.products[0]);
}

function parseOpenFoodFactsProduct(product: NonNullable<OpenFoodFactsProduct['product']>): NutritionData {
  const nutriments = product.nutriments || {};

  return {
    productName: product.product_name || 'Unknown Product',
    brand: product.brands,
    per100g: {
      calories: nutriments['energy-kcal_100g'] || 0,
      protein: nutriments['proteins_100g'] || 0,
      carbohydrates: nutriments['carbohydrates_100g'] || 0,
      sugars: nutriments['sugars_100g'] || 0,
      fat: nutriments['fat_100g'] || 0,
      saturatedFat: nutriments['saturated-fat_100g'] || 0,
      fiber: nutriments['fiber_100g'] || 0,
      salt: nutriments['salt_100g'] || 0,
    },
    ingredients: product.ingredients_text,
    categories: product.categories,
    source: 'open-food-facts',
  };
}

async function estimateWithLLM(productName: string, context: IToolContext): Promise<NutritionData> {
  console.log('   🤖 [TOOL:nutrition-analyzer] Używam LLM do estymacji wartości odżywczych...');

  const prompt = `Jesteś ekspertem ds. żywienia. Użytkownik pyta o produkt: "${productName}"

Oszacuj typowe wartości odżywcze dla tego produktu na 100g.

WAŻNE: Odpowiedz TYLKO czystym JSON bez żadnego dodatkowego tekstu, markdown ani \`\`\`json.

Format odpowiedzi:
{
  "productName": "nazwa produktu",
  "brand": "marka (jeśli znana, lub null)",
  "per100g": {
    "calories": liczba_kcal,
    "protein": liczba_gramów,
    "carbohydrates": liczba_gramów,
    "sugars": liczba_gramów,
    "fat": liczba_gramów,
    "saturatedFat": liczba_gramów,
    "fiber": liczba_gramów,
    "salt": liczba_gramów
  },
  "note": "Krótka uwaga o estymacji"
}`;

  const response = await context.llmClient.generateCompletion([
    {
      role: 'user',
      content: prompt,
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
      throw new Error('LLM did not return valid JSON');
    }
  }

  const data = parsedData as {
    productName: string;
    brand?: string;
    per100g: {
      calories: number;
      protein: number;
      carbohydrates: number;
      sugars: number;
      fat: number;
      saturatedFat: number;
      fiber: number;
      salt: number;
    };
    note?: string;
  };

  return {
    productName: data.productName,
    brand: data.brand,
    per100g: data.per100g,
    source: 'llm-estimation',
  };
}

function generateSummary(data: NutritionData): string {
  const { productName, per100g, brand, source } = data;

  let summary = `${productName}${brand ? ` (${brand})` : ''}\n\n`;
  summary += `Wartości odżywcze na 100g:\n`;
  summary += `- Kalorie: ${per100g.calories} kcal\n`;
  summary += `- Białko: ${per100g.protein}g\n`;
  summary += `- Węglowodany: ${per100g.carbohydrates}g (w tym cukry: ${per100g.sugars}g)\n`;
  summary += `- Tłuszcz: ${per100g.fat}g (w tym nasycone: ${per100g.saturatedFat}g)\n`;
  summary += `- Błonnik: ${per100g.fiber}g\n`;
  summary += `- Sól: ${per100g.salt}g\n\n`;

  if (source === 'llm-estimation') {
    summary += `⚠️ Wartości są estymacją AI. Dla dokładnych danych sprawdź etykietę produktu.\n`;
  } else {
    summary += `✓ Dane pochodzą z Open Food Facts API.\n`;
  }

  return summary;
}

