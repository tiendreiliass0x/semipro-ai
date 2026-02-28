#!/bin/bash

# YenengaLabs - Start Script
# Starts PostgreSQL, backend, and frontend for local development

set -e

echo "Starting YenengaLabs..."
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"

# Check prerequisites
if ! command -v bun &> /dev/null; then
    echo -e "${RED}Bun is not installed${NC}"
    exit 1
fi

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed${NC}"
    exit 1
fi

cleanup() {
    echo ""
    echo "Shutting down servers..."
    pkill -f "bun server.ts" 2>/dev/null || true
    exit 0
}
trap cleanup INT TERM

# Start PostgreSQL
echo -e "${BLUE}Starting PostgreSQL...${NC}"
cd "$PROJECT_DIR"
docker compose up -d 2>/dev/null || docker start yenengalabs-postgres

echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if docker exec yenengalabs-postgres pg_isready -U yenengalabs &> /dev/null; then
        echo -e "${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}PostgreSQL failed to start after 30s${NC}"
        exit 1
    fi
    sleep 1
done

# Sync schema and seed
cd "$PROJECT_DIR/backend"
mkdir -p uploads
bun run db:push 2>&1 | tail -1
bun run seed 2>&1 | tail -1

# Start backend
echo ""
echo -e "${BLUE}Starting backend on port 3001...${NC}"
bun server.ts &
BACKEND_PID=$!
echo -e "${GREEN}Backend started (PID: $BACKEND_PID)${NC}"

echo "Waiting for backend to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo -e "${GREEN}Backend is ready${NC}"
        break
    fi
    sleep 0.5
done

# Start frontend
echo ""
echo -e "${BLUE}Starting frontend...${NC}"
cd "$PROJECT_DIR/app"

if [ ! -d "node_modules" ]; then
    echo "Installing frontend dependencies..."
    npm install
fi

echo -e "${YELLOW}Frontend: http://localhost:5173${NC}"
echo -e "${YELLOW}Backend:  http://localhost:3001${NC}"
echo -e "${YELLOW}Database: PostgreSQL localhost:5432${NC}"
echo ""
echo -e "${GREEN}Press Ctrl+C to stop${NC}"
echo ""

npm run dev
