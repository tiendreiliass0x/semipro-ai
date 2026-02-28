#!/bin/bash

# YenengaLabs - Deployment Prep Script
# Builds frontend assets, starts PostgreSQL, and syncs database schema.

set -e

echo "YenengaLabs - Deployment"
echo "=============================================="

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -d "$SCRIPT_DIR/app" ] && [ -d "$SCRIPT_DIR/backend" ]; then
    PROJECT_DIR="$SCRIPT_DIR"
elif [ -d "$(dirname "$SCRIPT_DIR")/app" ] && [ -d "$(dirname "$SCRIPT_DIR")/backend" ]; then
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
else
    echo -e "${RED}Could not determine project directory from script location${NC}"
    exit 1
fi

# Check prerequisites
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}Node.js version: $(node --version)${NC}"

if ! command -v bun &> /dev/null; then
    echo -e "${RED}Bun is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}Bun version: $(bun --version)${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}Docker: $(docker --version)${NC}"

# Start PostgreSQL
echo ""
echo "Starting PostgreSQL..."
cd "$PROJECT_DIR"
docker compose up -d --no-recreate 2>/dev/null || docker start yenengalabs-postgres

echo "Waiting for PostgreSQL..."
for i in $(seq 1 30); do
    if docker compose exec -T postgres pg_isready -U yenengalabs &> /dev/null; then
        echo -e "${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}PostgreSQL failed to start after 30s${NC}"
        exit 1
    fi
    sleep 1
done

# Build frontend
echo ""
echo "Building frontend..."
cd "$PROJECT_DIR/app"

if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

npm run build
echo -e "${GREEN}Frontend built successfully${NC}"

# Setup backend
echo ""
echo "Setting up backend..."
cd "$PROJECT_DIR/backend"
mkdir -p uploads

bun run db:push
bun run seed

echo -e "${GREEN}Backend ready${NC}"

# Summary
echo ""
echo "=============================================="
echo -e "${GREEN}Deployment preparation complete!${NC}"
echo ""
echo "To start the application:"
echo ""
echo "  1. Start the backend:"
echo "     cd backend && bun run start"
echo ""
echo "  2. Serve the frontend (in another terminal):"
echo "     cd app/dist && npx serve -s . -l 5173"
echo ""
echo "  Database: PostgreSQL (localhost:5432/yenengalabs)"
echo "  Frontend: app/dist/"
echo "  Uploads:  backend/uploads/"
echo ""
