# News Forge: Full Backend & API Test Suite
# Location: D:\Work Code\Projects\New folder\News-Forge\test-utils\backend\test_full.ps1

$PROJECT_ROOT = "D:\Work Code\Projects\New folder\News-Forge"
Set-Location $PROJECT_ROOT

Write-Host "====================================================" -ForegroundColor Cyan
Write-Host "       NEWS FORGE: FULL TEST ORCHESTRATOR" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan

# Check dependencies
if (!(Get-Command npx -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: npx not found. Please install Node.js." -ForegroundColor Red
    exit 1
}

# 1. Database Preparation
Write-Host "`n[1/3] Preparing Test Database..." -ForegroundColor Yellow
$Env:NODE_ENV = "test"
$Env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5433/news_forge_test?schema=public"
npx prisma db push --force-reset --accept-data-loss
npx prisma db seed

# Start server for API and E2E tests
Write-Host "Starting Next.js Dev Server..." -ForegroundColor Yellow
$serverProcess = Start-Process npx -ArgumentList "dotenv", "-e", ".env.test", "--", "npm", "run", "dev" -PassThru -NoNewWindow -RedirectStandardOutput "server.log" -RedirectStandardError "server.err.log"
Write-Host "Waiting for server to be ready on port 3000..."
$timeout = 60
while (!(Test-NetConnection -ComputerName localhost -Port 3000 -InformationLevel Quiet) -and $timeout -gt 0) {
    Start-Sleep -Seconds 2
    $timeout -= 2
}
if ($timeout -le 0) {
    Write-Host "ERROR: Dev server failed to start within 60s. Check server.err.log" -ForegroundColor Red
    cat server.err.log
    exit 1
}
# Give it a bit more time to fully initialize
Start-Sleep -Seconds 10

# 2. API Tests (PowerShell suite)
Write-Host "`n[2/3] Running API Integration Tests..." -ForegroundColor Yellow
if (Test-Path ".\test-api.ps1") {
    & ".\test-api.ps1"
} else {
    Write-Host "ERROR: test-api.ps1 not found in root." -ForegroundColor Red
}

# 3. E2E Tests (Playwright)
Write-Host "`n[3/3] Running Playwright E2E Tests..." -ForegroundColor Yellow
npx playwright test --project=chromium

# Cleanup
Write-Host "`nStopping Dev Server..." -ForegroundColor Yellow
if ($serverProcess) {
    Stop-Process -Id $serverProcess.Id -Force -ErrorAction SilentlyContinue
}

Write-Host "`n====================================================" -ForegroundColor Cyan
Write-Host "       FULL SUITE EXECUTION FINISHED" -ForegroundColor Cyan
Write-Host "====================================================" -ForegroundColor Cyan
