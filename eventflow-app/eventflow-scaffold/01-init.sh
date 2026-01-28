#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                                                                              ║
# ║   EventFlow AI - Complete Project Initializer                                ║
# ║   מערכת הפקת אירועים חכמה מקצה לקצה                                          ║
# ║                                                                              ║
# ║   Version: 2.0.0                                                             ║
# ║   Based on: EventFlow AI Technical Specification                             ║
# ║                                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝
#
# Usage: bash init-eventflow.sh [project-name]
# Default name: eventflow-ai

set -e

PROJECT_NAME=${1:-eventflow-ai}

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    🎯 EventFlow AI - Complete Setup                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📦 Project: $PROJECT_NAME"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ════════════════════════════════════════════════════════════════════════════════
# STEP 1: Create Vite Project
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "🚀 [1/6] Creating Vite React TypeScript project..."
npm create vite@latest "$PROJECT_NAME" -- --template react-ts
cd "$PROJECT_NAME" || exit

# ════════════════════════════════════════════════════════════════════════════════
# STEP 2: Install All Dependencies
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "📦 [2/6] Installing dependencies..."

npm install -D \
  tailwindcss postcss autoprefixer \
  @types/node @types/crypto-js @types/papaparse

npm install \
  @tanstack/react-query @tanstack/react-table \
  @supabase/supabase-js \
  zod react-hook-form @hookform/resolvers \
  lucide-react react-router-dom \
  clsx tailwind-merge class-variance-authority \
  date-fns date-fns-tz \
  xlsx papaparse \
  qrcode.react html5-qrcode \
  crypto-js

npx tailwindcss init -p

# ════════════════════════════════════════════════════════════════════════════════
# STEP 3: Create Complete Directory Structure  
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "📂 [3/6] Creating folder structure..."

# AI Context
mkdir -p .ai/commands

# App
mkdir -p src/app/routes

# Components
mkdir -p src/components/{ui,shared,layouts,forms}

# Feature Modules
for module in events participants vendors checklist communication schedules checkin feedback ai-chat dashboard reports; do
  mkdir -p src/modules/$module/{components,hooks,api}
done

# Core
mkdir -p src/{hooks,schemas,types,utils,config,contexts}
mkdir -p src/lib/{integrations,encryption}

# Supabase
mkdir -p supabase/{migrations,seed}
mkdir -p supabase/functions/{send-whatsapp,send-reminder,ai-chat,process-webhook,generate-checklist,sync-calendar,send-email,_shared}

# Docs & Public
mkdir -p docs/{api,guides}
mkdir -p public/{images,icons}

echo "✅ Created $(find src -type d | wc -l) directories"
