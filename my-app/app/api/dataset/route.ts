import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// Cache for the cleaned dataset
let cachedData: any[] | null = null;
let lastFileModTime: number | null = null;

// Check multiple possible paths for the CSV file
const possiblePaths = [
  '/app/backend/data/All_Diets.csv',  // Docker volume mount
  path.join(process.cwd(), '..', 'backend', 'data', 'All_Diets.csv'),  // Local development
];

function findCSVPath(): string {
  for (const csvPath of possiblePaths) {
    if (fs.existsSync(csvPath)) {
      return csvPath;
    }
  }
  throw new Error('CSV file not found in any expected location');
}

let CSV_FILE_PATH: string;

interface DietRecord {
  Recipe_name: string;
  Diet_type: string;
  Cuisine_type: string;
  'Protein(g)': number;
  'Carbs(g)': number;
  'Fat(g)': number;
  Calories?: number;
  Total_macros?: number;
  Recipe_name_search?: string;
}

function cleanDataset(rawData: any[]): DietRecord[] {
  const cleaned: DietRecord[] = [];
  const seen = new Set<string>();

  for (const row of rawData) {
    // Skip if missing required fields
    if (!row.Recipe_name || !row.Diet_type) continue;

    // Remove duplicates
    const key = `${row.Recipe_name}_${row.Diet_type}`;
    if (seen.has(key)) continue;
    seen.add(key);

    // Parse numeric values
    const protein = parseFloat(row['Protein(g)']) || 0;
    const carbs = parseFloat(row['Carbs(g)']) || 0;
    const fat = parseFloat(row['Fat(g)']) || 0;

    // Skip outliers
    if (protein >= 2000 || carbs >= 3000 || fat >= 2000) continue;

    // Calculate derived fields
    const totalMacros = protein + carbs + fat;
    const calories = protein * 4 + carbs * 4 + fat * 9;
    const recipeNameSearch = row.Recipe_name.toLowerCase().replace(/[^a-z0-9\s]/g, '');

    cleaned.push({
      Recipe_name: row.Recipe_name.trim(),
      Diet_type: row.Diet_type.toLowerCase().trim(),
      Cuisine_type: row.Cuisine_type?.toLowerCase().trim() || '',
      'Protein(g)': protein,
      'Carbs(g)': carbs,
      'Fat(g)': fat,
      Calories: calories,
      Total_macros: totalMacros,
      Recipe_name_search: recipeNameSearch,
    });
  }

  return cleaned;
}

function loadData(): DietRecord[] {
  try {
    // Initialize CSV path on first call
    if (!CSV_FILE_PATH) {
      CSV_FILE_PATH = findCSVPath();
    }
    
    // Check if file exists
    if (!fs.existsSync(CSV_FILE_PATH)) {
      throw new Error('CSV file not found');
    }

    // Check file modification time
    const stats = fs.statSync(CSV_FILE_PATH);
    const currentModTime = stats.mtimeMs;

    // Return cached data if file hasn't changed
    if (cachedData && lastFileModTime === currentModTime) {
      return cachedData;
    }

    // Read and parse CSV
    const fileContent = fs.readFileSync(CSV_FILE_PATH, 'utf-8');
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });

    // Clean the data
    const cleanedData = cleanDataset(parseResult.data);

    // Update cache
    cachedData = cleanedData;
    lastFileModTime = currentModTime;

    return cleanedData;
  } catch (error) {
    console.error('Error loading data:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Load data
    let data = loadData();

    // Apply filters
    const dietType = searchParams.get('diet_type')?.toLowerCase().trim();
    if (dietType) {
      data = data.filter(item => item.Diet_type === dietType);
    }

    const cuisineType = searchParams.get('cuisine_type')?.toLowerCase().trim();
    if (cuisineType) {
      data = data.filter(item => item.Cuisine_type === cuisineType);
    }

    const search = searchParams.get('search')?.toLowerCase().trim();
    if (search) {
      data = data.filter(item => item.Recipe_name_search?.includes(search));
    }

    // Numeric filters
    const minProtein = searchParams.get('min_protein');
    if (minProtein) {
      data = data.filter(item => item['Protein(g)'] >= parseFloat(minProtein));
    }

    const maxProtein = searchParams.get('max_protein');
    if (maxProtein) {
      data = data.filter(item => item['Protein(g)'] <= parseFloat(maxProtein));
    }

    const minCarbs = searchParams.get('min_carbs');
    if (minCarbs) {
      data = data.filter(item => item['Carbs(g)'] >= parseFloat(minCarbs));
    }

    const maxCarbs = searchParams.get('max_carbs');
    if (maxCarbs) {
      data = data.filter(item => item['Carbs(g)'] <= parseFloat(maxCarbs));
    }

    const minFat = searchParams.get('min_fat');
    if (minFat) {
      data = data.filter(item => item['Fat(g)'] >= parseFloat(minFat));
    }

    const maxFat = searchParams.get('max_fat');
    if (maxFat) {
      data = data.filter(item => item['Fat(g)'] <= parseFloat(maxFat));
    }

    const minCalories = searchParams.get('min_calories');
    if (minCalories) {
      data = data.filter(item => (item.Calories || 0) >= parseFloat(minCalories));
    }

    const maxCalories = searchParams.get('max_calories');
    if (maxCalories) {
      data = data.filter(item => (item.Calories || 0) <= parseFloat(maxCalories));
    }

    // Sorting
    const sortBy = searchParams.get('sort_by')?.toLowerCase();
    const sortOrder = searchParams.get('sort_order')?.toLowerCase() || 'asc';

    const sortFieldMap: { [key: string]: keyof DietRecord } = {
      protein: 'Protein(g)',
      carbs: 'Carbs(g)',
      fat: 'Fat(g)',
      calories: 'Calories',
      recipe_name: 'Recipe_name',
    };

    if (sortBy && sortFieldMap[sortBy]) {
      const field = sortFieldMap[sortBy];
      data.sort((a, b) => {
        const aVal = a[field] || 0;
        const bVal = b[field] || 0;
        
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' 
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        
        return sortOrder === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    // Remove search helper field
    const cleanedData = data.map(({ Recipe_name_search, ...rest }) => rest);

    // Prepare response
    const response = {
      data: cleanedData,
      total_items: cleanedData.length,
      filters_applied: {
        diet_type: dietType || null,
        cuisine_type: cuisineType || null,
        search: search || null,
        min_protein: minProtein ? parseFloat(minProtein) : null,
        max_protein: maxProtein ? parseFloat(maxProtein) : null,
        min_carbs: minCarbs ? parseFloat(minCarbs) : null,
        max_carbs: maxCarbs ? parseFloat(maxCarbs) : null,
        min_fat: minFat ? parseFloat(minFat) : null,
        max_fat: maxFat ? parseFloat(maxFat) : null,
        min_calories: minCalories ? parseFloat(minCalories) : null,
        max_calories: maxCalories ? parseFloat(maxCalories) : null,
        sort_by: sortBy || null,
        sort_order: sortBy ? sortOrder : null,
      },
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error: any) {
    console.error('Error in dataset API:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
