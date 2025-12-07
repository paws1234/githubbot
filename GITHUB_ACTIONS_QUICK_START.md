# GitHub Actions Quick Start

Get your CI/CD pipeline running in 2 minutes!

## ✅ Setup Instructions

### Step 1: Commit and Push the Workflows
```bash
git add .github/workflows/
git commit -m "Add GitHub Actions CI/CD pipeline"
git push origin main
```

### Step 2: Verify Workflows Active
1. Go to your repository on GitHub
2. Click **"Actions"** tab
3. You should see workflows:
   - ✅ CI/CD Tests
   - ✅ Build & Deploy
   - ✅ Code Quality & Analysis

### Step 3: Optional - Configure Secrets
For production ENCRYPTION_KEY (not needed for testing):
1. Go to **Settings → Secrets and variables → Actions**
2. Click **"New repository secret"**
3. Name: `ENCRYPTION_KEY`
4. Value: Your 64-character hex key
5. Click **Add secret**

---

## 🚀 How It Works

### On Every Push:
```
┌─ Run CI Tests
├─ Run Code Quality
├─ Run Security Scan
└─ If all pass and on main → Deploy
```

### Workflow Files:
- `.github/workflows/ci-test.yml` - Main test suite
- `.github/workflows/deploy.yml` - Deploy pipeline
- `.github/workflows/code-quality.yml` - Code analysis

---

## 📊 View Results

### See Test Results:
1. Push code: `git push`
2. Go to **Actions** tab
3. Click on the workflow run
4. Click on job to expand logs

### Download Reports:
1. Go to workflow run
2. Scroll to **Artifacts** section
3. Download `test-results-*` or `code-analysis-reports`

### Real-time Monitoring:
- Green ✅ = All tests passed
- Red ❌ = Some tests failed
- Yellow ⏳ = Tests running

---

## 🧪 What Gets Tested

### Syntax Validation
```javascript
✅ All .js files checked for syntax errors
✅ No parsing errors
✅ Valid JavaScript
```

### Dependencies
```javascript
✅ All packages installed
✅ No missing dependencies
✅ No critical vulnerabilities
```

### Database
```javascript
✅ PostgreSQL connection works
✅ Can execute queries
✅ Connection pooling functional
```

### Docker
```bash
✅ Docker image builds successfully
✅ No build errors
✅ Container starts without issues
```

### Security
```javascript
✅ No exposed secrets in code
✅ No hardcoded API keys
✅ No credential leaks
```

---

## 🐛 If Tests Fail

### Step 1: Check the Error
1. Go to failed workflow run
2. Click the red ❌ failed job
3. Expand the failed step
4. Read the error message

### Common Issues & Fixes:

**"node: file not found"**
```
Fix: Check file paths in test step
```

**"Cannot find module"**
```
Fix: Run npm ci locally: npm install
```

**"Database connection failed"**
```
Fix: PostgreSQL service might not be running in CI
```

**"Docker build failed"**
```
Fix: Check Dockerfile syntax
```

---

## ✨ Features

### Automatic Testing
- ✅ Every push tested
- ✅ Every PR tested
- ✅ No manual setup needed

### Multi-Node Support
- ✅ Tests on Node 18.x
- ✅ Tests on Node 20.x
- ✅ Ensures compatibility

### Detailed Reports
- ✅ Code quality metrics
- ✅ File size analysis
- ✅ Dependency check
- ✅ Complexity analysis

### Automatic Deployment
- ✅ Auto-builds Docker image
- ✅ Tags with commit SHA
- ✅ Ready for production

---

## 📈 Performance

### Test Execution Time
- **Syntax Check**: ~5s
- **Dependencies**: ~15s
- **Database Test**: ~10s
- **Docker Build**: ~30s
- **Total**: ~2-3 minutes per run

### Parallel Jobs
- Tests run on multiple Node versions in parallel
- Saves time vs sequential testing

---

## 🔔 Notifications

### Automatic Status Checks
Pull requests show:
- ✅ All checks passed - Ready to merge
- ❌ Some checks failed - Fix issues first
- ⏳ Checks running - Wait for completion

### PR Comments
Code quality reports automatically posted on PRs

### CI Status Badge
Add to README:
```markdown
[![CI/CD Tests](https://github.com/paws1234/githubbot/actions/workflows/ci-test.yml/badge.svg)](https://github.com/paws1234/githubbot/actions)
```

---

## 🎯 Best Practices

### 1. Keep Commits Clean
```bash
git commit -m "feat: add new feature"
git push  # Triggers tests
```

### 2. Check Tests Before Pushing
```bash
# Run locally first
npm audit
node --check src/index.js
```

### 3. Read Test Reports
- Download artifacts
- Review code quality metrics
- Fix issues before merge

### 4. Monitor main Branch
- main branch = production-ready
- Always require passing tests
- Review PR before merge

---

## 🚀 Next Steps

### Step 1: Make a Test Push
```bash
git add .github/workflows/
git commit -m "Add GitHub Actions CI/CD pipeline"
git push origin main
```

### Step 2: Check It Works
1. Go to Actions tab
2. Watch the workflow run
3. See all tests pass ✅

### Step 3: Make Changes Safely
- Create feature branch
- Make changes
- Push: Tests run automatically
- Fix any issues
- Create PR
- Code quality report posted
- Merge when ready

---

## 💡 Tips

### View Logs Locally (simulate CI)
```bash
# Test syntax
node --check src/index.js src/github.js src/gitlab.js

# Check dependencies
npm audit

# Build Docker
docker build -t test .
```

### Skip a Workflow (rare)
```bash
git commit -m "Update docs [skip ci]"
```

### Trigger Manually
1. Go to Actions tab
2. Select workflow
3. Click "Run workflow"
4. Choose branch
5. Click "Run workflow"

---

## 📚 Learn More

- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Actions Marketplace](https://github.com/marketplace?type=actions)

---

## ✅ Verification

After setup, you should see:

**In Actions tab:**
- ✅ CI/CD Tests (green check)
- ✅ Build & Deploy (green check)
- ✅ Code Quality & Analysis (green check)

**In PR:**
- ✅ "All checks passed" message
- ✅ Green checkmark next to commit

**Artifacts:**
- ✅ Can download test results
- ✅ Can download code analysis
- ✅ Can download deployment info

---

## 🎉 You're Done!

Your CI/CD pipeline is now fully automated!

Every push will:
1. ✅ Run tests
2. ✅ Check code quality
3. ✅ Scan for security issues
4. ✅ Build Docker image (on main)
5. ✅ Generate reports

Happy coding! 🚀

---

Last Updated: December 7, 2025
