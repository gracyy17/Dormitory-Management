# GitHub Actions CI/CD Setup Guide

This project now has automated Continuous Integration/Continuous Deployment (CI/CD) configured using GitHub Actions.

## What Gets Automated

### ✅ Continuous Integration (CI)
- Runs on every push and pull request
- Checks code quality with ESLint
- Builds the project with Vite
- Reports failures immediately with detailed error messages

### 🚀 Continuous Deployment (CD)
- Automatically deploys to Firebase Hosting when:
  - Code is pushed to `main`, `admin`, or `tenant` branches
  - All CI checks pass (lint + build)
  - No manual action needed

## Setup Instructions

### 1. Generate Firebase Service Account

1. Go to Firebase Console: https://console.firebase.google.com/
2. Select your project: `dorm-27fe2`
3. Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file securely

### 2. Add GitHub Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions

Add these secrets:

| Secret Name | Value |
|-------------|-------|
| `FIREBASE_API_KEY` | From Firebase Console → Project Settings → General (apiKey) |
| `FIREBASE_AUTH_DOMAIN` | From Firebase Console (authDomain) |
| `FIREBASE_PROJECT_ID` | `dorm-27fe2` |
| `FIREBASE_STORAGE_BUCKET` | From Firebase Console (storageBucket) |
| `FIREBASE_MESSAGING_SENDER_ID` | From Firebase Console (messagingSenderId) |
| `FIREBASE_APP_ID` | From Firebase Console (appId) |
| `FIREBASE_SERVICE_ACCOUNT` | Paste the entire JSON content from step 1 |

### 3. Set Deployment Branch (Optional but Recommended)

Go to Project Settings → Environments → `production`

Restrict deployment to only `main`, `admin`, `tenant` branches by:
- Settings → Rules → Add deployment protection rule
- Require approval from admins before deployment to production

## Workflow Files

### `.github/workflows/ci.yml`
- **Triggers**: Push to any branch, Pull Requests
- **Actions**:
  - Install dependencies
  - Run ESLint (code quality)
  - Build project
  - Report failures with error details

### `.github/workflows/deploy.yml`
- **Triggers**: Push to `main`, `admin`, or `tenant` branches
- **Actions**:
  - Run CI checks (lint + build)
  - Deploy to Firebase Hosting if all checks pass
  - Provide deployment status

## How Professors/Collaborators Can Push Code

1. Collaborator makes changes locally or on their branch
2. Pushes code to your repository
3. **Automatic CI kicks in** - code is tested (eslint + build)
4. **If all checks pass** → Automatically deploys to your live website
5. **If checks fail** → Deployment is blocked, and error details are sent

Example error response in GitHub:
```
❌ Deployment failed
Check failed. Please review the errors above.
- Lint errors: Component imports missing
- Build failed: Syntax error in TenantDues.jsx
```

## Viewing Workflow Status

1. Go to repository → Actions tab
2. See all workflow runs in real-time
3. Click on any run to see detailed logs
4. Failed runs show exactly what went wrong

## Notes

- Firebase Token is automatically managed by GitHub Actions
- Your Firebase credentials are encrypted and never exposed
- Each branch can have its own deployment environment if needed
- You can add more test steps (unit tests, E2E tests) to `ci.yml`

## Next Steps

1. Add the secrets to GitHub
2. Make a test commit to trigger the CI/CD
3. Check Actions tab to see it in action
4. Once tests pass, your site automatically updates!
