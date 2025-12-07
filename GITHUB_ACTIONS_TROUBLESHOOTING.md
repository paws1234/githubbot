# GitHub Actions Troubleshooting Guide

## 🔴 Common Issues & Solutions

### Issue 1: Workflow Not Triggering

**Symptom:** Pushed code but nothing shows in Actions tab

**Solutions:**
1. Check workflow files are in `.github/workflows/` directory
   ```bash
   ls -la .github/workflows/
   # Should show: ci-test.yml, deploy.yml, code-quality.yml
   ```

2. Verify file is committed and pushed
   ```bash
   git log --name-only | grep ".github"
   ```

3. Check branch matches trigger
   - Edit workflow file
   - Look for: `on: push: branches: [ main, develop ]`
   - Make sure you're pushing to that branch

4. Wait a moment
   - GitHub Actions can take 10-30 seconds to start
   - Refresh the Actions tab

---

### Issue 2: "Setup Node.js" Step Fails

**Symptom:** 
```
✗ Set up Node.js 18.x
  Error: Node version not found
```

**Solutions:**
1. Verify Node versions are supported
   ```yaml
   # In ci-test.yml, check:
   matrix:
     node-version: [18.x, 20.x]
   ```

2. Use valid Node versions
   ```yaml
   # Valid: 18.x, 20.x, 21.x
   # Invalid: 18, node-18
   ```

3. Update to latest Node if needed
   ```yaml
   node-version: [18.x, 20.x, 21.x]
   ```

---

### Issue 3: "npm ci" Fails

**Symptom:**
```
✗ Install dependencies
  npm ERR! code ERESOLVE
```

**Solutions:**
1. Update package-lock.json locally
   ```bash
   rm package-lock.json
   npm install
   git add package-lock.json
   git commit -m "Update dependencies"
   git push
   ```

2. Check for duplicate packages
   ```bash
   npm ls
   ```

3. Clear npm cache in workflow (edit ci-test.yml)
   ```yaml
   - name: Clear npm cache
     run: npm cache clean --force
   
   - name: Install dependencies
     run: npm ci
   ```

---

### Issue 4: Database Connection Fails

**Symptom:**
```
❌ Test database connection
  Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Cause:** PostgreSQL service not running

**Solutions:**
1. Verify PostgreSQL service configuration in workflow
   ```yaml
   services:
     postgres:
       image: postgres:15-alpine
       options: >-
         --health-cmd pg_isready
         --health-interval 10s
   ```

2. Check environment variables in test step
   ```yaml
   env:
     DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test
   ```

3. Add explicit wait for service
   ```yaml
   - name: Wait for PostgreSQL
     run: |
       until nc -z localhost 5432; do
         echo 'Waiting for PostgreSQL...'
         sleep 1
       done
   ```

---

### Issue 5: Syntax Check Fails

**Symptom:**
```
❌ Check code syntax
  Error in src/index.js: Line 42: Unexpected token
```

**Solutions:**
1. Run syntax check locally
   ```bash
   node --check src/index.js
   node --check src/github.js
   ```

2. Look for common syntax errors:
   - Missing closing bracket: `{ } )`
   - Syntax error in arrow function: `() =>` vs `() -> `
   - Missing colon in object: `{ key value }`

3. Fix locally, then push
   ```bash
   npm install
   node --check src/*.js
   git add src/
   git commit -m "Fix syntax errors"
   git push
   ```

---

### Issue 6: Docker Build Fails

**Symptom:**
```
❌ Docker build test
  Error: COPY failed: file not found
```

**Solutions:**
1. Verify Dockerfile COPY paths
   ```dockerfile
   COPY package*.json ./
   COPY src/ ./src/
   ```

2. Check all files exist
   ```bash
   ls package.json
   ls -la src/
   ```

3. Build locally first
   ```bash
   docker build -t test .
   # Should succeed before pushing
   ```

4. Check Node version in Dockerfile
   ```dockerfile
   FROM node:20-alpine  # Should match CI Node version
   ```

---

### Issue 7: Insufficient Permissions

**Symptom:**
```
❌ Couldn't read from remote repository
  fatal: You don't have permission
```

**Solutions:**
1. Ensure GitHub token has permissions
   - Settings → Tokens → Fine-grained tokens
   - Select token
   - Verify "Actions" scope

2. Check workflow file permissions
   ```yaml
   permissions:
     contents: read
     packages: write
   ```

3. Use GitHub's default token (usually works)
   ```yaml
   - uses: actions/checkout@v4
     # Uses ${{ secrets.GITHUB_TOKEN }} automatically
   ```

---

### Issue 8: Artifact Upload Fails

**Symptom:**
```
❌ Upload test results
  Error: No files found in path
```

**Solutions:**
1. Verify test script creates file
   ```yaml
   - name: Generate report
     run: echo "test" > report.md
   
   - name: Upload
     uses: actions/upload-artifact@v4
     with:
       name: results
       path: report.md  # Must exist
   ```

2. Check file path is correct
   ```bash
   # File path must be relative to repo root
   pwd
   ls report.md
   ```

3. Create directory if needed
   ```yaml
   - name: Create artifacts
     run: mkdir -p artifacts && echo "test" > artifacts/report.md
   ```

---

### Issue 9: Environment Variables Not Set

**Symptom:**
```
❌ Test failed
  process.env.DATABASE_URL is undefined
```

**Solutions:**
1. Verify env vars set in step
   ```yaml
   - name: Run test
     env:
       DATABASE_URL: postgresql://...
     run: npm test
   ```

2. Add env vars to workflow level
   ```yaml
   jobs:
     test:
       env:
         SHARED_VAR: value
   ```

3. Check for typos
   ```yaml
   # Wrong
   DATABASE_URL: $DATABASE_URL
   
   # Correct
   DATABASE_URL: postgresql://...
   ```

---

### Issue 10: Timeout Exceeded

**Symptom:**
```
❌ Timeout: Job exceeded maximum execution time
```

**Solutions:**
1. Increase timeout in workflow (max 360 minutes)
   ```yaml
   jobs:
     test:
       timeout-minutes: 10  # Default is 360
   ```

2. Check for long-running operations
   ```bash
   # Move slow tests to separate job
   # Add --fast flag to tests
   ```

3. Optimize Docker build
   ```dockerfile
   # Add .dockerignore
   # Cache layers efficiently
   ```

---

## ⚡ Quick Diagnostics

### Check Workflow Syntax
```bash
# Use online validator
# https://github.com/rhysd/actionlint
```

### View Full Logs
1. Go to Actions tab
2. Click workflow run
3. Expand any step
4. See full output

### Run Workflow Manually
1. Actions tab
2. Select workflow
3. "Run workflow"
4. Choose branch
5. Click "Run workflow"

### Re-run Failed Jobs
1. Failed run page
2. "Re-run jobs"
3. Select jobs to re-run
4. Watch logs

---

## 🔧 Debugging Tips

### Add Debug Output
```yaml
- name: Debug step
  run: |
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Current dir: $(pwd)"
    echo "Files: $(ls -la)"
    env | grep -i database
```

### Test Locally First
```bash
# Before pushing, verify locally
npm install
npm audit
node --check src/index.js
docker build -t test .
```

### Check Workflow File
```bash
# Validate YAML syntax
python -m yaml .github/workflows/ci-test.yml
```

### Monitor in Real-Time
1. Push code
2. Go to Actions tab
3. Click on running workflow
4. Watch logs update in real-time

---

## 📝 Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `Node version not found` | Invalid version format | Use X.X or X.x format |
| `ECONNREFUSED` | Service not running | Add service/wait step |
| `file not found` | Wrong path | Check relative paths |
| `ERESOLVE` | Dependency conflict | Update package-lock.json |
| `timeout` | Test taking too long | Increase timeout minutes |
| `Permission denied` | File permissions | Check token scopes |
| `Syntax error` | Invalid JavaScript | Run `node --check` locally |
| `Module not found` | Missing package | Run `npm install` |

---

## ✅ Verification Checklist

Before investigating:
- [ ] Committed `.github/workflows/` files
- [ ] Pushed to correct branch (main/develop)
- [ ] Waited 30+ seconds for workflow to start
- [ ] Checked branch protection rules
- [ ] Verified GitHub token permissions
- [ ] Tested locally first
- [ ] No hardcoded secrets in files

---

## 📞 Getting Help

### Check GitHub Docs
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Common Issues](https://docs.github.com/en/actions/managing-workflow-runs/troubleshooting-workflow-runs)

### View Community Solutions
- Search GitHub Issues: "actions" + error message
- Stack Overflow: tag `github-actions`
- GitHub Discussions: Community support

### Local Testing
```bash
# Install act to run workflows locally
# https://github.com/nektos/act

act push
act pull_request
```

---

## 🎯 Prevention Tips

1. **Always test locally first**
   ```bash
   node --check src/*.js
   npm audit
   docker build .
   ```

2. **Keep workflows simple**
   - One job per concern
   - Clear step names
   - Good error messages

3. **Use logging**
   ```yaml
   - run: echo "✅ Step completed"
   ```

4. **Monitor main branch**
   - Check Actions tab regularly
   - Review failed runs
   - Fix issues promptly

---

Last Updated: December 7, 2025
For GitHub Actions Version: Latest (2024)
