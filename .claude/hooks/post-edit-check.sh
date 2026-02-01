#!/bin/bash
# post-edit-check.sh — Run TypeScript + ESLint after file edits
# Receives JSON on stdin from Claude Code PostToolUse hook
# Exit 0 = pass, Exit 2 = errors found (Claude must fix)

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Only check TypeScript/TSX files in the app directory
if [[ ! "$FILE_PATH" =~ \.(ts|tsx)$ ]]; then
  exit 0
fi

if [[ ! "$FILE_PATH" == *"eventflow-app/src/"* ]]; then
  exit 0
fi

APP_DIR="$CLAUDE_PROJECT_DIR/eventflow-app"
cd "$APP_DIR" || exit 0

ERRORS=""

# 1. ESLint on the specific file (fast, single-file)
LINT_OUTPUT=$(npx eslint "$FILE_PATH" --no-warn-ignored 2>&1)
if [ $? -ne 0 ]; then
  ERRORS="${ERRORS}=== ESLint Errors ===\n${LINT_OUTPUT}\n\n"
fi

# 2. TypeScript type-check (incremental, fast after first run)
TSC_OUTPUT=$(npx tsc -b --noEmit 2>&1)
if [ $? -ne 0 ]; then
  FILE_BASENAME=$(basename "$FILE_PATH")
  RELEVANT=$(echo "$TSC_OUTPUT" | grep -B1 -A2 "$FILE_BASENAME" | head -15)
  if [ -z "$RELEVANT" ]; then
    RELEVANT=$(echo "$TSC_OUTPUT" | head -10)
  fi
  ERRORS="${ERRORS}=== TypeScript Errors ===\n${RELEVANT}\n"
fi

if [ -n "$ERRORS" ]; then
  echo -e "Post-edit validation failed:\n$ERRORS" >&2
  echo "Fix these issues before continuing." >&2
  exit 2
fi

exit 0
