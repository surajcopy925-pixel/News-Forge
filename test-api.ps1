# test-api.ps1 - Phase 3.2 API Tests (PowerShell)
$BASE = "http://localhost:3000/api"
$script:PASS = 0
$script:FAIL = 0
$NEW_STORY_ID = $null
$NEW_CLIP_ID = $null
$NEW_RUNDOWN_ID = $null
$NEW_ENTRY_ID = $null
# Dynamic values to avoid unique constraint collisions on re-runs
$TEST_DATE = (Get-Date).ToString("yyyy-MM-dd")
$TEST_TIME = (Get-Date).ToString("HH:mm:ss")

Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  NEWS FORGE Phase 3.2 API Tests" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host ""

function Invoke-Api {
    param($method, $url, $body = $null)
    try {
        $params = @{ Uri = $url; Method = $method; UseBasicParsing = $true; ErrorAction = "Stop" }
        if ($body) {
            $params.ContentType = "application/json"
            $params.Body = ($body | ConvertTo-Json -Depth 5)
        }
        $resp = Invoke-WebRequest @params
        return @{ Status = [int]$resp.StatusCode; Body = $resp.Content }
    }
    catch {
        $code = 0
        if ($_.Exception.Response) { $code = [int]$_.Exception.Response.StatusCode }
        $msg = ""
        if ($_.ErrorDetails) { $msg = $_.ErrorDetails.Message }
        return @{ Status = $code; Body = $msg }
    }
}

function Check-Response {
    param($testName, $response, $expected)
    if ($response.Body -and ($response.Body -match [regex]::Escape($expected))) {
        Write-Host "  PASS $testName" -ForegroundColor Green
        $script:PASS++
    }
    else {
        Write-Host "  FAIL $testName" -ForegroundColor Red
        $preview = if ($response.Body) { $response.Body.Substring(0, [Math]::Min(200, $response.Body.Length)) } else { "(empty)" }
        Write-Host "     Expected: $expected | Got: $preview"
        $script:FAIL++
    }
}

function Check-Status {
    param($testName, $status, $expected)
    if ($status -eq $expected) {
        Write-Host "  PASS $testName (HTTP $status)" -ForegroundColor Green
        $script:PASS++
    }
    else {
        Write-Host "  FAIL $testName (Expected $expected got $status)" -ForegroundColor Red
        $script:FAIL++
    }
}

# STORIES
Write-Host "-- STORIES --" -ForegroundColor Yellow

$r = Invoke-Api "GET" "$BASE/stories"
Check-Response "GET /api/stories" $r "STY-20250610-001"

$r = Invoke-Api "GET" "$BASE/stories/STY-20250610-001"
Check-Response "GET /api/stories/:id" $r "CM Press Conference"

$r = Invoke-Api "GET" "$BASE/stories/FAKE-ID"
Check-Status "GET /api/stories/FAKE-ID returns 404" $r.Status 404

$r = Invoke-Api "POST" "$BASE/stories" @{title="Test API Story";createdBy="USR-001";format="VO";category="Sports";status="DRAFT"}
Check-Response "POST /api/stories creates story" $r "Test API Story"
if ($r.Body) { $NEW_STORY_ID = ($r.Body | ConvertFrom-Json).storyId }
Write-Host "     Created: $NEW_STORY_ID"

if ($NEW_STORY_ID) {
    $r = Invoke-Api "PATCH" "$BASE/stories/$NEW_STORY_ID" @{title="Updated API Story"}
    Check-Response "PATCH /api/stories/:id" $r "Updated API Story"
}
else {
    Write-Host "  SKIP update - no storyId"
    $script:FAIL++
}

$r = Invoke-Api "GET" "$BASE/stories/STY-20250610-001/clips"
Check-Response "GET /api/stories/:id/clips" $r "STY-20250610-001_C01"

# CLIPS
Write-Host ""
Write-Host "-- CLIPS --" -ForegroundColor Yellow

$r = Invoke-Api "GET" "$BASE/clips"
Check-Response "GET /api/clips" $r "STY-20250610-001_C01"

$r = Invoke-Api "GET" "$BASE/clips/STY-20250610-001_C01"
Check-Response "GET /api/clips/:id" $r "interview_take1.mxf"

if ($NEW_STORY_ID) {
    $r = Invoke-Api "POST" "$BASE/clips" @{storyId=$NEW_STORY_ID;originalFileName="test_footage.mp4";duration="01:30"}
    Check-Response "POST /api/clips creates clip" $r "test_footage.mp4"
    if ($r.Body) { $NEW_CLIP_ID = ($r.Body | ConvertFrom-Json).clipId }
    Write-Host "     Created: $NEW_CLIP_ID"
}
else {
    Write-Host "  SKIP clip create - no storyId"
    $script:FAIL++
}

if ($NEW_CLIP_ID) {
    $r = Invoke-Api "POST" "$BASE/clips/$NEW_CLIP_ID/send-to-editor-hub" @{editingInstructions="Trim first 10 seconds";editorialNotes="Check audio"}
    Check-Response "POST /api/clips/:id/send-to-editor-hub" $r "Trim first 10 seconds"

    $r = Invoke-Api "POST" "$BASE/clips/$NEW_CLIP_ID/claim" @{userId="USR-002"}
    Check-Response "POST /api/clips/:id/claim EDITING" $r "EDITING"

    $r = Invoke-Api "POST" "$BASE/clips/$NEW_CLIP_ID/claim" @{userId="USR-003"}
    Check-Status "POST /api/clips/:id/claim double-claim 409" $r.Status 409

    $r = Invoke-Api "POST" "$BASE/clips/$NEW_CLIP_ID/complete" @{displayLabel="TEST_API_PKG";userId="USR-002"}
    Check-Response "POST /api/clips/:id/complete DONE" $r "DONE"
    Check-Response "POST /api/clips/:id/complete displayLabel" $r "TEST_API_PKG"

    $r = Invoke-Api "POST" "$BASE/clips/$NEW_CLIP_ID/complete" @{displayLabel="AGAIN";userId="USR-002"}
    Check-Status "POST /api/clips/:id/complete double-complete 409" $r.Status 409
}
else {
    Write-Host "  SKIP clip actions - no clipId"
    $script:FAIL += 6
}

# RUNDOWNS
Write-Host ""
Write-Host "-- RUNDOWNS --" -ForegroundColor Yellow

$r = Invoke-Api "GET" "$BASE/rundowns"
Check-Response "GET /api/rundowns returns array" $r "["

$r = Invoke-Api "POST" "$BASE/rundowns" @{title="9:00 PM Bulletin";date=$TEST_DATE;broadcastTime=$TEST_TIME;plannedDuration="00:30:00"}
Check-Response "POST /api/rundowns creates rundown" $r "9:00 PM Bulletin"
if ($r.Body) { $NEW_RUNDOWN_ID = ($r.Body | ConvertFrom-Json).rundownId }
Write-Host "     Created: $NEW_RUNDOWN_ID"

if ($NEW_RUNDOWN_ID) {
    $r = Invoke-Api "GET" "$BASE/rundowns/$NEW_RUNDOWN_ID"
    Check-Response "GET /api/rundowns/:id" $r "9:00 PM Bulletin"

    $r = Invoke-Api "POST" "$BASE/rundowns/$NEW_RUNDOWN_ID/entries" @{storyId="STY-20250610-001";userId="USR-001"}
    Check-Response "POST /api/rundowns/:id/entries" $r "STY-20250610-001"
    if ($r.Body) { $NEW_ENTRY_ID = ($r.Body | ConvertFrom-Json).entryId }
    Write-Host "     Created entry: $NEW_ENTRY_ID"

    $r = Invoke-Api "GET" "$BASE/rundowns/$NEW_RUNDOWN_ID/entries"
    Check-Response "GET /api/rundowns/:id/entries" $r "STY-20250610-001"

    $r = Invoke-Api "POST" "$BASE/stories/STY-20250610-002/send-to-rundown" @{rundownId=$NEW_RUNDOWN_ID;userId="USR-003"}
    Check-Response "POST /api/stories/:id/send-to-rundown" $r "STY-20250610-002"
}
else {
    Write-Host "  SKIP rundown actions - no rundownId"
    $script:FAIL += 4
}

# USERS
Write-Host ""
Write-Host "-- USERS --" -ForegroundColor Yellow

$r = Invoke-Api "GET" "$BASE/users"
Check-Response "GET /api/users" $r "Priya Sharma"

$r = Invoke-Api "GET" "$BASE/users?role=REPORTER"
Check-Response "GET /api/users?role=REPORTER" $r "Deepa Nair"

# AUDIT
Write-Host ""
Write-Host "-- AUDIT --" -ForegroundColor Yellow

$r = Invoke-Api "GET" "$BASE/audit"
Check-Response "GET /api/audit" $r "SEED"

# CLEANUP
Write-Host ""
Write-Host "-- CLEANUP --" -ForegroundColor Yellow

if ($NEW_ENTRY_ID -and $NEW_RUNDOWN_ID) {
    $r = Invoke-Api "DELETE" "$BASE/rundowns/$NEW_RUNDOWN_ID/entries/$NEW_ENTRY_ID"
    Check-Status "DELETE entry" $r.Status 200
}
if ($NEW_CLIP_ID) {
    $r = Invoke-Api "DELETE" "$BASE/clips/$NEW_CLIP_ID"
    Check-Status "DELETE test clip" $r.Status 200
}
if ($NEW_STORY_ID) {
    $r = Invoke-Api "DELETE" "$BASE/stories/$NEW_STORY_ID"
    Check-Status "DELETE test story" $r.Status 200
}
if ($NEW_RUNDOWN_ID) {
    $r = Invoke-Api "DELETE" "$BASE/rundowns/$NEW_RUNDOWN_ID"
    Check-Status "DELETE test rundown" $r.Status 200
}

# RESULTS
Write-Host ""
Write-Host "=======================================" -ForegroundColor Cyan
Write-Host "  RESULTS: $($script:PASS) passed, $($script:FAIL) failed" -ForegroundColor Cyan
Write-Host "=======================================" -ForegroundColor Cyan

if ($script:FAIL -eq 0) {
    Write-Host "  ALL TESTS PASSED - Phase 3.2 solid!" -ForegroundColor Green
}
else {
    Write-Host "  $($script:FAIL) test(s) failed" -ForegroundColor Red
}
