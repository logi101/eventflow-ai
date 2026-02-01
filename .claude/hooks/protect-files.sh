#!/bin/bash
# protect-files.sh — Block edits to protected files
# Receives JSON on stdin from Claude Code PreToolUse hook
# Exit 0 = allow, Exit 2 = block with stderr message

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

BASENAME=$(basename "$FILE_PATH")

# Protected exact filenames
case "$BASENAME" in
  .env|.env.local|.env.production|.env.development)
    echo "BLOCKED: Cannot edit $BASENAME — environment files are protected." >&2
    exit 2
    ;;
  package-lock.json)
    echo "BLOCKED: Cannot edit package-lock.json — use npm install instead." >&2
    exit 2
    ;;
  firebase.json|.firebaserc)
    echo "BLOCKED: Cannot edit $BASENAME — Firebase config is protected." >&2
    exit 2
    ;;
esac

# Protected directory patterns
if echo "$FILE_PATH" | grep -qE '(node_modules/|\.git/)'; then
  echo "BLOCKED: Cannot edit files in node_modules/ or .git/" >&2
  exit 2
fi

exit 0
