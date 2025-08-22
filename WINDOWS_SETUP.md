# Windows Development Setup

This project was developed on Replit and may have compatibility issues with Windows development environments. Here are several solutions:

## Option 1: Use the Windows Batch File
```cmd
dev.bat
```

## Option 2: Use PowerShell Script
```powershell
.\dev.ps1
```

## Option 3: Use Cross-platform Node.js Script
```cmd
node dev.js
```

## Option 4: Manual Command
Instead of `npm run dev`, run:

**Command Prompt:**
```cmd
set NODE_ENV=development && npx tsx server/index.ts
```

**PowerShell:**
```powershell
$env:NODE_ENV = "development"; npx tsx server/index.ts
```

**Git Bash/WSL:**
```bash
NODE_ENV=development npx tsx server/index.ts
```

## Recommended Setup for Windows

1. **Install WSL2** (Windows Subsystem for Linux) for better compatibility
2. **Use Git Bash** instead of Command Prompt
3. **Install cross-env globally**: `npm install -g cross-env`

## Environment Variables Required

Make sure you have these Firebase environment variables set in your local environment:
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID`  
- `VITE_FIREBASE_PROJECT_ID`

## Troubleshooting

If you're seeing commands prefixed with 'cd &', this is likely due to:

1. **Shell configuration conflicts** between Replit and Windows environments
2. **PATH issues** with npm/node binaries
3. **Environment variable syntax** differences between Unix and Windows

### Quick Fixes:

1. **Clear npm cache**: `npm cache clean --force`
2. **Reinstall node_modules**: `rmdir /s node_modules && npm install`
3. **Use the provided scripts** instead of `npm run dev`
4. **Check your terminal/shell** - try Git Bash instead of Command Prompt