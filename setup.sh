#!/bin/bash
# SENTINEL SHIELD - PROFESSIONAL DEPLOYMENT SCRIPT

echo "🛡️ SENTINEL SHIELD INSTALLER"
echo "----------------------------"

# 1. Check for Docker
if ! [ -x "$(command -v docker)" ]; then
  echo "❌ Error: Docker is not installed. Please install Docker and try again."
  exit 1
fi

# 2. Setup Config
if [ ! -f .env ]; then
  echo "⚙️ Creating default configuration from template..."
  cp .env.example .env
  echo "✅ .env created. (Please edit it later to change your ADMIN_KEY)"
fi

# 3. Pull and Build
echo "🏗️ Building security perimeter..."
docker-compose build

# 4. Launch
echo "🚀 Sentinel Shield is going LIVE..."
docker-compose up -d

echo "----------------------------"
echo "✅ DEPLOYMENT SUCCESSFUL"
echo "Dashboard: http://localhost:8081/sentinel"
echo "Security Engine: ACTIVE"
