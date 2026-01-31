Push all changes to GitHub main and deploy to Firebase Hosting.

## Steps

1. **Check for changes** - Run `git status` in the project root to see if there are uncommitted changes.

2. **Stage and commit** - If there are changes:
   - Stage all relevant files (avoid committing `.env`, credentials, or `node_modules`)
   - Ask the user for a commit message, or suggest one based on the diff
   - Create the commit

3. **Push to main** - Push the current branch to `origin main`:
   ```bash
   git push origin main
   ```
   If the push fails due to upstream changes, inform the user and ask how to proceed.

4. **Build the app** - Run the build from the `eventflow-app` directory:
   ```bash
   cd /Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-app && npm run build
   ```
   If the build fails, stop and report the errors.

5. **Deploy to Firebase** - Deploy hosting from the `eventflow-app` directory:
   ```bash
   cd /Users/eliyawolfman/claude_brain/projects/eventflows/eventflow-app && firebase deploy --only hosting
   ```

6. **Report results** - Show the user:
   - Git commit hash and push status
   - Firebase hosting URL
   - Any warnings or errors encountered
