# NEWS FORGE — Agent Implementation Guide

> This document tells the coding agent EXACTLY which files to create/modify.
> Each task has: file path, action (CREATE/MODIFY), and what goes in it.
> Complete tasks IN ORDER. Do not skip files.

---

## PHASE 3.7 — User Authentication (REMAINING TASKS)

### PREREQUISITES (ALREADY DONE — DO NOT REDO)
- ✅ prisma/schema.prisma — passwordHash field added
- ✅ prisma/seed.ts — bcrypt hashing added
- ✅ src/types/next-auth.d.ts — Custom session types
- ✅ src/lib/auth.ts — NextAuth config with CredentialsProvider
- ✅ .env — NEXTAUTH_SECRET added
- ✅ Migration applied and database seeded

### TASK 3.7.1 — CREATE: src/app/api/auth/[...nextauth]/route.ts
**Action:** CREATE new file
**Purpose:** NextAuth API handler — this makes authentication work
**Content:**
- Import NextAuth from 'next-auth'
- Import authOptions from '@/lib/auth'
- Create handler = NextAuth(authOptions)
- Export handler as GET and POST

### TASK 3.7.2 — CREATE: src/app/api/auth/me/route.ts
**Action:** CREATE new file
**Purpose:** Returns current authenticated user
**Content:**
- GET handler that calls getServerSession(authOptions)
- If no session, return 401 { error: 'Not authenticated' }
- If session exists, return { user: session.user }

### TASK 3.7.3 — CREATE: src/lib/get-current-user.ts
**Action:** CREATE new file
**Purpose:** Server-side helper to replace hardcoded 'USR-001' in API routes
**Content:**
- getCurrentUserId(): Returns session userId or fallback 'USR-001'
- getCurrentUser(): Returns full user object or null
- requireAuth(): Throws 'UNAUTHORIZED' if no session
- All use getServerSession(authOptions) from next-auth

### TASK 3.7.4 — CREATE: src/hooks/useAuth.ts
**Action:** CREATE new file
**Purpose:** Client-side auth hook for React components
**Content:**
- Uses useSession, signIn, signOut from 'next-auth/react'
- Returns: user, userId, role, isAuthenticated, isLoading, signIn(), signOut()
- signIn takes email + password, calls signIn('credentials', {...})
- signOut redirects to '/login'

### TASK 3.7.5 — CREATE: src/providers/AuthProvider.tsx
**Action:** CREATE new file
**Purpose:** Wraps app with NextAuth SessionProvider
**Content:**
- 'use client' directive
- Import SessionProvider from 'next-auth/react'
- Wrap children in SessionProvider
- Export as default

### TASK 3.7.6 — CREATE: src/app/login/page.tsx
**Action:** CREATE new file
**Purpose:** Login page UI
**Style:** Dark theme matching bg-[#0a0e17], card bg-[#111827]
**Content:**
- 'use client' directive
- Form with email + password fields
- Submit calls signIn('credentials', { email, password, redirect: false })
- On success, router.push('/rundown')
- On error, show "Invalid email or password"
- Header: "NEWSFORGE" with subtitle "Broadcast News Production System"
- Dev quick-login buttons for: Producer, Editor, Copy Editor, Reporter
  (pre-fills email + password "newsforge123")
- Inputs: bg-[#1a2233], border-gray-700, text-white
- Button: bg-blue-600, hover:bg-blue-700

### TASK 3.7.7 — CREATE: src/middleware.ts
**Action:** CREATE new file in src/ directory (NOT src/app/)
**Purpose:** Protect all routes, redirect unauthenticated users to /login
**Content:**
- Import withAuth from 'next-auth/middleware'
- Export default withAuth with pages.signIn = '/login'
- Export config.matcher that EXCLUDES:
  - /login
  - /api/auth
  - /api/events (for SSE)
  - /_next/static
  - /_next/image
  - /favicon.ico
- Matcher regex: '/((?!login|api/auth|api/events|_next/static|_next/image|favicon.ico).*)'

### TASK 3.7.8 — CREATE: src/components/UserMenu.tsx
**Action:** CREATE new file
**Purpose:** Shows current user name + role + logout button
**Content:**
- 'use client' directive
- Uses useAuth() hook
- Shows: User icon + fullName + role badge (color-coded by role)
- Logout button with LogOut icon from lucide-react
- Role colors: PRODUCER=purple, EDITOR=blue, COPY_EDITOR=green, REPORTER=yellow, ADMIN=red
- Text size: text-xs

### TASK 3.7.9 — MODIFY: src/app/layout.tsx
**Action:** MODIFY existing file
**Purpose:** Wrap the app with AuthProvider
**Changes:**
- Import AuthProvider from '@/providers/AuthProvider'
- Wrap children: AuthProvider > QueryProvider > {children}
- Keep existing metadata, className, etc.

### TASK 3.7.10 — MODIFY: All API routes with hardcoded 'USR-001'
**Action:** MODIFY multiple files
**Purpose:** Replace hardcoded user ID with actual authenticated user
**Pattern for each file:**
1. Add import: import { getCurrentUserId } from '@/lib/get-current-user'
2. Replace: const userId = 'USR-001'
3. With: const userId = await getCurrentUserId()

**Files to modify (search for 'USR-001'):**
- src/app/api/stories/route.ts (POST handler — createdBy)
- src/app/api/stories/[storyId]/route.ts (PATCH handler — audit)
- src/app/api/clips/[clipId]/claim/route.ts (POST — claimedBy)
- src/app/api/clips/[clipId]/complete/route.ts (POST — audit)
- src/app/api/clips/[clipId]/send-to-editor-hub/route.ts (POST — audit)
- src/app/api/stories/[storyId]/send-to-rundown/route.ts (POST — audit)
- src/app/api/rundowns/[rundownId]/entries/route.ts (POST — audit)
- src/lib/api-helpers.ts (if createAuditLog uses hardcoded userId)

---

## PHASE 3.8 — Real-time Updates (SSE)

### TASK 3.8.1 — CREATE: src/lib/event-bus.ts
**Action:** CREATE new file
**Purpose:** In-process event emitter (pub/sub singleton)
**Content:**
- EventBus class with subscribe(channel, callback) and publish(channel, data)
- subscribe returns unsubscribe function
- Wildcard '*' channel support
- Singleton pattern using globalThis (survives hot reload)
- Export CHANNELS constant: { STORIES, CLIPS, RUNDOWNS, ENTRIES, PLAYOUT }
- Export EventType: 'created' | 'updated' | 'deleted' | 'reordered'
- Export SSEEvent interface: { type, entity, entityId, data, userId, timestamp }
- Export publishEvent() convenience function

### TASK 3.8.2 — CREATE: src/lib/api-events.ts
**Action:** CREATE new file
**Purpose:** One-line event emit helpers for API routes
**Content:**
- emitStoryEvent(type, storyId, data?, userId?)
- emitClipEvent(type, clipId, data?, userId?)
- emitRundownEvent(type, rundownId, data?, userId?)
- emitEntryEvent(type, entryId, data?, userId?)
- Each calls publishEvent() from event-bus.ts

### TASK 3.8.3 — CREATE: src/app/api/events/route.ts
**Action:** CREATE new file
**Purpose:** SSE endpoint — clients connect for real-time updates
**Content:**
- export const dynamic = 'force-dynamic'
- export const runtime = 'nodejs'
- GET handler that:
  - Reads ?channels= query param (default: all channels)
  - Creates ReadableStream
  - Sends initial { type: 'connected', channels } message
  - Subscribes to requested channels via eventBus
  - On event: sends as SSE format (event: channel\ndata: JSON\n\n)
  - Heartbeat every 30 seconds (: heartbeat\n\n)
  - Cleanup on request.signal abort
- Returns Response with headers:
  - Content-Type: text/event-stream
  - Cache-Control: no-cache, no-transform
  - Connection: keep-alive

### TASK 3.8.4 — CREATE: src/hooks/useSSE.ts
**Action:** CREATE new file
**Purpose:** Auto-connect to SSE, invalidate TanStack Query caches
**Content:**
- useSSE(options?) hook with channels[] and enabled boolean
- Creates EventSource to /api/events?channels=...
- On each channel event, invalidates relevant queryKeys:
  - stories → ['stories'], ['story', id], ['storyClips', id]
  - clips → ['clips'], ['clip', id], ['storyClips', storyId]
  - rundowns → ['rundowns'], ['rundown', id]
  - entries → ['rundownEntries'], ['rundownEntries', rundownId]
- Exponential backoff reconnect (max 10 retries)
- Cleanup on unmount

### TASK 3.8.5 — CREATE or MODIFY: src/app/(main)/layout.tsx
**Action:** CREATE if doesn't exist, MODIFY if exists
**Purpose:** Wire SSE into all main pages
**Content:**
- 'use client' directive
- Import and call useSSE() (no arguments — uses defaults)
- Render {children}

### TASK 3.8.6 — MODIFY: All mutation API routes — add event publishing
**Action:** MODIFY multiple files
**Pattern:** After each successful create/update/delete, add one emit line

**Files and emit calls:**
- POST /api/stories → emitStoryEvent('created', story.storyId)
- PATCH /api/stories/[storyId] → emitStoryEvent('updated', storyId)
- DELETE /api/stories/[storyId] → emitStoryEvent('deleted', storyId)
- POST /api/clips → emitClipEvent('created', clip.clipId, { storyId })
- PATCH /api/clips/[clipId] → emitClipEvent('updated', clipId, { storyId })
- DELETE /api/clips/[clipId] → emitClipEvent('deleted', clipId, { storyId })
- POST /api/clips/[clipId]/claim → emitClipEvent('updated', clipId, { storyId })
- POST /api/clips/[clipId]/complete → emitClipEvent('updated', clipId, { storyId })
- POST /api/clips/[clipId]/send-to-editor-hub → emitClipEvent('updated', clipId, { storyId })
- POST /api/rundowns → emitRundownEvent('created', rundown.rundownId)
- PATCH /api/rundowns/[rundownId] → emitRundownEvent('updated', rundownId)
- POST /api/rundowns/[rundownId]/entries → emitEntryEvent('created', entry.entryId, { rundownId })
- PATCH /api/rundowns/[rundownId]/entries/reorder → emitEntryEvent('reordered', rundownId, { rundownId })
- PATCH /api/rundowns/[rundownId]/entries/[entryId] → emitEntryEvent('updated', entryId, { rundownId })
- DELETE /api/rundowns/[rundownId]/entries/[entryId] → emitEntryEvent('deleted', entryId, { rundownId })
- POST /api/stories/[storyId]/send-to-rundown → emitStoryEvent('updated', storyId)

**Import for each:** import { emitStoryEvent } from '@/lib/api-events' (or emitClipEvent, etc.)

---

## VERIFICATION CHECKLIST

After all tasks complete, verify:

1. Visit http://192.168.1.126:3000 → should redirect to /login
2. Login with priya.sharma@newsforge.com / newsforge123 → should redirect to /rundown
3. All 4 pages load without errors
4. UserMenu shows "Priya Sharma PRODUCER" with logout button
5. Open two browser tabs — create a story in tab 1 → tab 2 should auto-update
6. curl http://192.168.1.126:3000/api/auth/me → returns user object (with valid session)
7. Check browser DevTools Network tab → SSE connection to /api/events active