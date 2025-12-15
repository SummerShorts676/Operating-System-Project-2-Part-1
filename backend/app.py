from flask import Flask, jsonify, request
from flask_cors import CORS
import csv
import os
import logging
import threading
import pandas as pd
from cache_manager import CacheManager
from file_watcher import FileWatcher
from data_cleaner import DataCleaner

app = Flask(__name__)
# Configure CORS to allow requests from any origin (or specify your frontend URL)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"]
    }
})

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Path to the CSV file
CSV_FILE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'All_Diets.csv')

# Initialize cache manager
cache_manager = CacheManager()

# Initialize file watcher in a separate thread
file_watcher = None
if os.path.exists(CSV_FILE_PATH):
    file_watcher = FileWatcher(CSV_FILE_PATH, cache_manager)
    watcher_thread = threading.Thread(target=file_watcher.start, daemon=True)
    watcher_thread.start()
    logger.info("File watcher started")
else:
    logger.warning(f"CSV file not found at {CSV_FILE_PATH}")


@app.route('/GetDataset', methods=['GET', 'POST', 'OPTIONS'])
def get_dataset():
    """Simple endpoint that returns a greeting message."""
    logger.info('GetDataset endpoint called')
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    name = request.args.get('name') or request.json.get('name') if request.is_json else None
    
    if name:
        return jsonify({
            'message': f"Hello, {name}. This HTTP triggered function executed successfully."
        }), 200
    else:
        return jsonify({
            'message': "This HTTP triggered function executed successfully. Pass a name in the query string or in the request body for a personalized response."
        }), 200


@app.route('/FetchDataset', methods=['GET', 'OPTIONS'])
def fetch_dataset():
    """
    Fetch and return the cleaned diet data as JSON.
    Supports filtering and searching.
    
    Query parameters:
    - diet_type: Filter by diet type (e.g., 'paleo')
    - cuisine_type: Filter by cuisine type (e.g., 'italian')
    - search: Search in recipe names (case-insensitive)
    - min_protein: Minimum protein in grams
    - max_protein: Maximum protein in grams
    - min_carbs: Minimum carbs in grams
    - max_carbs: Maximum carbs in grams
    - min_fat: Minimum fat in grams
    - max_fat: Maximum fat in grams
    - min_calories: Minimum calories
    - max_calories: Maximum calories
    - sort_by: Sort field (protein, carbs, fat, calories, recipe_name)
    - sort_order: Sort order (asc, desc)
    """
    logger.info('FetchDataset endpoint called')
    
    # Handle CORS preflight
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # Try to get cleaned data from cache
        df = cache_manager.get_dataframe('cleaned_data')
        
        if df is None:
            # Fallback: read from CSV and clean
            logger.warning("Cache miss, reading from CSV")
            if not os.path.exists(CSV_FILE_PATH):
                logger.error(f"CSV file not found at {CSV_FILE_PATH}")
                return jsonify({'error': 'Dataset file not found'}), 404
            
            raw_df = pd.read_csv(CSV_FILE_PATH)
            data_cleaner = DataCleaner()
            df = data_cleaner.clean_dataset(raw_df)
            
            # Cache for next time
            cache_manager.set_dataframe('cleaned_data', df, expiry=0)
        
        # Apply filters
        df_filtered = df.copy()
        
        # Diet type filter
        diet_type = request.args.get('diet_type', '').lower().strip()
        if diet_type:
            df_filtered = df_filtered[df_filtered['Diet_type'] == diet_type]
        
        # Cuisine type filter
        cuisine_type = request.args.get('cuisine_type', '').lower().strip()
        if cuisine_type:
            df_filtered = df_filtered[df_filtered['Cuisine_type'] == cuisine_type]
        
        # Search filter (case-insensitive, partial match)
        search = request.args.get('search', '').lower().strip()
        if search:
            df_filtered = df_filtered[
                df_filtered['Recipe_name_search'].str.contains(search, na=False)
            ]
        
        # Numeric filters
        min_protein = request.args.get('min_protein', type=float)
        max_protein = request.args.get('max_protein', type=float)
        min_carbs = request.args.get('min_carbs', type=float)
        max_carbs = request.args.get('max_carbs', type=float)
        min_fat = request.args.get('min_fat', type=float)
        max_fat = request.args.get('max_fat', type=float)
        min_calories = request.args.get('min_calories', type=float)
        max_calories = request.args.get('max_calories', type=float)
        
        if min_protein is not None:
            df_filtered = df_filtered[df_filtered['Protein(g)'] >= min_protein]
        if max_protein is not None:
            df_filtered = df_filtered[df_filtered['Protein(g)'] <= max_protein]
        if min_carbs is not None:
            df_filtered = df_filtered[df_filtered['Carbs(g)'] >= min_carbs]
        if max_carbs is not None:
            df_filtered = df_filtered[df_filtered['Carbs(g)'] <= max_carbs]
        if min_fat is not None:
            df_filtered = df_filtered[df_filtered['Fat(g)'] >= min_fat]
        if max_fat is not None:
            df_filtered = df_filtered[df_filtered['Fat(g)'] <= max_fat]
        if min_calories is not None:
            df_filtered = df_filtered[df_filtered['Calories'] >= min_calories]
        if max_calories is not None:
            df_filtered = df_filtered[df_filtered['Calories'] <= max_calories]
        
        # Sorting
        sort_by = request.args.get('sort_by', '').lower()
        sort_order = request.args.get('sort_order', 'asc').lower()
        
        valid_sort_fields = {
            'protein': 'Protein(g)',
            'carbs': 'Carbs(g)',
            'fat': 'Fat(g)',
            'calories': 'Calories',
            'recipe_name': 'Recipe_name'
        }
        
        if sort_by in valid_sort_fields:
            ascending = sort_order == 'asc'
            df_filtered = df_filtered.sort_values(
                by=valid_sort_fields[sort_by],
                ascending=ascending
            )
        
        # Drop the search helper column before returning
        if 'Recipe_name_search' in df_filtered.columns:
            df_filtered = df_filtered.drop(columns=['Recipe_name_search'])
        
        # Convert to records
        records = df_filtered.to_dict('records')
        
        # Prepare response
        response = {
            'data': records,
            'total_items': len(records),
            'filters_applied': {
                'diet_type': diet_type or None,
                'cuisine_type': cuisine_type or None,
                'search': search or None,
                'min_protein': min_protein,
                'max_protein': max_protein,
                'min_carbs': min_carbs,
                'max_carbs': max_carbs,
                'min_fat': min_fat,
                'max_fat': max_fat,
                'min_calories': min_calories,
                'max_calories': max_calories,
                'sort_by': sort_by or None,
                'sort_order': sort_order if sort_by else None
            }
        }
        
        logger.info(f"Returning {len(records)} recipes")
        return jsonify(response), 200
    
    except Exception as e:
        logger.exception("Error fetching dataset")
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    redis_status = 'connected' if cache_manager.is_connected() else 'disconnected'
    return jsonify({
        'status': 'healthy',
        'redis': redis_status,
        'csv_file_exists': os.path.exists(CSV_FILE_PATH)
    }), 200


@app.route('/statistics', methods=['GET', 'OPTIONS'])
def get_statistics():
    """
    Get pre-calculated statistics for visualization.
    Returns cached statistics about diet types, cuisines, and macro averages.
    """
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        # Try to get from cache
        stats = cache_manager.get('statistics')
        
        if stats is None:
            # Calculate on-demand if not cached
            logger.warning("Statistics not cached, calculating now")
            df = cache_manager.get_dataframe('cleaned_data')
            
            if df is None:
                # Read and clean data
                if not os.path.exists(CSV_FILE_PATH):
                    return jsonify({'error': 'Dataset file not found'}), 404
                
                raw_df = pd.read_csv(CSV_FILE_PATH)
                data_cleaner = DataCleaner()
                df = data_cleaner.clean_dataset(raw_df)
                cache_manager.set_dataframe('cleaned_data', df, expiry=0)
            
            data_cleaner = DataCleaner()
            stats = data_cleaner.calculate_statistics(df)
            cache_manager.set('statistics', stats, expiry=0)
        
        return jsonify(stats), 200
    
    except Exception as e:
        logger.exception("Error fetching statistics")
        return jsonify({'error': str(e)}), 500


@app.route('/diet-types', methods=['GET', 'OPTIONS'])
def get_diet_types():
    """Get list of available diet types."""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        df = cache_manager.get_dataframe('cleaned_data')
        
        if df is None:
            if not os.path.exists(CSV_FILE_PATH):
                return jsonify({'error': 'Dataset file not found'}), 404
            
            raw_df = pd.read_csv(CSV_FILE_PATH)
            data_cleaner = DataCleaner()
            df = data_cleaner.clean_dataset(raw_df)
            cache_manager.set_dataframe('cleaned_data', df, expiry=0)
        
        diet_types = sorted(df['Diet_type'].unique().tolist())
        return jsonify({'diet_types': diet_types}), 200
    
    except Exception as e:
        logger.exception("Error fetching diet types")
        return jsonify({'error': str(e)}), 500


@app.route('/cuisine-types', methods=['GET', 'OPTIONS'])
def get_cuisine_types():
    """Get list of available cuisine types."""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        df = cache_manager.get_dataframe('cleaned_data')
        
        if df is None:
            if not os.path.exists(CSV_FILE_PATH):
                return jsonify({'error': 'Dataset file not found'}), 404
            
            raw_df = pd.read_csv(CSV_FILE_PATH)
            data_cleaner = DataCleaner()
            df = data_cleaner.clean_dataset(raw_df)
            cache_manager.set_dataframe('cleaned_data', df, expiry=0)
        
        cuisine_types = sorted(df['Cuisine_type'].unique().tolist())
        return jsonify({'cuisine_types': cuisine_types}), 200
    
    except Exception as e:
        logger.exception("Error fetching cuisine types")
        return jsonify({'error': str(e)}), 500


@app.route('/clear-cache', methods=['POST', 'OPTIONS'])
def clear_cache():
    """Clear all cached data (for testing/debugging)."""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        if cache_manager.clear_all():
            # Trigger reprocessing
            if file_watcher:
                watcher_thread = threading.Thread(
                    target=file_watcher.start,
                    daemon=True
                )
                watcher_thread.start()
            
            return jsonify({'message': 'Cache cleared successfully'}), 200
        else:
            return jsonify({'error': 'Failed to clear cache'}), 500
    
    except Exception as e:
        logger.exception("Error clearing cache")
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    # Run the Flask app
    app.run(host='0.0.0.0', port=5000, debug=True)
