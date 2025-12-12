# Flask Backend with Next.js Frontend

This Flask application serves both API endpoints and the Next.js frontend.

## Setup Instructions

### 1. Install Backend Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Build Next.js Frontend

```bash
cd ../my-app
npm install
npm run build
```

This will create a static export in `my-app/out/` directory.

### 3. Run the Flask Server

```bash
cd ../backend
python app.py
```

The server will run on `http://localhost:5000`

## API Endpoints

- `GET/POST /GetDataset` - Returns a greeting message
- `GET /FetchDataset` - Returns All_Diets.csv data as JSON
- `GET /health` - Health check endpoint
- `GET /` - Serves the Next.js frontend
- `GET /<path>` - Serves Next.js static files and handles client-side routing

## Features

- **CORS enabled** for all API routes
- **Static file serving** for Next.js frontend
- **Client-side routing support** for Single Page Application
- **CSV to JSON conversion** for diet data
- **Error handling and logging**

## Development

To run in development mode with auto-reload:

```bash
python app.py
```

For production, consider using a WSGI server like Gunicorn:

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```
