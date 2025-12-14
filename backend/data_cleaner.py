"""Data cleaning and processing utilities."""
import pandas as pd
import logging
from typing import Dict, List
import re

logger = logging.getLogger(__name__)


class DataCleaner:
    """Handles data cleaning operations for diet dataset."""
    
    @staticmethod
    def clean_dataset(df: pd.DataFrame) -> pd.DataFrame:
        """
        Clean and standardize the diet dataset.
        
        Args:
            df: Raw dataframe from CSV
            
        Returns:
            Cleaned dataframe
        """
        logger.info(f"Starting data cleaning for {len(df)} rows")
        
        # Create a copy to avoid modifying original
        cleaned_df = df.copy()
        
        # 1. Remove duplicates
        initial_count = len(cleaned_df)
        cleaned_df = cleaned_df.drop_duplicates(subset=['Recipe_name', 'Diet_type'], keep='first')
        logger.info(f"Removed {initial_count - len(cleaned_df)} duplicate rows")
        
        # 2. Handle missing values
        cleaned_df = cleaned_df.dropna(subset=['Recipe_name', 'Diet_type'])
        
        # Fill numeric columns with 0 if missing
        numeric_cols = ['Protein(g)', 'Carbs(g)', 'Fat(g)']
        for col in numeric_cols:
            cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors='coerce').fillna(0)
        
        # 3. Standardize text fields
        cleaned_df['Diet_type'] = cleaned_df['Diet_type'].str.lower().str.strip()
        cleaned_df['Cuisine_type'] = cleaned_df['Cuisine_type'].str.lower().str.strip()
        cleaned_df['Recipe_name'] = cleaned_df['Recipe_name'].str.strip()
        
        # 4. Add calculated fields
        cleaned_df['Total_macros'] = (
            cleaned_df['Protein(g)'] + 
            cleaned_df['Carbs(g)'] + 
            cleaned_df['Fat(g)']
        )
        
        # Calculate calories (approximate: protein=4cal/g, carbs=4cal/g, fat=9cal/g)
        cleaned_df['Calories'] = (
            cleaned_df['Protein(g)'] * 4 + 
            cleaned_df['Carbs(g)'] * 4 + 
            cleaned_df['Fat(g)'] * 9
        )
        
        # 5. Add search-friendly field (lowercase, no special chars)
        cleaned_df['Recipe_name_search'] = cleaned_df['Recipe_name'].apply(
            lambda x: re.sub(r'[^a-z0-9\s]', '', x.lower())
        )
        
        # 6. Remove outliers (recipes with unrealistic macro values)
        cleaned_df = cleaned_df[
            (cleaned_df['Protein(g)'] < 2000) &
            (cleaned_df['Carbs(g)'] < 3000) &
            (cleaned_df['Fat(g)'] < 2000)
        ]
        
        logger.info(f"Data cleaning completed. Final row count: {len(cleaned_df)}")
        
        return cleaned_df
    
    @staticmethod
    def calculate_statistics(df: pd.DataFrame) -> Dict:
        """
        Calculate various statistics for visualization.
        
        Args:
            df: Cleaned dataframe
            
        Returns:
            Dictionary with pre-calculated statistics
        """
        logger.info("Calculating statistics for visualization")
        
        stats = {
            'total_recipes': int(len(df)),
            'diet_types': df['Diet_type'].unique().tolist(),
            'cuisine_types': df['Cuisine_type'].unique().tolist(),
            
            # Diet type distribution
            'recipes_by_diet': df['Diet_type'].value_counts().to_dict(),
            
            # Cuisine type distribution
            'recipes_by_cuisine': df['Cuisine_type'].value_counts().head(20).to_dict(),
            
            # Average macros by diet type
            'avg_macros_by_diet': df.groupby('Diet_type')[
                ['Protein(g)', 'Carbs(g)', 'Fat(g)', 'Calories']
            ].mean().round(2).to_dict('index'),
            
            # Average macros by cuisine
            'avg_macros_by_cuisine': df.groupby('Cuisine_type')[
                ['Protein(g)', 'Carbs(g)', 'Fat(g)', 'Calories']
            ].mean().round(2).to_dict('index'),
            
            # Overall statistics
            'overall_stats': {
                'avg_protein': float(df['Protein(g)'].mean().round(2)),
                'avg_carbs': float(df['Carbs(g)'].mean().round(2)),
                'avg_fat': float(df['Fat(g)'].mean().round(2)),
                'avg_calories': float(df['Calories'].mean().round(2)),
                'max_protein': float(df['Protein(g)'].max().round(2)),
                'max_carbs': float(df['Carbs(g)'].max().round(2)),
                'max_fat': float(df['Fat(g)'].max().round(2)),
                'max_calories': float(df['Calories'].max().round(2)),
            },
            
            # Top recipes by calories
            'top_calorie_recipes': df.nlargest(10, 'Calories')[
                ['Recipe_name', 'Diet_type', 'Cuisine_type', 'Calories']
            ].to_dict('records'),
            
            # High protein recipes
            'high_protein_recipes': df.nlargest(10, 'Protein(g)')[
                ['Recipe_name', 'Diet_type', 'Cuisine_type', 'Protein(g)']
            ].to_dict('records'),
        }
        
        logger.info("Statistics calculation completed")
        return stats
