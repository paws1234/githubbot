# GitHub Actions CI/CD Pipeline

This project includes a comprehensive GitHub Actions pipeline that automatically tests and validates the code on every push and pull request.

## 📋 Workflows Overview

### 1. **CI/CD Tests** (`.github/workflows/ci-test.yml`)
Runs on every push and pull request to `main` and `develop` branches.

**Test Matrix:**
- Node.js 18.x and 20.x
- PostgreSQL 15 (Docker service)

**Tests Performed:**
- ✅ **Syntax Validation** - All JavaScript files validated for syntax errors
- ✅ **Dependency Verification** - All required packages installed and checked
- ✅ **Database Connection** - PostgreSQL connectivity test
- ✅ **File Structure Validation** - Ensures all required files exist
- ✅ **Code Quality** - Console statements and unused variables check
- ✅ **Environment Configuration** - Validates environment setup
- ✅ **Docker Build** - Tests Docker image builds successfully
- ✅ **Security Audit** - npm audit for vulnerabilities
- ✅ **Secret Detection** - Scans for exposed secrets in code
- ✅ **JSON Validation** - Validates package.json format
- ✅ **Documentation Check** - Verifies documentation files exist

**Artifacts Generated:**
- `test-results-18.x` - Test results for Node 18
- `test-results-20.x` - Test results for Node 20

---

### 2. **Build & Deploy** (`.github/workflows/deploy.yml`)
Runs automatically when code is pushed to `main` branch after successful CI tests.

**Jobs:**
- Build Docker image with commit SHA tag
- Run container health checks
- Generate deployment package information
- Create deployment summary

**Triggered by:**
- Changes to `src/`, `package.json`, `Dockerfile`, or `docker-compose.yml` on main branch

**Artifacts Generated:**
- `deployment-package` - Deployment information and build details

---

### 3. **Code Quality & Analysis** (`.github/workflows/code-quality.yml`)
Analyzes code quality and generates detailed reports.

**Analysis Performed:**
- 📊 File size analysis
- 🔍 Code pattern analysis
- 📦 Dependency analysis
- 🎯 Cyclomatic complexity calculation
- ✅ Code quality metrics
- 📈 Best practices validation

**Artifacts Generated:**
- `code-analysis-reports` - Multiple analysis reports
- `complexity-report` - Complexity analysis

**PR Comments:**
Automatically posts code quality summary on pull requests

---

## 🚀 Running Tests Locally

### Option 1: Run individual Node syntax checks
```bash
node --check src/index.js
node --check src/github.js
node --check src/gitlab.js
node --check src/db.js
```

### Option 2: Run npm scripts
```bash
npm install
npm audit
```

### Option 3: Run Docker tests locally
```bash
docker build -t github-discord-bot:test .
docker run --rm github-discord-bot:test node --version
```

---

## 📊 Test Results

### Successful Test Output Example:
```
✅ All files passed syntax validation
✅ All dependencies verified
✅ Database connected successfully
✅ File structure validated
✅ Docker image built successfully
✅ No exposed secrets detected
✅ package.json is valid JSON
✅ Code quality checks completed
✅ All CI/CD checks passed successfully!
```

---

## 🔒 Environment Variables in CI

### Required for Testing:
- `ENCRYPTION_KEY` - 64 hex character encryption key (provided or uses default for testing)
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by CI)
- `DISCORD_TOKEN` - Test token (uses dummy value)
- `GITHUB_CLIENT_ID` - Test ID (uses dummy value)
- `GITHUB_CLIENT_SECRET` - Test secret (uses dummy value)
- `GITLAB_CLIENT_ID` - Test ID (uses dummy value)
- `GITLAB_CLIENT_SECRET` - Test secret (uses dummy value)

### Secrets from Repository:
- `ENCRYPTION_KEY` - Can be configured as GitHub Secret for real value

---

## 🎯 Pull Request Workflow

1. **Create PR** → Triggers CI tests
2. **All tests pass** → Code quality analysis runs
3. **PR comment** → Shows code quality summary
4. **Approval & merge** → Deploy workflow triggers on main branch
5. **Docker build** → New image built with commit SHA

---

## 📈 Monitoring CI Pipeline

### View Test Results:
1. Go to repository
2. Click "Actions" tab
3. Select workflow run
4. View detailed logs for each job

### Download Artifacts:
1. Go to specific workflow run
2. Scroll to "Artifacts" section
3. Download test reports and analysis

### Enable Branch Protection:
1. Go to Settings → Branches
2. Add rule for `main`
3. Enable "Require status checks to pass"
4. Select "ci-test" as required check

---

## 🐛 Troubleshooting

### "Node modules not found"
```bash
npm ci  # Clean install in CI
```

### "Database connection failed"
- PostgreSQL service should auto-start
- Check Docker in GitHub Actions is working
- Verify connection string is correct

### "Syntax error in file X"
- Run locally: `node --check src/file.js`
- Fix syntax errors
- Re-push

### "Docker build failed"
- Ensure Dockerfile is valid
- Check base image exists
- Verify all COPY paths are correct

---

## 📝 Test Coverage

| Component | Test Type | Coverage |
|-----------|-----------|----------|
| Syntax | Validation | 100% |
| Dependencies | Verification | 100% |
| Docker | Build test | 100% |
| Database | Connection | Connection only |
| Code Quality | Analysis | Metrics only |
| Security | Audit | Vulnerability scan |
| Secrets | Detection | Pattern matching |

---

## 🔄 Continuous Integration Flow

```
Developer Push
    ↓
GitHub Actions Triggered
    ↓
├─ Syntax Validation (all files)
├─ Dependency Check
├─ Database Test
├─ File Structure
├─ Docker Build
├─ Security Scan
└─ Documentation Check
    ↓
All Pass? → Deploy Workflow
    ↓
Build Docker Image
    ↓
Generate Deployment Package
    ↓
Ready for Production
```

---

## 📦 Deployment Pipeline

The deployment workflow automatically:
1. Builds Docker image on `main` branch changes
2. Tags with commit SHA
3. Tags as `latest`
4. Runs container health checks
5. Generates deployment information
6. Creates artifacts for deployment

---

## 🛠️ Customizing Workflows

### Add new test:
Edit `.github/workflows/ci-test.yml` and add new job or step

### Change Node versions:
```yaml
strategy:
  matrix:
    node-version: [18.x, 20.x, 21.x]  # Add 21.x
```

### Add security check:
Edit `.github/workflows/code-quality.yml` to add new analysis

### Change branch triggers:
Update `on.push.branches` in workflow files

---

## 📞 Support

### View Workflow Logs:
1. Actions tab → Select workflow
2. Click on specific run
3. Expand any job for detailed logs

### Common Issues:
- **Tests failing**: Check logs for specific error
- **Docker build failing**: Verify Dockerfile syntax
- **Timeout**: May need to increase timeout in workflow
- **Secret not found**: Configure in Settings → Secrets

### Enable Debugging:
```yaml
- name: Debug info
  run: |
    echo "Node version: $(node --version)"
    echo "npm version: $(npm --version)"
    echo "Working directory: $(pwd)"
    ls -la
```

---

## 📚 Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax Reference](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Available Actions](https://github.com/marketplace?type=actions)

---

## ✅ Verification Checklist

Before pushing to production:
- [ ] All CI tests passing
- [ ] Code quality report reviewed
- [ ] No security vulnerabilities
- [ ] No exposed secrets
- [ ] Docker build successful
- [ ] Dependencies up to date
- [ ] Tests pass on Node 18.x and 20.x

---

Last Updated: December 7, 2025
Workflows Created: 3 (ci-test, deploy, code-quality)
