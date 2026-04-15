#!/bin/bash
# test-api.sh — Verify Phase 3.2 API Routes
# REQUIRES: dev server running (npm run dev) on port 3000

BASE="http://localhost:3000/api"

echo "═══════════════════════════════════════"
echo "  NEWS FORGE — Phase 3.2 API Tests"
echo "═══════════════════════════════════════"
echo ""
echo "⚠️  Make sure 'npm run dev' is running!"
echo ""

PASS=0
FAIL=0

# Helper function
check_response() {
  local TEST_NAME="\$1"
  local RESPONSE="\$2"
  local EXPECTED="\$3"
  
  if echo "$RESPONSE" | grep -q "$EXPECTED"; then
    echo "  ✅ PASS — $TEST_NAME"
    PASS=$((PASS+1))
  else
    echo "  ❌ FAIL — $TEST_NAME"
    echo "     Expected to contain: $EXPECTED"
    echo "     Got: $(echo $RESPONSE | head -c 200)"
    FAIL=$((FAIL+1))
  fi
}

check_status() {
  local TEST_NAME="\$1"
  local STATUS="\$2"
  local EXPECTED="\$3"
  
  if [ "$STATUS" -eq "$EXPECTED" ]; then
    echo "  ✅ PASS — $TEST_NAME (HTTP $STATUS)"
    PASS=$((PASS+1))
  else
    echo "  ❌ FAIL — $TEST_NAME (Expected HTTP $EXPECTED, got $STATUS)"
    FAIL=$((FAIL+1))
  fi
}

# ═══════════════════════════════════════
# STORIES
# ═══════════════════════════════════════
echo "── STORIES ──────────────────────────"

# Test 1: List stories
RESP=$(curl -s "$BASE/stories")
check_response "GET /api/stories returns stories" "$RESP" "STY-20250610-001"

# Test 2: Get single story
RESP=$(curl -s "$BASE/stories/STY-20250610-001")
check_response "GET /api/stories/:id returns CM Press Conference" "$RESP" "CM Press Conference"

# Test 3: Get non-existent story
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/stories/FAKE-ID")
check_status "GET /api/stories/FAKE-ID returns 404" "$STATUS" 404

# Test 4: Create story
RESP=$(curl -s -X POST "$BASE/stories" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test API Story","createdBy":"USR-001","format":"VO","category":"Sports","status":"DRAFT"}')
check_response "POST /api/stories creates story" "$RESP" "Test API Story"

# Extract created storyId for later tests
NEW_STORY_ID=$(echo "$RESP" | grep -o '"storyId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "     Created: $NEW_STORY_ID"

# Test 5: Update story
if [ -n "$NEW_STORY_ID" ]; then
  RESP=$(curl -s -X PATCH "$BASE/stories/$NEW_STORY_ID" \
    -H "Content-Type: application/json" \
    -d '{"title":"Updated API Story","content":"Updated content text"}')
  check_response "PATCH /api/stories/:id updates story" "$RESP" "Updated API Story"
else
  echo "  ⏭️  SKIP — No storyId to update"
  FAIL=$((FAIL+1))
fi

# Test 6: Get story clips
RESP=$(curl -s "$BASE/stories/STY-20250610-001/clips")
check_response "GET /api/stories/:id/clips returns clips" "$RESP" "STY-20250610-001_C01"

# ═══════════════════════════════════════
# CLIPS
# ═══════════════════════════════════════
echo ""
echo "── CLIPS ────────────────────────────"

# Test 7: List clips
RESP=$(curl -s "$BASE/clips")
check_response "GET /api/clips returns clips" "$RESP" "STY-20250610-001_C01"

# Test 8: Get single clip
RESP=$(curl -s "$BASE/clips/STY-20250610-001_C01")
check_response "GET /api/clips/:id returns clip details" "$RESP" "interview_take1.mxf"

# Test 9: Create clip
if [ -n "$NEW_STORY_ID" ]; then
  RESP=$(curl -s -X POST "$BASE/clips" \
    -H "Content-Type: application/json" \
    -d "{\"storyId\":\"$NEW_STORY_ID\",\"originalFileName\":\"test_footage.mp4\",\"duration\":\"01:30\"}")
  check_response "POST /api/clips creates clip" "$RESP" "test_footage.mp4"
  
  NEW_CLIP_ID=$(echo "$RESP" | grep -o '"clipId":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "     Created: $NEW_CLIP_ID"
else
  echo "  ⏭️  SKIP — No storyId for clip creation"
  FAIL=$((FAIL+1))
fi

# Test 10: Send to editor hub
if [ -n "$NEW_CLIP_ID" ]; then
  RESP=$(curl -s -X POST "$BASE/clips/$NEW_CLIP_ID/send-to-editor-hub" \
    -H "Content-Type: application/json" \
    -d '{"editingInstructions":"Trim first 10 seconds","editorialNotes":"Check audio levels"}')
  check_response "POST /api/clips/:id/send-to-editor-hub saves instructions" "$RESP" "Trim first 10 seconds"
else
  echo "  ⏭️  SKIP — No clipId for send-to-editor-hub"
  FAIL=$((FAIL+1))
fi

# Test 11: Claim clip
if [ -n "$NEW_CLIP_ID" ]; then
  RESP=$(curl -s -X POST "$BASE/clips/$NEW_CLIP_ID/claim" \
    -H "Content-Type: application/json" \
    -d '{"userId":"USR-002"}')
  check_response "POST /api/clips/:id/claim → EDITING" "$RESP" "EDITING"
else
  echo "  ⏭️  SKIP — No clipId for claim"
  FAIL=$((FAIL+1))
fi

# Test 12: Claim already-claimed clip (should fail 409)
if [ -n "$NEW_CLIP_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/clips/$NEW_CLIP_ID/claim" \
    -H "Content-Type: application/json" \
    -d '{"userId":"USR-003"}')
  check_status "POST /api/clips/:id/claim (already EDITING) returns 409" "$STATUS" 409
else
  echo "  ⏭️  SKIP — No clipId for double-claim test"
  FAIL=$((FAIL+1))
fi

# Test 13: Complete clip
if [ -n "$NEW_CLIP_ID" ]; then
  RESP=$(curl -s -X POST "$BASE/clips/$NEW_CLIP_ID/complete" \
    -H "Content-Type: application/json" \
    -d '{"displayLabel":"TEST_API_PKG","userId":"USR-002"}')
  check_response "POST /api/clips/:id/complete → DONE with label" "$RESP" "DONE"
  check_response "POST /api/clips/:id/complete has displayLabel" "$RESP" "TEST_API_PKG"
else
  echo "  ⏭️  SKIP — No clipId for complete"
  FAIL=$((FAIL+2))
fi

# Test 14: Complete already-done clip (should fail 409)
if [ -n "$NEW_CLIP_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/clips/$NEW_CLIP_ID/complete" \
    -H "Content-Type: application/json" \
    -d '{"displayLabel":"AGAIN","userId":"USR-002"}')
  check_status "POST /api/clips/:id/complete (already DONE) returns 409" "$STATUS" 409
else
  echo "  ⏭️  SKIP — No clipId for double-complete test"
  FAIL=$((FAIL+1))
fi

# ═══════════════════════════════════════
# RUNDOWNS
# ═══════════════════════════════════════
echo ""
echo "── RUNDOWNS ─────────────────────────"

# Test 15: List rundowns (should be empty)
RESP=$(curl -s "$BASE/rundowns")
check_response "GET /api/rundowns returns array" "$RESP" "["

# Test 16: Create rundown
RESP=$(curl -s -X POST "$BASE/rundowns" \
  -H "Content-Type: application/json" \
  -d '{"title":"9:00 PM Bulletin","date":"2025-06-15","broadcastTime":"21:00:00","plannedDuration":"00:30:00"}')
check_response "POST /api/rundowns creates rundown" "$RESP" "9:00 PM Bulletin"

NEW_RUNDOWN_ID=$(echo "$RESP" | grep -o '"rundownId":"[^"]*"' | head -1 | cut -d'"' -f4)
echo "     Created: $NEW_RUNDOWN_ID"

# Test 17: Get rundown
if [ -n "$NEW_RUNDOWN_ID" ]; then
  RESP=$(curl -s "$BASE/rundowns/$NEW_RUNDOWN_ID")
  check_response "GET /api/rundowns/:id returns rundown" "$RESP" "9:00 PM Bulletin"
else
  echo "  ⏭️  SKIP — No rundownId"
  FAIL=$((FAIL+1))
fi

# Test 18: Add entry to rundown
if [ -n "$NEW_RUNDOWN_ID" ]; then
  RESP=$(curl -s -X POST "$BASE/rundowns/$NEW_RUNDOWN_ID/entries" \
    -H "Content-Type: application/json" \
    -d '{"storyId":"STY-20250610-001","userId":"USR-001"}')
  check_response "POST /api/rundowns/:id/entries adds story" "$RESP" "STY-20250610-001"
  
  NEW_ENTRY_ID=$(echo "$RESP" | grep -o '"entryId":"[^"]*"' | head -1 | cut -d'"' -f4)
  echo "     Created: $NEW_ENTRY_ID"
else
  echo "  ⏭️  SKIP — No rundownId for entry"
  FAIL=$((FAIL+1))
fi

# Test 19: List entries
if [ -n "$NEW_RUNDOWN_ID" ]; then
  RESP=$(curl -s "$BASE/rundowns/$NEW_RUNDOWN_ID/entries")
  check_response "GET /api/rundowns/:id/entries lists entries" "$RESP" "STY-20250610-001"
else
  echo "  ⏭️  SKIP — No rundownId for entries list"
  FAIL=$((FAIL+1))
fi

# Test 20: Send story to rundown (via story endpoint)
if [ -n "$NEW_RUNDOWN_ID" ]; then
  RESP=$(curl -s -X POST "$BASE/stories/STY-20250610-002/send-to-rundown" \
    -H "Content-Type: application/json" \
    -d "{\"rundownId\":\"$NEW_RUNDOWN_ID\",\"userId\":\"USR-003\"}")
  check_response "POST /api/stories/:id/send-to-rundown works" "$RESP" "STY-20250610-002"
else
  echo "  ⏭️  SKIP — No rundownId for send-to-rundown"
  FAIL=$((FAIL+1))
fi

# ═══════════════════════════════════════
# USERS
# ═══════════════════════════════════════
echo ""
echo "── USERS ────────────────────────────"

# Test 21: List users
RESP=$(curl -s "$BASE/users")
check_response "GET /api/users returns users" "$RESP" "Priya Sharma"

# Test 22: Filter by role
RESP=$(curl -s "$BASE/users?role=REPORTER")
check_response "GET /api/users?role=REPORTER filters correctly" "$RESP" "Deepa Nair"

# ═══════════════════════════════════════
# AUDIT
# ═══════════════════════════════════════
echo ""
echo "── AUDIT ────────────────────────────"

# Test 23: List audit logs
RESP=$(curl -s "$BASE/audit")
check_response "GET /api/audit returns logs" "$RESP" "SEED"

# ═══════════════════════════════════════
# CLEANUP — Delete test data
# ═══════════════════════════════════════
echo ""
echo "── CLEANUP ──────────────────────────"

# Delete test entry
if [ -n "$NEW_ENTRY_ID" ] && [ -n "$NEW_RUNDOWN_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/rundowns/$NEW_RUNDOWN_ID/entries/$NEW_ENTRY_ID")
  check_status "DELETE entry" "$STATUS" 200
fi

# Delete test clip
if [ -n "$NEW_CLIP_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/clips/$NEW_CLIP_ID")
  check_status "DELETE test clip" "$STATUS" 200
fi

# Delete test story
if [ -n "$NEW_STORY_ID" ]; then
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/stories/$NEW_STORY_ID")
  check_status "DELETE test story" "$STATUS" 200
fi

# ═══════════════════════════════════════
# RESULTS
# ═══════════════════════════════════════
echo ""
echo "═══════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed"
echo "═══════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED — Phase 3.2 is solid!"
  echo "  Ready for Phase 3.3 (Frontend Integration)"
else
  echo "  ⚠️  $FAIL test(s) failed — fix before Phase 3.3"
fi