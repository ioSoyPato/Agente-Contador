#!/bin/bash

# Financial Analyzer Docker Runner
# This script helps you run the Financial Analyzer application using Docker

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 Financial Analyzer Docker Runner${NC}"
echo "=================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found. Copying from .env.example...${NC}"
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit .env file with your configuration before running the application.${NC}"
fi

# Function to show usage
show_usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  start     Start the application (default)"
    echo "  stop      Stop the application"
    echo "  restart   Restart the application"
    echo "  logs      Show application logs"
    echo "  build     Build the Docker image"
    echo "  clean     Stop and remove containers, networks, and volumes"
    echo "  prod      Start with production profile (includes nginx)"
    echo "  help      Show this help message"
}

# Parse command line arguments
COMMAND=${1:-start}

case $COMMAND in
    start)
        echo -e "${GREEN}🚀 Starting Financial Analyzer...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ Application started successfully!${NC}"
        echo -e "${GREEN}📊 Access the application at: http://localhost:3001${NC}"
        ;;
    stop)
        echo -e "${YELLOW}🛑 Stopping Financial Analyzer...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Application stopped successfully!${NC}"
        ;;
    restart)
        echo -e "${YELLOW}🔄 Restarting Financial Analyzer...${NC}"
        docker-compose down
        docker-compose up -d
        echo -e "${GREEN}✅ Application restarted successfully!${NC}"
        ;;
    logs)
        echo -e "${GREEN}📋 Showing application logs...${NC}"
        docker-compose logs -f
        ;;
    build)
        echo -e "${GREEN}🔨 Building Docker image...${NC}"
        docker-compose build --no-cache
        echo -e "${GREEN}✅ Build completed successfully!${NC}"
        ;;
    clean)
        echo -e "${RED}🧹 Cleaning up containers, networks, and volumes...${NC}"
        docker-compose down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Cleanup completed successfully!${NC}"
        ;;
    prod)
        echo -e "${GREEN}🚀 Starting Financial Analyzer with production profile...${NC}"
        docker-compose --profile production up -d
        echo -e "${GREEN}✅ Application started with nginx proxy!${NC}"
        echo -e "${GREEN}🌐 Access the application at: http://localhost${NC}"
        ;;
    help)
        show_usage
        ;;
    *)
        echo -e "${RED}❌ Unknown command: $COMMAND${NC}"
        show_usage
        exit 1
        ;;
esac
