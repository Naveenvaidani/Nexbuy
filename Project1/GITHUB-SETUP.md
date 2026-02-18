# GitHub Setup Guide

## Prerequisites
Before pushing your code to GitHub, follow these steps:

### 1. Configure Git User (First Time Only)
```powershell
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

To verify the configuration:
```powershell
git config --global --list
```

### 2. Create GitHub Repository
1. Go to [GitHub.com](https://github.com)
2. Click the "+" icon in the top right and select "New repository"
3. Name your repository: `Nexbuy` (or your preferred name)
4. Choose "Private" if you want it private, "Public" otherwise
5. Do NOT initialize with README, .gitignore, or license (we have these)
6. Click "Create repository"

### 3. Setup Remote and Push

#### Copy the commands from GitHub after creating the repo, they will look like:
```powershell
cd "c:\Users\ADMIN\Documents\Nexbuy\Project1"

# Option A: Using HTTPS (simpler for now)
git remote add origin https://github.com/YOUR_USERNAME/Nexbuy.git
git branch -M main
git add .
git commit -m "Initial commit: NexBuy e-commerce platform"
git push -u origin main
```

#### Option B: Using SSH (more secure, requires setup)
```powershell
git remote add origin git@github.com:YOUR_USERNAME/Nexbuy.git
git branch -M main
git add .
git commit -m "Initial commit: NexBuy e-commerce platform"
git push -u origin main
```

### 4. Add GitHub Personal Access Token (if using HTTPS)
If you get authentication errors:
1. Go to GitHub → Settings → Developer settings → Personal access tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo` and `workflow`
4. Copy the token
5. When Git asks for password, paste the token instead

### 5. Files Already Prepared
✅ `.gitignore` - Excludes node_modules, .env, logs, coverage, etc.
✅ `.gitattributes` - Ensures proper line endings across Windows/Linux/Mac
✅ `.env.example` - Shows required environment variables (committed to repo)
✅ Backend `.env.example` - Shows backend configuration template

### 6. Important Notes
- **Never commit actual `.env` files** - They're already in .gitignore
- All developers should copy `.env.example` to `.env` and configure locally
- Keep API keys and secrets in `.env` files only (not in code)
- The `read files/` and `Project1.zip` are excluded by .gitignore

### 7. For Future Commits
```powershell
cd "c:\Users\ADMIN\Documents\Nexbuy\Project1"
git add .
git commit -m "Your commit message"
git push
```

## Troubleshooting

### Clear git cache if files were already tracked:
```powershell
git rm -r --cached .
git add .
git commit -m "Update gitignore to exclude sensitive files"
git push
```

### Check what will be pushed:
```powershell
git status
```

### See all configured remotes:
```powershell
git remote -v
```

## Next Steps
1. Create `.env` files locally (copying from `.env.example`)
2. Add `origin` remote pointing to your GitHub repo
3. Run `git add .`
4. Run `git commit -m "Initial commit"`
5. Run `git push -u origin main`

Enjoy hosting your project on GitHub! 🚀
