#!/bin/bash
# bash-guard.sh — Block dangerous bash commands + pre-commit validation
# Receives JSON on stdin from Claude Code PreToolUse hook
# Exit 0 = allow, Exit 2 = block with stderr message

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

if [ -z "$COMMAND" ]; then
  exit 0
fi

CMD_LOWER=$(echo "$COMMAND" | tr '[:upper:]' '[:lower:]')

# === DANGEROUS COMMAND PATTERNS ===

# Destructive file operations
if echo "$CMD_LOWER" | grep -qE 'rm\s+(-[a-z]*f[a-z]*\s+)?(/|~|\.\.)'; then
  echo "BLOCKED: Destructive rm command targeting root/home/parent directory." >&2
  exit 2
fi

# Destructive git operations
if echo "$CMD_LOWER" | grep -qE 'git\s+push\s+(-[a-z]*f|--force)'; then
  echo "BLOCKED: git push --force is not allowed. Use --force-with-lease if needed." >&2
  exit 2
fi
if echo "$CMD_LOWER" | grep -qE 'git\s+reset\s+--hard'; then
  echo "BLOCKED: git reset --hard can destroy work. Use git stash instead." >&2
  exit 2
fi
if echo "$CMD_LOWER" | grep -qE 'git\s+clean\s+-[a-z]*f'; then
  echo "BLOCKED: git clean -f permanently deletes untracked files." >&2
  exit 2
fi

# Destructive SQL
if echo "$CMD_LOWER" | grep -qiE '(drop\s+table|drop\s+database|truncate\s)'; then
  echo "BLOCKED: Destructive SQL command. Use Supabase migrations for schema changes." >&2
  exit 2
fi

# Dangerous publishing/deployment
if echo "$CMD_LOWER" | grep -qE 'npm\s+publish'; then
  echo "BLOCKED: npm publish not allowed from Claude Code." >&2
  exit 2
fi

# Pipe to shell (remote code execution)
if echo "$CMD_LOWER" | grep -qE '(curl|wget).*\|\s*(ba)?sh'; then
  echo "BLOCKED: Piping downloads to shell is not allowed." >&2
  exit 2
fi

# Dangerous permissions
if echo "$CMD_LOWER" | grep -qE 'chmod\s+777'; then
  echo "BLOCKED: chmod 777 is a security risk. Use specific permissions." >&2
  exit 2
fi

# === PRE-COMMIT VALIDATION ===
# If the command is a git commit, run full validation first

if echo "$COMMAND" | grep -qE '^git\s+commit'; then
  APP_DIR="$CLAUDE_PROJECT_DIR/eventflow-app"

  if [ ! -d "$APP_DIR" ]; then
    exit 0
  fi

  cd "$APP_DIR" || exit 0

  # 1. TypeScript type-check
  TSC_OUTPUT=$(npx tsc -b --noEmit 2>&1)
  if [ $? -ne 0 ]; then
    echo "COMMIT BLOCKED: TypeScript errors found. Fix before committing:" >&2
    echo "$TSC_OUTPUT" | head -20 >&2
    exit 2
  fi

  # 2. ESLint
  LINT_OUTPUT=$(npx eslint src/ --no-warn-ignored 2>&1)
  if [ $? -ne 0 ]; then
    echo "COMMIT BLOCKED: ESLint errors found. Fix before committing:" >&2
    echo "$LINT_OUTPUT" | head -20 >&2
    exit 2
  fi

  # 3. Unit tests (if vitest is installed)
  if [ -f "node_modules/.bin/vitest" ]; then
    TEST_OUTPUT=$(npx vitest run --reporter=verbose 2>&1)
    if [ $? -ne 0 ]; then
      echo "COMMIT BLOCKED: Unit tests failed. Fix before committing:" >&2
      echo "$TEST_OUTPUT" | tail -20 >&2
      exit 2
    fi
  fi
fi

exit 0
