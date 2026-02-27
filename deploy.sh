#!/bin/bash

# YenengaLabs - Deployment Prep Script
# Builds frontend assets and validates backend runtime prerequisites.

set -e

echo "YenengaLabs - Deployment"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Resolve project directory whether this script is at repo root
# (./deploy.sh) or inside a nested folder (e.g., ./scripts/deploy.sh).
if [ -d "$SCRIPT_DIR/app" ] && [ -d "$SCRIPT_DIR/backend" ]; then
    PROJECT_DIR="$SCRIPT_DIR"
elif [ -d "$(dirname "$SCRIPT_DIR")/app" ] && [ -d "$(dirname "$SCRIPT_DIR")/backend" ]; then
    PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
else
    echo -e "${RED}❌ Could not determine project directory from script location${NC}"
    exit 1
fi

# Check if Node.js is installed (frontend build tooling)
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js version: $(node --version)${NC}"

# Check if Bun is installed (backend runtime)
if ! command -v bun &> /dev/null; then
    echo -e "${RED}❌ Bun is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Bun version: $(bun --version)${NC}"

read_env_value() {
    local file="$1"
    local key="$2"
    local line=""

    if [ ! -f "$file" ]; then
        return 1
    fi

    line="$(grep -E "^${key}=" "$file" | tail -n 1 || true)"
    if [ -z "$line" ]; then
        return 1
    fi

    line="${line#*=}"
    line="${line%$'\r'}"
    line="${line%\"}"
    line="${line#\"}"
    line="${line%\'}"
    line="${line#\'}"
    printf "%s" "$line"
}

# Build frontend
echo ""
echo "📦 Building frontend..."
cd "$PROJECT_DIR/app"

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build
npm run build

echo -e "${GREEN}✓ Frontend built successfully${NC}"

# Check backend
echo ""
echo "🔧 Checking backend..."
cd "$PROJECT_DIR/backend"

# Start local docker services when queue settings indicate local BullMQ/Redis.
ENV_FILE="$PROJECT_DIR/backend/.env"
QUEUE_PROVIDER_VALUE="${QUEUE_PROVIDER:-}"
REDIS_URL_VALUE="${REDIS_URL:-}"

if [ -z "$QUEUE_PROVIDER_VALUE" ]; then
    QUEUE_PROVIDER_VALUE="$(read_env_value "$ENV_FILE" "QUEUE_PROVIDER" || true)"
fi
if [ -z "$QUEUE_PROVIDER_VALUE" ]; then
    QUEUE_PROVIDER_VALUE="auto"
fi
if [ -z "$REDIS_URL_VALUE" ]; then
    REDIS_URL_VALUE="$(read_env_value "$ENV_FILE" "REDIS_URL" || true)"
fi

SHOULD_START_DOCKER_SERVICES="false"
if [ "$QUEUE_PROVIDER_VALUE" = "bullmq" ]; then
    SHOULD_START_DOCKER_SERVICES="true"
elif [ "$QUEUE_PROVIDER_VALUE" = "auto" ]; then
    if [[ "$REDIS_URL_VALUE" == redis://127.0.0.1:* || "$REDIS_URL_VALUE" == redis://localhost:* ]]; then
        SHOULD_START_DOCKER_SERVICES="true"
    fi
fi

if [ "$SHOULD_START_DOCKER_SERVICES" = "true" ]; then
    if [ ! -f "$PROJECT_DIR/docker-compose.yml" ]; then
        echo -e "${YELLOW}⚠ docker-compose.yml not found; skipping local service startup${NC}"
    elif ! command -v docker &> /dev/null; then
        if [ "$QUEUE_PROVIDER_VALUE" = "bullmq" ]; then
            echo -e "${RED}❌ Docker is required for QUEUE_PROVIDER=bullmq and was not found${NC}"
            exit 1
        fi
        echo -e "${YELLOW}⚠ Docker not found; skipping local service startup${NC}"
    elif ! docker compose version > /dev/null 2>&1; then
        if [ "$QUEUE_PROVIDER_VALUE" = "bullmq" ]; then
            echo -e "${RED}❌ docker compose is required for QUEUE_PROVIDER=bullmq and is not available${NC}"
            exit 1
        fi
        echo -e "${YELLOW}⚠ docker compose not available; skipping local service startup${NC}"
    else
        echo "🐳 Starting local docker services..."
        (cd "$PROJECT_DIR" && docker compose up -d)
        echo -e "${GREEN}✓ Docker services are running${NC}"
    fi
fi

# Create data files if they don't exist
if [ ! -f "data/anecdotes.json" ]; then
    echo "[]" > data/anecdotes.json
    echo -e "${YELLOW}⚠ Created empty anecdotes.json${NC}"
fi

if [ ! -f "data/subscribers.json" ]; then
    echo "[]" > data/subscribers.json
    echo -e "${YELLOW}⚠ Created empty subscribers.json${NC}"
fi

# Create uploads directory
mkdir -p uploads

# Run migrations
bun run migrate >/dev/null 2>&1 || true

echo -e "${GREEN}✓ Backend ready${NC}"

# Summary
echo ""
echo "=============================================="
echo -e "${GREEN}✅ Deployment preparation complete!${NC}"
echo ""
echo "To start the application:"
echo ""
echo "  1. Start the backend:"
echo "     cd backend && bun run start"
echo ""
echo "  2. Serve the frontend (in another terminal):"
echo "     cd app/dist && npx serve -s . -l 5173"
echo ""
echo "  Or use a static file server like nginx, Apache, or Vercel."
echo ""
echo "📁 Frontend build: app/dist/"
echo "📁 Backend data:   backend/data/"
echo "📁 Uploads:        backend/uploads/"
echo ""
