# Diet Data API - Docker Deployment Guide

## Overview

This Flask application serves a diet dataset with advanced features including:
- Redis caching for optimized performance
- Automatic data cleaning when CSV changes
- Pre-calculated statistics for visualizations
- Advanced filtering, searching, and pagination
- Next.js frontend integration

## Architecture

```
┌─────────────────┐
│   Next.js App   │ (Static files served by Flask)
└────────┬────────┘
         │
         ▼
┌─────────────────┐      ┌─────────────────┐
│   Flask API     │◄────►│  Redis Cache    │
└────────┬────────┘      └─────────────────┘
         │
         ▼
┌─────────────────┐
│  All_Diets.csv  │ (File watcher monitors changes)
└─────────────────┘
```

## Features

### 1. Data Cleaning
- Automatically triggers when `All_Diets.csv` changes
- Removes duplicates and handles missing values
- Standardizes text fields (lowercase, trimmed)
- Calculates additional fields (total calories, total macros)
- Removes outliers with unrealistic values
- Results cached in Redis

### 2. Performance Optimization
- **Redis Caching**: All cleaned data and statistics cached
- **Pre-calculation**: Statistics calculated once when CSV changes
- **No repeated processing**: File hash tracking prevents unnecessary recalculation
- **Fast queries**: Cached data served instantly

### 3. Data Interaction
- **Filtering**: By diet type, cuisine type, macro ranges
- **Search**: Keyword search in recipe names
- **Sorting**: By protein, carbs, fat, calories, or name
- **Pagination**: Configurable page size (1-100 items)

## Quick Start

### 1. Build and Run with Docker Compose

```bash
# Build and start services
docker-compose up --build

# Or run in detached mode
docker-compose up -d --build
```

The application will be available at `http://localhost:5000`

### 2. Stop Services

```bash
docker-compose down

# To also remove volumes (Redis data)
docker-compose down -v
```

## API Endpoints

### `/FetchDataset` - Get Diet Data
Get cleaned and filtered diet data with pagination.

**Query Parameters:**
- `diet_type` (string): Filter by diet type (e.g., "paleo")
- `cuisine_type` (string): Filter by cuisine (e.g., "italian")
- `search` (string): Search recipe names
- `min_protein`, `max_protein` (float): Protein range in grams
- `min_carbs`, `max_carbs` (float): Carbs range in grams
- `min_fat`, `max_fat` (float): Fat range in grams
- `min_calories`, `max_calories` (float): Calorie range
- `page` (int): Page number (default: 1)
- `per_page` (int): Items per page (default: 20, max: 100)
- `sort_by` (string): Sort field (protein|carbs|fat|calories|recipe_name)
- `sort_order` (string): Sort order (asc|desc)

**Example:**
```bash
# Get all paleo recipes
curl "http://localhost:5000/FetchDataset?diet_type=paleo"

# Search for chicken recipes
curl "http://localhost:5000/FetchDataset?search=chicken"

# High protein recipes (>100g), sorted by protein descending
curl "http://localhost:5000/FetchDataset?min_protein=100&sort_by=protein&sort_order=desc"

# Page 2 with 50 items per page
curl "http://localhost:5000/FetchDataset?page=2&per_page=50"

# Combined filters
curl "http://localhost:5000/FetchDataset?diet_type=paleo&cuisine_type=italian&min_protein=50&page=1&per_page=20"
```

**Response:**
```json
{
  "data": [
    {
      "Recipe_name": "Paleo Chicken Salad",
      "Diet_type": "paleo",
      "Cuisine_type": "american",
      "Protein(g)": 97.63,
      "Carbs(g)": 88.59,
      "Fat(g)": 98.0,
      "Calories": 1554.52,
      "Total_macros": 284.22,
      "Extraction_day": "10/16/2022",
      "Extraction_time": "17:21:58"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_items": 245,
    "total_pages": 13,
    "has_next": true,
    "has_prev": false
  },
  "filters_applied": {
    "diet_type": "paleo",
    "cuisine_type": null,
    "search": null,
    "min_protein": null,
    "max_protein": null,
    "sort_by": null,
    "sort_order": null
  }
}
```

### `/statistics` - Get Pre-calculated Statistics
Get comprehensive statistics for visualizations.

**Example:**
```bash
curl "http://localhost:5000/statistics"
```

**Response includes:**
- Total recipe count
- Recipes by diet type
- Recipes by cuisine type
- Average macros by diet type
- Average macros by cuisine type
- Overall statistics (avg, max values)
- Top calorie recipes
- High protein recipes

### `/diet-types` - Get Available Diet Types
```bash
curl "http://localhost:5000/diet-types"
```

**Response:**
```json
{
  "diet_types": ["paleo", "vegan", "keto", ...]
}
```

### `/cuisine-types` - Get Available Cuisine Types
```bash
curl "http://localhost:5000/cuisine-types"
```

**Response:**
```json
{
  "cuisine_types": ["american", "italian", "chinese", ...]
}
```

### `/health` - Health Check
```bash
curl "http://localhost:5000/health"
```

**Response:**
```json
{
  "status": "healthy",
  "redis": "connected",
  "csv_file_exists": true
}
```

### `/clear-cache` - Clear Cache (POST)
Clear all cached data and trigger reprocessing.

```bash
curl -X POST "http://localhost:5000/clear-cache"
```

## Data Cleaning Process

When the CSV file changes, the following steps occur automatically:

1. **File Change Detection**: Watchdog monitors the CSV file
2. **Hash Verification**: Only process if file content actually changed
3. **Data Cleaning**:
   - Remove duplicate recipes
   - Drop rows with missing critical data
   - Convert and fill numeric columns
   - Standardize text (lowercase, trimmed)
   - Calculate additional fields (calories, total macros)
   - Remove outliers
4. **Caching**: Store cleaned data in Redis
5. **Statistics Calculation**: Pre-calculate all visualization data
6. **Cache Statistics**: Store in Redis for instant retrieval

## Environment Variables

Set in `docker-compose.yml`:
- `REDIS_HOST`: Redis hostname (default: "redis")
- `REDIS_PORT`: Redis port (default: 6379)
- `REDIS_DB`: Redis database number (default: 0)
- `FLASK_ENV`: Environment (default: "production")

## Updating the Dataset

To update the dataset:

1. **Replace the CSV file**:
```bash
docker cp new_All_Diets.csv diet-flask-app:/app/backend/data/All_Diets.csv
```

2. The file watcher will automatically:
   - Detect the change
   - Clean the new data
   - Recalculate statistics
   - Update the cache

## Monitoring

### View Logs
```bash
# All services
docker-compose logs -f

# Flask app only
docker-compose logs -f web

# Redis only
docker-compose logs -f redis
```

### Check Redis
```bash
# Connect to Redis CLI
docker-compose exec redis redis-cli

# Check cached keys
KEYS *

# Check specific key
GET cleaned_data
```

## Performance Notes

- **First Request**: May take a few seconds as data is loaded and cleaned
- **Subsequent Requests**: Served from cache (milliseconds)
- **After CSV Update**: Brief delay while data is reprocessed
- **Redis Persistence**: Data survives container restarts

## Deployment to Azure VM

### Prerequisites
- Ubuntu VM in Azure
- Docker and Docker Compose installed
- Ports 5000 and 6379 open (or configure Azure NSG)

### Deployment Steps

1. **SSH to Azure VM**:
```bash
ssh azureuser@your-vm-ip
```

2. **Install Docker** (if not installed):
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

3. **Install Docker Compose**:
```bash
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

4. **Clone/Upload Project**:
```bash
# Option 1: Clone from git
git clone <your-repo-url>
cd project-3

# Option 2: Upload via scp
scp -r /path/to/project-3 azureuser@your-vm-ip:~/
```

5. **Start Services**:
```bash
docker-compose up -d --build
```

6. **Configure Azure NSG** to allow inbound traffic on port 5000

7. **Access Application**:
```
http://<your-vm-ip>:5000
```

### Production Recommendations

1. **Use NGINX as Reverse Proxy**:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

2. **Enable HTTPS with Let's Encrypt**
3. **Set up monitoring** (e.g., Azure Monitor)
4. **Configure backups** for Redis data
5. **Set resource limits** in docker-compose.yml

## Troubleshooting

### Redis Connection Issues
```bash
# Check if Redis is running
docker-compose ps redis

# Test Redis connection
docker-compose exec redis redis-cli ping
```

### File Watcher Not Working
```bash
# Check Flask logs
docker-compose logs web | grep "File watcher"

# Manually trigger reprocessing
curl -X POST http://localhost:5000/clear-cache
```

### Out of Memory
```bash
# Check container memory
docker stats

# Increase memory limits in docker-compose.yml
```

## License

MIT
