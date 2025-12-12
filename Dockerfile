# Multi-stage Dockerfile for Next.js + Flask

# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY my-app/package*.json ./

# Install dependencies
RUN npm ci

# Copy Next.js source
COPY my-app/ ./

# Build Next.js app
RUN npm run build

# Stage 2: Flask application
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/ ./backend/

# Copy built Next.js frontend from previous stage
COPY --from=frontend-builder /app/frontend/out ./my-app/out

# Set working directory to backend
WORKDIR /app/backend

# Expose port
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1

# Run the application with gunicorn for production
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "--timeout", "120", "app:app"]
