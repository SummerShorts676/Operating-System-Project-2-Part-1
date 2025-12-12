#!/bin/bash

# Build and deploy script for Azure VM

set -e

echo "🚀 Starting deployment..."

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    exit 1
fi

echo -e "${BLUE}📦 Building Docker images...${NC}"
docker-compose build

echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose down

echo -e "${BLUE}🚀 Starting services...${NC}"
docker-compose up -d

echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"
sleep 10

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✅ Services started successfully!${NC}"
    echo ""
    echo -e "${GREEN}🌐 Application is running at:${NC}"
    echo -e "   ${BLUE}http://localhost:5000${NC}"
    echo ""
    echo -e "${GREEN}📊 Health check:${NC}"
    curl -s http://localhost:5000/health | python3 -m json.tool || echo "Waiting for app to be ready..."
    echo ""
    echo -e "${GREEN}📝 View logs:${NC}"
    echo -e "   ${BLUE}docker-compose logs -f${NC}"
else
    echo -e "${RED}❌ Failed to start services${NC}"
    docker-compose logs
    exit 1
fi
