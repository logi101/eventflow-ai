#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════════════════╗
# ║                                                                              ║
# ║   EventFlow AI - Complete Project Initializer                                ║
# ║   מערכת הפקת אירועים חכמה מקצה לקצה                                          ║
# ║                                                                              ║
# ║   Version: 2.0.0                                                             ║
# ║   Usage: bash init-eventflow.sh [project-name]                               ║
# ║                                                                              ║
# ╚══════════════════════════════════════════════════════════════════════════════╝

set -e

PROJECT_NAME=${1:-eventflow-ai}

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    🎯 EventFlow AI - Complete Setup                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""

# ════════════════════════════════════════════════════════════════════════════════
# STEP 1: Create Vite Project
# ════════════════════════════════════════════════════════════════════════════════
echo "🚀 [1/6] Creating project..."
npm create vite@latest "$PROJECT_NAME" -- --template react-ts
cd "$PROJECT_NAME" || exit

# ════════════════════════════════════════════════════════════════════════════════
# STEP 2: Install Dependencies
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "📦 [2/6] Installing dependencies..."
npm install -D tailwindcss postcss autoprefixer @types/node @types/crypto-js @types/papaparse
npm install @tanstack/react-query @tanstack/react-table @supabase/supabase-js zod react-hook-form @hookform/resolvers lucide-react react-router-dom clsx tailwind-merge class-variance-authority date-fns date-fns-tz xlsx papaparse qrcode.react html5-qrcode crypto-js
npx tailwindcss init -p

# ════════════════════════════════════════════════════════════════════════════════
# STEP 3: Create Directory Structure
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "📂 [3/6] Creating folder structure..."

mkdir -p .ai/commands
mkdir -p src/app/routes
mkdir -p src/components/{ui,shared,layouts,forms}

for module in events participants vendors checklist communication schedules checkin feedback ai-chat dashboard reports; do
  mkdir -p src/modules/$module/{components,hooks,api}
done

mkdir -p src/{hooks,schemas,types,utils,config,contexts}
mkdir -p src/lib/{integrations,encryption}
mkdir -p supabase/{migrations,seed}
mkdir -p supabase/functions/{send-whatsapp,send-reminder,ai-chat,generate-checklist,sync-calendar,_shared}
mkdir -p docs/{api,guides}
mkdir -p public/{images,icons}

# ════════════════════════════════════════════════════════════════════════════════
# STEP 4: Create Configuration Files
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "⚙️  [4/6] Creating configuration..."

# tsconfig.json
cat > tsconfig.json << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
TSCONFIG

# vite.config.ts
cat > vite.config.ts << 'VITECONFIG'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") }
  }
})
VITECONFIG

# tailwind.config.js
cat > tailwind.config.js << 'TAILWIND'
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: { sans: ['Heebo', 'sans-serif'] },
      colors: {
        primary: { 50: '#f0f9ff', 100: '#e0f2fe', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1' }
      }
    }
  },
  plugins: []
}
TAILWIND

# src/globals.css
cat > src/globals.css << 'GLOBALCSS'
@import url('https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700&display=swap');
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html { direction: rtl; }
  body { @apply bg-white text-gray-900 font-sans; }
}
GLOBALCSS

# .env.example
cat > .env.example << 'ENVEXAMPLE'
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Green API (WhatsApp) - הגדר ב-Supabase Edge Functions
# VITE_GREEN_API_INSTANCE=your-instance
# VITE_GREEN_API_TOKEN=your-token

# הצפנה
ENCRYPTION_KEY=your-32-char-encryption-key-here
ENVEXAMPLE

# ════════════════════════════════════════════════════════════════════════════════
# STEP 5: Create AI Context Files
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "🧠 [5/6] Creating AI context..."

cat > .ai-context.md << 'AICONTEXT'
# 🧠 AI Context - EventFlow AI

## 🎯 Project Vision
מערכת הפקת אירועים חכמה מקצה לקצה.
**עיקרון מנחה: המערכת ממליצה - המשתמש מחליט.**

## 🛠 Tech Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 19 + TypeScript + Vite + TailwindCSS |
| State | TanStack Query |
| Backend | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI | Gemini API |
| WhatsApp | Green API |
| Validation | Zod |

## 📁 Structure
```
src/modules/         # Feature modules
  events/            # ניהול אירועים
  participants/      # משתתפים + בני זוג
  vendors/           # ספקים + הצעות מחיר
  checklist/         # צ'קליסט דינמי
  communication/     # WhatsApp + תזכורות
  schedules/         # תוכניות אישיות
  checkin/           # Check-in + QR
  feedback/          # משוב + למידה
  ai-chat/           # צ'אט AI
  dashboard/         # Dashboard בזמן אמת
```

## ⚡ Rules
1. Schema First - Zod before components
2. No `any` - use `z.infer`
3. RTL First - Hebrew support
4. Edge Functions for secrets

## 📅 Roadmap
- Phase 1 (04/02): מערכת ביצוע
- Phase 2 (25/02): תכנון חכם
- Phase 3 (18/03): ניהול ספקים
- Phase 4 (08/04): סיכום ולמידה
- Phase 5 (29/04): Premium
AICONTEXT

cat > docs/roadmap.md << 'ROADMAP'
# 🗺️ EventFlow AI - Roadmap

## Phase 1: מערכת ביצוע (עד 04/02/2026) - 6,500 ₪
- [ ] דף רישום למשתתפים
- [ ] ייבוא מ-Excel
- [ ] תוכניות אישיות
- [ ] WhatsApp הזמנות ותזכורות

## Phase 2: תכנון חכם (עד 25/02/2026) - 4,000 ₪
- [ ] ממשק צ'אט AI
- [ ] זיהוי סוג אירוע
- [ ] צ'קליסט דינמי

## Phase 3: ניהול ספקים (עד 18/03/2026) - 3,500 ₪
- [ ] מאגר ספקים
- [ ] הצעות מחיר
- [ ] דירוג ספקים

## Phase 4: סיכום ולמידה (עד 08/04/2026) - 3,000 ₪
- [ ] סקרי משוב
- [ ] סיכום עצמי
- [ ] Follow-up

## Phase 5: Premium (עד 29/04/2026) - 3,000 ₪
- [ ] Check-in QR
- [ ] תשלומים
- [ ] Calendar sync
ROADMAP

# ════════════════════════════════════════════════════════════════════════════════
# STEP 6: Create Core Source Files
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "📝 [6/6] Creating source files..."

# src/lib/utils.ts
cat > src/lib/utils.ts << 'UTILS'
import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string, locale = 'he-IL'): string {
  return new Date(date).toLocaleDateString(locale, {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

export function formatTime(date: Date | string, locale = 'he-IL'): string {
  return new Date(date).toLocaleTimeString(locale, {
    hour: '2-digit', minute: '2-digit'
  })
}

export function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('0')) {
    cleaned = '972' + cleaned.slice(1)
  }
  return cleaned
}
UTILS

# src/lib/supabase.ts
cat > src/lib/supabase.ts << 'SUPABASE'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
)
SUPABASE

# src/main.tsx
cat > src/main.tsx << 'MAINTSX'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './globals.css'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 1000 * 60 * 5, retry: 1 } }
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
)
MAINTSX

# src/App.tsx
cat > src/App.tsx << 'APPTSX'
import { Routes, Route } from 'react-router-dom'

function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">EventFlow AI 🎯</h1>
        <p className="text-xl text-gray-600 mb-8">מערכת הפקת אירועים חכמה</p>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-semibold mb-4">✅ השלד מוכן!</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700">
            <li>הגדר .env מהדוגמה</li>
            <li>צור פרויקט Supabase והרץ את הסכמה</li>
            <li>npm run dev</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
    </Routes>
  )
}
APPTSX

# Clean up
rm -f src/App.css src/index.css 2>/dev/null

# ════════════════════════════════════════════════════════════════════════════════
# DONE
# ════════════════════════════════════════════════════════════════════════════════
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                    ✅ EventFlow AI Created Successfully!                     ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📁 Structure created with $(find . -type d | wc -l) directories"
echo ""
echo "👉 Next steps:"
echo ""
echo "   1. cd $PROJECT_NAME"
echo "   2. cp .env.example .env  # Fill in your keys"
echo "   3. Create Supabase project & run migrations"
echo "   4. npm run dev"
echo ""
echo "📄 SQL files to run in Supabase:"
echo "   - schema.sql (from scaffold)"
echo "   - seed.sql (from scaffold)"
echo ""
echo "🎯 Start with Claude Code:"
echo '   "טען .ai-context.md - בוא נתחיל בשלב 1"'
echo ""
