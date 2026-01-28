#!/bin/bash

# Migration Application Script
# Purpose: Apply pending migrations to Supabase database
# Phase: 03-dynamic-template-system, Plan: 01
#
# This script was created as a workaround for MCP tool unavailability during GSD execution.

set -e

PROJECT_ID="byhohetafnhlakqbydbj"
MIGRATION_FILE="${1:-supabase/migrations/20260128000002_seed_reminder_templates.sql}"

echo "EventFlow AI - Migration Application"
echo "===================================="
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "Error: Supabase CLI is not installed"
    echo "Install it: brew install supabase/tap/supabase"
    exit 1
fi

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo "Error: Not authenticated with Supabase"
    echo "Please run: supabase login"
    exit 1
fi

echo "Applying migration: $MIGRATION_FILE"
echo ""

# Read the SQL file and execute it
SQL_CONTENT=$(cat "$MIGRATION_FILE")

# Use psql through Supabase CLI
echo "$SQL_CONTENT" | supabase db execute --project-ref "$PROJECT_ID"

if [ $? -eq 0 ]; then
    echo ""
    echo "✓ Migration applied successfully!"
else
    echo ""
    echo "✗ Migration failed"
    exit 1
fi
