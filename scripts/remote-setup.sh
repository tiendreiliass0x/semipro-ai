#!/bin/bash

# YenengaLabs - Remote Server Setup
# Ensures Docker + PostgreSQL are running and schema is synced.
# Run on the server after deploying code.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

DEPLOY_DIR="/var/www/semipro-ai"

echo "YenengaLabs - Remote Setup"
echo "=============================================="

# 1. Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed.${NC}"
    echo "Install with: curl -fsSL https://get.docker.com | sh"
    exit 1
fi
echo -e "${GREEN}Docker: $(docker --version)${NC}"

if ! docker info &> /dev/null; then
    echo -e "${RED}Docker daemon is not running.${NC}"
    echo "Start with: sudo systemctl start docker"
    exit 1
fi

# 2. Start PostgreSQL via Docker Compose
echo ""
echo "Starting PostgreSQL..."
cd "$DEPLOY_DIR"

if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}docker-compose.yml not found in $DEPLOY_DIR${NC}"
    exit 1
fi

docker compose up -d

# 3. Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to accept connections..."
for i in {1..30}; do
    if docker compose exec -T postgres pg_isready -U yenengalabs &> /dev/null; then
        echo -e "${GREEN}PostgreSQL is ready${NC}"
        break
    fi
    if [ "$i" -eq 30 ]; then
        echo -e "${RED}PostgreSQL failed to start after 30s${NC}"
        docker compose logs postgres
        exit 1
    fi
    sleep 1
done

# 4. Ensure Bun is available
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

if ! command -v bun &> /dev/null; then
    echo "Installing Bun..."
    curl -fsSL https://bun.sh/install | bash
    export PATH="$BUN_INSTALL/bin:$PATH"
fi

# 5. Sync schema + seed data
cd "$DEPLOY_DIR/backend"
echo ""
echo "Syncing database schema..."
bun run db:push

echo "Seeding data (if tables are empty)..."
bun run seed

echo ""
echo "=============================================="
echo -e "${GREEN}Remote setup complete!${NC}"
echo -e "  PostgreSQL: localhost:5432"
echo -e "  Database:   yenengalabs"
