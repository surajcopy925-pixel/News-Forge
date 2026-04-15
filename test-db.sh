#!/bin/bash
# test-db.sh — Verify Phase 3.1 Database Setup

echo "═══════════════════════════════════════"
echo "  NEWS FORGE — Phase 3.1 DB Tests"
echo "═══════════════════════════════════════"
echo ""

PASS=0
FAIL=0

# ─────────────────────────────────
# TEST 1: Docker running?
# ─────────────────────────────────
echo "TEST 1: Docker PostgreSQL container..."
if docker compose ps | grep -q "newsforge_db"; then
  echo "  ✅ PASS — Container is running"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Container not running. Run: docker compose up -d"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 2: Can connect to DB?
# ─────────────────────────────────
echo "TEST 2: Database connection..."
if docker exec newsforge_db psql -U postgres -d newsforge_db -c "SELECT 1;" > /dev/null 2>&1; then
  echo "  ✅ PASS — Database connection works"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Cannot connect to database"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 3: Tables exist?
# ─────────────────────────────────
echo "TEST 3: Tables exist..."
TABLES=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';")
TABLES=$(echo $TABLES | xargs)  # trim whitespace
if [ "$TABLES" -ge 5 ]; then
  echo "  ✅ PASS — Found $TABLES tables"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected 5+ tables, found $TABLES"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 4: Users seeded?
# ─────────────────────────────────
echo "TEST 4: Users table..."
USER_COUNT=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT count(*) FROM users;")
USER_COUNT=$(echo $USER_COUNT | xargs)
if [ "$USER_COUNT" -eq 6 ]; then
  echo "  ✅ PASS — 6 users found"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected 6 users, found $USER_COUNT"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 5: Stories seeded?
# ─────────────────────────────────
echo "TEST 5: Stories table..."
STORY_COUNT=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT count(*) FROM stories;")
STORY_COUNT=$(echo $STORY_COUNT | xargs)
if [ "$STORY_COUNT" -eq 2 ]; then
  echo "  ✅ PASS — 2 stories found"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected 2 stories, found $STORY_COUNT"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 6: Clips seeded?
# ─────────────────────────────────
echo "TEST 6: Story clips table..."
CLIP_COUNT=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT count(*) FROM story_clips;")
CLIP_COUNT=$(echo $CLIP_COUNT | xargs)
if [ "$CLIP_COUNT" -eq 1 ]; then
  echo "  ✅ PASS — 1 clip found"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected 1 clip, found $CLIP_COUNT"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 7: Clip status correct?
# ─────────────────────────────────
echo "TEST 7: Clip status is DONE..."
CLIP_STATUS=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT status FROM story_clips WHERE \"clipId\"='STY-20250610-001_C01';")
CLIP_STATUS=$(echo $CLIP_STATUS | xargs)
if [ "$CLIP_STATUS" = "DONE" ]; then
  echo "  ✅ PASS — Clip status is DONE"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected DONE, got '$CLIP_STATUS'"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 8: Story format correct?
# ─────────────────────────────────
echo "TEST 8: Story format is PKG..."
FORMAT=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT format FROM stories WHERE \"storyId\"='STY-20250610-001';")
FORMAT=$(echo $FORMAT | xargs)
if [ "$FORMAT" = "PKG" ]; then
  echo "  ✅ PASS — Story format is PKG"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected PKG, got '$FORMAT'"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 9: Audit log seeded?
# ─────────────────────────────────
echo "TEST 9: Audit logs table..."
AUDIT_COUNT=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT count(*) FROM audit_logs;")
AUDIT_COUNT=$(echo $AUDIT_COUNT | xargs)
if [ "$AUDIT_COUNT" -ge 1 ]; then
  echo "  ✅ PASS — $AUDIT_COUNT audit log(s) found"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected 1+ audit logs, found $AUDIT_COUNT"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# TEST 10: User roles correct?
# ─────────────────────────────────
echo "TEST 10: User roles..."
PRIYA_ROLE=$(docker exec newsforge_db psql -U postgres -d newsforge_db -t -c "SELECT role FROM users WHERE \"userId\"='USR-001';")
PRIYA_ROLE=$(echo $PRIYA_ROLE | xargs)
if [ "$PRIYA_ROLE" = "PRODUCER" ]; then
  echo "  ✅ PASS — USR-001 (Priya) is PRODUCER"
  PASS=$((PASS+1))
else
  echo "  ❌ FAIL — Expected PRODUCER, got '$PRIYA_ROLE'"
  FAIL=$((FAIL+1))
fi

# ─────────────────────────────────
# RESULTS
# ─────────────────────────────────
echo ""
echo "═══════════════════════════════════════"
echo "  RESULTS: $PASS passed, $FAIL failed (out of 10)"
echo "═══════════════════════════════════════"

if [ $FAIL -eq 0 ]; then
  echo "  🎉 ALL TESTS PASSED — Phase 3.1 is solid!"
else
  echo "  ⚠️  $FAIL test(s) failed — fix before Phase 3.2"
fi
