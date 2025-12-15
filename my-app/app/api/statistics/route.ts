import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Cache for statistics
let cachedStats: any | null = null;
let lastStatsCalcTime: number | null = null;
const CACHE_DURATION = 3600000; // 1 hour in milliseconds

const CSV_FILE_PATH = path.join(process.cwd(), '..', 'backend', 'data', 'All_Diets.csv');

interface DietRecord {
  Recipe_name: string;
  Diet_type: string;
  Cuisine_type: string;
  'Protein(g)': number;
  'Carbs(g)': number;
  'Fat(g)': number;
  Calories: number;
}

function loadAndCleanData(): DietRecord[] {
  const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
  const parseResult = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
  });

  const cleaned: DietRecord[] = [];
  const seen = new Set<string>();

  for (const row of parseResult.data as any[]) {
    if (!row.Recipe_name || !row.Diet_type) continue;

    const key = `${row.Recipe_name}_${row.Diet_type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const protein = parseFloat(row['Protein(g)']) || 0;
    const carbs = parseFloat(row['Carbs(g)']) || 0;
    const fat = parseFloat(row['Fat(g)']) || 0;

    if (protein >= 2000 || carbs >= 3000 || fat >= 2000) continue;

    const calories = protein * 4 + carbs * 4 + fat * 9;

    cleaned.push({
      Recipe_name: row.Recipe_name.trim(),
      Diet_type: row.Diet_type.toLowerCase().trim(),
      Cuisine_type: row.Cuisine_type?.toLowerCase().trim() || '',
      'Protein(g)': protein,
      'Carbs(g)': carbs,
      'Fat(g)': fat,
      Calories: calories,
    });
  }

  return cleaned;
}

function calculateStatistics(data: DietRecord[]) {
  // Diet type distribution
  const recipesByDiet: { [key: string]: number } = {};
  data.forEach(item => {
    recipesByDiet[item.Diet_type] = (recipesByDiet[item.Diet_type] || 0) + 1;
  });

  // Cuisine type distribution (top 20)
  const recipesByCuisine: { [key: string]: number } = {};
  data.forEach(item => {
    if (item.Cuisine_type) {
      recipesByCuisine[item.Cuisine_type] = (recipesByCuisine[item.Cuisine_type] || 0) + 1;
    }
  });
  const top20Cuisines = Object.entries(recipesByCuisine)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .reduce((acc, [key, val]) => ({ ...acc, [key]: val }), {});

  // Average macros by diet type
  const dietGroups: { [key: string]: DietRecord[] } = {};
  data.forEach(item => {
    if (!dietGroups[item.Diet_type]) {
      dietGroups[item.Diet_type] = [];
    }
    dietGroups[item.Diet_type].push(item);
  });

  const avgMacrosByDiet: { [key: string]: any } = {};
  Object.entries(dietGroups).forEach(([diet, items]) => {
    const avgProtein = items.reduce((sum, item) => sum + item['Protein(g)'], 0) / items.length;
    const avgCarbs = items.reduce((sum, item) => sum + item['Carbs(g)'], 0) / items.length;
    const avgFat = items.reduce((sum, item) => sum + item['Fat(g)'], 0) / items.length;
    const avgCalories = items.reduce((sum, item) => sum + item.Calories, 0) / items.length;

    avgMacrosByDiet[diet] = {
      'Protein(g)': parseFloat(avgProtein.toFixed(2)),
      'Carbs(g)': parseFloat(avgCarbs.toFixed(2)),
      'Fat(g)': parseFloat(avgFat.toFixed(2)),
      Calories: parseFloat(avgCalories.toFixed(2)),
    };
  });

  // Average macros by cuisine
  const cuisineGroups: { [key: string]: DietRecord[] } = {};
  data.forEach(item => {
    if (item.Cuisine_type) {
      if (!cuisineGroups[item.Cuisine_type]) {
        cuisineGroups[item.Cuisine_type] = [];
      }
      cuisineGroups[item.Cuisine_type].push(item);
    }
  });

  const avgMacrosByCuisine: { [key: string]: any } = {};
  Object.entries(cuisineGroups).forEach(([cuisine, items]) => {
    const avgProtein = items.reduce((sum, item) => sum + item['Protein(g)'], 0) / items.length;
    const avgCarbs = items.reduce((sum, item) => sum + item['Carbs(g)'], 0) / items.length;
    const avgFat = items.reduce((sum, item) => sum + item['Fat(g)'], 0) / items.length;
    const avgCalories = items.reduce((sum, item) => sum + item.Calories, 0) / items.length;

    avgMacrosByCuisine[cuisine] = {
      'Protein(g)': parseFloat(avgProtein.toFixed(2)),
      'Carbs(g)': parseFloat(avgCarbs.toFixed(2)),
      'Fat(g)': parseFloat(avgFat.toFixed(2)),
      Calories: parseFloat(avgCalories.toFixed(2)),
    };
  });

  // Overall statistics
  const totalProtein = data.reduce((sum, item) => sum + item['Protein(g)'], 0);
  const totalCarbs = data.reduce((sum, item) => sum + item['Carbs(g)'], 0);
  const totalFat = data.reduce((sum, item) => sum + item['Fat(g)'], 0);
  const totalCalories = data.reduce((sum, item) => sum + item.Calories, 0);

  const overallStats = {
    avg_protein: parseFloat((totalProtein / data.length).toFixed(2)),
    avg_carbs: parseFloat((totalCarbs / data.length).toFixed(2)),
    avg_fat: parseFloat((totalFat / data.length).toFixed(2)),
    avg_calories: parseFloat((totalCalories / data.length).toFixed(2)),
    max_protein: parseFloat(Math.max(...data.map(item => item['Protein(g)'])).toFixed(2)),
    max_carbs: parseFloat(Math.max(...data.map(item => item['Carbs(g)'])).toFixed(2)),
    max_fat: parseFloat(Math.max(...data.map(item => item['Fat(g)'])).toFixed(2)),
    max_calories: parseFloat(Math.max(...data.map(item => item.Calories)).toFixed(2)),
  };

  // Top recipes
  const topCalorieRecipes = [...data]
    .sort((a, b) => b.Calories - a.Calories)
    .slice(0, 10)
    .map(item => ({
      Recipe_name: item.Recipe_name,
      Diet_type: item.Diet_type,
      Cuisine_type: item.Cuisine_type,
      Calories: item.Calories,
    }));

  const highProteinRecipes = [...data]
    .sort((a, b) => b['Protein(g)'] - a['Protein(g)'])
    .slice(0, 10)
    .map(item => ({
      Recipe_name: item.Recipe_name,
      Diet_type: item.Diet_type,
      Cuisine_type: item.Cuisine_type,
      'Protein(g)': item['Protein(g)'],
    }));

  return {
    total_recipes: data.length,
    diet_types: [...new Set(data.map(item => item.Diet_type))].sort(),
    cuisine_types: [...new Set(data.map(item => item.Cuisine_type).filter(Boolean))].sort(),
    recipes_by_diet: recipesByDiet,
    recipes_by_cuisine: top20Cuisines,
    avg_macros_by_diet: avgMacrosByDiet,
    avg_macros_by_cuisine: avgMacrosByCuisine,
    overall_stats: overallStats,
    top_calorie_recipes: topCalorieRecipes,
    high_protein_recipes: highProteinRecipes,
  };
}

export async function GET() {
  try {
    // Check cache
    const now = Date.now();
    if (cachedStats && lastStatsCalcTime && (now - lastStatsCalcTime) < CACHE_DURATION) {
      return NextResponse.json(cachedStats, { status: 200 });
    }

    // Load and calculate
    if (!fs.existsSync(CSV_FILE_PATH)) {
      return NextResponse.json({ error: 'Dataset file not found' }, { status: 404 });
    }

    const data = loadAndCleanData();
    const stats = calculateStatistics(data);

    // Update cache
    cachedStats = stats;
    lastStatsCalcTime = now;

    return NextResponse.json(stats, { status: 200 });
  } catch (error: any) {
    console.error('Error calculating statistics:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
