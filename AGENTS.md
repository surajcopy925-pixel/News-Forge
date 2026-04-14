<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->
# NEWS FORGE BY KAYAK — Detailed Answer Document

## Version 1.0 | Editor Hub, Settings & General Styling

---

## Table of Contents

1. [Editor Hub (Wireframe Page 3)](#editor-hub)
   - [Q8: Editor Hub Scope & Workflow](#q8-editor-hub-scope--workflow)
   - [Q9: Clip Status Flow](#q9-clip-status-flow)
   - [Q10: Clip Claiming](#q10-clip-claiming)
   - [Q11: Click-to-Open Panel](#q11-click-to-open-panel)
   - [Story ID & Metadata System](#story-id--metadata-system)
   - [File Attachment & Search Panel](#file-attachment--search-panel)
2. [Settings Tab](#settings-tab)
   - [Q15: Settings Sub-sections](#q15-settings-sub-sections)
3. [General / Styling](#general--styling)
   - [Q16: Style Direction](#q16-style-direction)
   - [Q17: Font System](#q17-font-system)
   - [Q18: Toolbar Buttons](#q18-toolbar-buttons)
4. [Unified Team Workflow Summary](#unified-team-workflow-summary)
5. [Architecture Diagram](#architecture-diagram)
6. [Open Questions & Clarifications Needed](#open-questions--clarifications-needed)

---

## Editor Hub

### Q8: Editor Hub Scope & Workflow

**Answer:** The Editor Hub is **NOT** limited to video editors only. It serves as a **unified task hub** for two distinct editing roles working in tandem:

#### Role 1: Video Editors
- Pick up clip editing tasks
- Edit based on instructions provided by the **Output** team
- Save finished files to a **dedicated output directory** on the server
- System auto-attaches the finished clip back to the originating story

#### Role 2: Copy Editors (Text/Script Writers)
- Write and produce broadcast stories inside the Editor Hub
- Story types include: **ANCHOR**, **PKG**, **VO**, **VOSOT**, etc.
- Write in **Kannada** and **English** (bilingual support required)
- Can view notes/instructions from the Output team but **cannot edit those notes**
- The text editor is embedded within the Editor Hub itself

#### How Teams Work in Tandem

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        TEAM WORKFLOW (PARALLEL)                          │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  INPUT TEAM ──────► Uploads raw clips + raw text to server directory     │
│       │               via high-speed local network                       │
│       │               Story ID generated at this point                   │
│       ▼                                                                  │
│  OUTPUT TEAM ─────► Adds editorial notes for visuals                     │
│       │               Adds editing instructions to clips                 │
│       │               (attached from Input)                              │
│       ▼                                                                  │
│  ┌─────────────────────────────────────────────────────┐                │
│  │              EDITOR HUB (PARALLEL WORK)             │                │
│  ├─────────────────────┬───────────────────────────────┤                │
│  │   COPY EDITORS      │     VIDEO EDITORS             │                │
│  │                     │                               │                │
│  │ • Write scripts     │ • Pick up editing tasks       │                │
│  │ • Produce stories   │ • Edit clips per instructions │                │
│  │   (ANCHOR, PKG,     │ • Save to dedicated output    │                │
│  │    VO, VOSOT)       │   directory                   │                │
│  │ • View notes from   │ • System auto-links edited    │                │
│  │   Output (read-only)│   clip back to story          │                │
│  │ • Bilingual:        │                               │                │
│  │   Kannada + English │                               │                │
│  └─────────────────────┴───────────────────────────────┘                │
│       │                         │                                        │
│       ▼                         ▼                                        │
│  RUNDOWN ◄──── Finished scripts + edited clips auto-attached            │
│                 Additional clips can be manually attached via            │
│                 search popup panel                                        │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

### Q9: Clip Status Flow

**Confirmed Flow:**

```
┌─────────────┐    ┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│   PENDING    │───►│  AVAILABLE   │───►│  IN PROCESS  │───►│  COMPLETED  │
│              │    │              │    │              │    │             │
│ Raw clip     │    │ Output team  │    │ Editor has   │    │ File saved  │
│ uploaded via │    │ has added    │    │ claimed the  │    │ to output   │
│ Input to     │    │ editing      │    │ clip and is  │    │ directory.  │
│ server dir.  │    │ instructions.│    │ actively     │    │ System auto-│
│              │    │ Clip is now  │    │ editing.     │    │ links back  │
│ No editing   │    │ ready for    │    │              │    │ to story.   │
│ instructions │    │ any editor   │    │ Marked with  │    │             │
│ yet.         │    │ to claim.    │    │ editor name. │    │ Productivity│
│              │    │              │    │              │    │ score +1    │
└─────────────┘    └─────────────┘    └──────────────┘    └─────────────┘
```

**Detailed Step-by-Step:**

| Step | Action | Status Change | Who |
|------|--------|---------------|-----|
| 1 | Raw clips uploaded via Input page to server directory (high-speed LAN) | → `PENDING` | Input Team |
| 2 | Output team reviews clip, adds editorial notes & editing instructions | → `AVAILABLE` | Output Team |
| 3 | Any editor in Editor Hub claims the clip | → `IN PROCESS` | Video Editor |
| 4 | Editor edits the clip using external tools (Premiere, DaVinci, etc.) | Stays `IN PROCESS` | Video Editor |
| 5 | Editor saves finished file to the **dedicated output directory** | → `COMPLETED` | Video Editor |
| 6 | System auto-detects the file and links it back to the originating story using **Story ID metadata** | Auto-linked | System |

---

### Q10: Clip Claiming

**Answer:** Open claim system — **any editor can pick up any available clip.**

- No pre-assignment to specific editors
- First-come, first-served model
- Once claimed, the clip is **locked to that editor** (moves to "Currently Editing" section)
- **Productivity tracking:** Every claimed and completed clip is recorded against the editor's profile for productivity scoring

**UI Implication:**
```
┌─────────────────────────────────────────┐
│ AVAILABLE FOR CLAIM                      │
├─────────────────────────────────────────┤
│ ☐ CLIP-5  | Story: STY-2025-0042 | 2:34│  [CLAIM]
│ ☐ CLIP-6  | Story: STY-2025-0043 | 1:12│  [CLAIM]
│ ☐ CLIP-7  | Story: STY-2025-0044 | 3:01│  [CLAIM]
├─────────────────────────────────────────┤
│ CURRENTLY EDITING (by you)               │
├─────────────────────────────────────────┤
│ ● CLIP-8  | Story: STY-2025-0039 | 4:15│  [MARK DONE]
│ ● CLIP-9  | Story: STY-2025-0040 | 1:45│  [MARK DONE]
└─────────────────────────────────────────┘
```

---

### Q11: Click-to-Open Panel

**Answer:** When an editor clicks on a clip, a panel/popup opens showing:

| Element | Visible | Editable by Editor |
|---------|---------|-------------------|
| **Script/Story text** | ✅ Yes | ❌ No (read-only) |
| **Notes from Output team** | ✅ Yes | ❌ No (read-only) |
| **Editing instructions** | ✅ Yes | ❌ No (read-only) |
| **Low-res clip preview** | ✅ Yes (popup video player) | N/A |
| **Story ID** | ✅ Yes | ❌ No |
| **Clip metadata** | ✅ Yes | ❌ No |
| **Claim / Mark Done button** | ✅ Yes | ✅ Yes (action) |

**Key Details:**
- The **low-res preview** is generated from the raw clip in the server directory (not the full-res file)
- Editors do **NOT** edit scripts in this panel — that's the Copy Editor's job elsewhere in the Hub
- Notes are added exclusively in the **Output section** and flow here as read-only context
- The full-res raw clip is accessed directly from the server directory via the local network for actual editing in external NLE software

---

### Story ID & Metadata System

**This is a critical architectural requirement. Here's the proposed system:**

#### Story ID Format
```
STY-[YYYY]-[Sequential Number]-[Language Code]
Example: STY-2025-00042-KN  (Kannada story)
Example: STY-2025-00043-EN  (English story)
```

#### Clip Naming Convention (Auto-Rename on Upload)
```
[StoryID]_[ClipSequence]_[ClipType]_[Timestamp].[ext]
Example: STY-2025-00042-KN_C01_RAW_20250614T143022.mxf
Example: STY-2025-00042-KN_C01_EDIT_20250614T161530.mxf
```

#### Metadata Embedding

**Approach: Sidecar JSON + Filename Convention (Recommended — Practical & Simple)**

Embedding metadata directly into video file headers (MXF/MOV metadata fields) is technically possible but:
- Fragile across different NLE software (Premiere may strip it, DaVinci may ignore it)
- Complex to implement reliably
- Slow for large files

**✅ Recommended Simpler Solution:**

```
Server Directory Structure:
─────────────────────────
/media/
├── raw/                          ← Input team uploads here
│   ├── STY-2025-00042-KN/
│   │   ├── STY-2025-00042-KN_C01_RAW.mxf
│   │   ├── STY-2025-00042-KN_C02_RAW.mxf
│   │   └── manifest.json         ← Auto-generated metadata
│   └── STY-2025-00043-EN/
│       └── ...
│
├── proxies/                      ← Auto-generated low-res previews
│   ├── STY-2025-00042-KN/
│   │   ├── STY-2025-00042-KN_C01_PROXY.mp4  (720p, h264)
│   │   └── STY-2025-00042-KN_C02_PROXY.mp4
│   └── ...
│
├── edited/                       ← Video editors save finished files here
│   ├── STY-2025-00042-KN/
│   │   ├── STY-2025-00042-KN_C01_EDIT.mxf
│   │   └── manifest.json         ← Updated on save
│   └── ...
│
└── rundown-attachments/          ← Manually attached clips (any clip)
    └── ...
```

**manifest.json example:**
```json
{
  "storyId": "STY-2025-00042-KN",
  "language": "KN",
  "createdAt": "2025-06-14T14:30:22Z",
  "inputBy": "user_rajesh",
  "clips": [
    {
      "clipId": "STY-2025-00042-KN_C01",
      "originalFilename": "camera_a_take3.mxf",
      "renamedTo": "STY-2025-00042-KN_C01_RAW.mxf",
      "proxyPath": "/proxies/STY-2025-00042-KN/STY-2025-00042-KN_C01_PROXY.mp4",
      "duration": "00:02:34",
      "status": "COMPLETED",
      "claimedBy": "user_priya",
      "claimedAt": "2025-06-14T15:10:00Z",
      "completedAt": "2025-06-14T16:15:30Z",
      "editedPath": "/edited/STY-2025-00042-KN/STY-2025-00042-KN_C01_EDIT.mxf"
    }
  ],
  "editingInstructions": "Cut from 00:30 to 01:45. Add lower third. Color correct.",
  "outputNotes": "Lead story - CM press conference. Focus on announcement segment."
}
```

**Why This Is Practical & Easy to Implement:**
- ✅ No dependency on video file metadata headers
- ✅ Filename-based linking is robust (survives re-encoding, NLE processing)
- ✅ JSON sidecar is fast to read/write
- ✅ Directory structure mirrors Story IDs — easy to debug, backup, manage
- ✅ Low-res proxy generation can be done via FFmpeg background job (simple, reliable)
- ✅ File watcher service monitors `/edited/` directory — auto-detects when editor saves and updates status to COMPLETED

**Proxy Generation (Background Service):**
```bash
# Auto-triggered when raw file lands in /raw/ directory
ffmpeg -i input.mxf -vf scale=1280:720 -c:v libx264 -preset fast -crf 28 -an output_PROXY.mp4
```
This runs as a background service. Typical 2-minute clip proxy generates in ~10-15 seconds on modern hardware.

---

### File Attachment & Search Panel

**Requirement:** A popup panel accessible from the **Rundown** that allows attaching any clip to any story.

#### Popup Panel Specification

```
┌──────────────────────────────────────────────────────────────────┐
│  📎 ATTACH CLIP TO STORY: STY-2025-00042-KN                     │
│                                                              [X] │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔍 Search: [________________________] [Search]                  │
│                                                                  │
│  Filter by:  ○ Name  ○ Timestamp  ○ Story ID  ○ All             │
│                                                                  │
│  Directory:  [▼ /edited/  ]  [▼ /raw/  ]  [▼ /rundown-attach/ ] │
│                                                                  │
├──────────────────────────────────────────────────────────────────┤
│  RESULTS                                                         │
│ ┌────────────────────────────────────────────────────────────┐   │
│ │ ☐ STY-2025-00042-KN_C01_EDIT.mxf  | 00:02:34 | Jun 14    │   │
│ │   Preview: [▶ thumbnail]           | Edited   | 15:30     │   │
│ │                                                            │   │
│ │ ☐ STY-2025-00043-EN_C01_EDIT.mxf  | 00:01:12 | Jun 14    │   │
│ │   Preview: [▶ thumbnail]           | Edited   | 16:00     │   │
│ │                                                            │   │
│ │ ☐ GENERIC_BROLL_RAIN_001.mxf      | 00:00:45 | Jun 10    │   │
│ │   Preview: [▶ thumbnail]           | Stock    | Archive   │   │
│ └────────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Selected: 2 clips                    [CANCEL]  [ATTACH TO STORY]│
└──────────────────────────────────────────────────────────────────┘
```

#### Search Capabilities

| Search Field | How It Works |
|-------------|-------------|
| **Name** | Matches against renamed filename or original filename |
| **Timestamp** | Matches against upload time, creation date, or modified date |
| **Story ID** | Matches against the Story ID embedded in the filename or manifest |
| **Full-text** | Searches across all fields simultaneously |

#### Behavior
- Can attach clips from **any directory** (edited, raw, stock/archive)
- Can attach clips that belong to **other stories** (cross-story attachment)
- Can attach clips that have **no story association** (generic B-roll, stock footage)
- Multiple clips can be selected and attached at once
- Attached clips appear in the Rundown story row with a clip icon and count

---

## Settings Tab

### Q15: Settings Sub-sections

**Confirmed — all sections accurate. Final list:**

| Sub-section | Contents |
|-------------|----------|
| **General** | Station name, station logo, timezone, default language (KN/EN), broadcast format |
| **Storage & Paths** | Raw directory path, edited directory path, proxy directory path, rundown-attachments path, archive path |
| **Rundown Config** | Auto-generate time slots, default slot duration, default story template, rundown naming convention |
| **MOS Connections** | Teleprompter IP/port/protocol, Viz graphics engine connection, MOS gateway settings |
| **Playout Engine** | CasparCG or vMix connection settings, channel mapping, playout server IP |
| **Users & Roles** | User management, role definitions (Admin, Input, Output, Copy Editor, Video Editor, Anchor), permissions per role |
| **Font Management** | Upload font files for Kannada and English (admin only, applies globally to all users) — *moved here from General based on Q17 answer* |
| **Automation** | Auto-proxy generation toggle, file watcher settings, auto-link rules, auto-archive rules |
| **System Health** | Server disk space, network status, MOS connection status, playout engine heartbeat, active users |

**Nothing to add or remove — confirmed as-is with the addition of Font Management.**

---

## General / Styling

### Q16: Style Direction

**Answer:** Modern style, legacy layout structure. **Not** a pixel-perfect copy of the Stitch reference.

#### Theme System — 4 Themes Minimum

| Theme | Description | Primary Use Case |
|-------|-------------|-----------------|
| **Dark Professional** | Deep charcoal/dark gray background, muted accent colors (blue/teal), white text | Default — low-light control rooms |
| **Light Clean** | White/light gray background, dark text, blue accents | Daytime office environments |
| **Dark High-Contrast** | Pure black background, bright white text, vivid accent colors | Accessibility / AMOLED-friendly |
| **Light Warm** | Off-white/cream background, warm gray text, amber/orange accents | Reduced eye strain for long sessions |

#### Style Principles
```
┌─────────────────────────────────────────────────────────────────┐
│ STYLE DIRECTION                                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ✅ KEEP from Legacy:                                             │
│    • Top navigation bar layout (logo left, tabs center,          │
│      status indicators + clock + user right)                     │
│    • Information density (newsroom users need data, not          │
│      whitespace)                                                 │
│    • Sidebar + main content split layout                         │
│    • Status indicators for MOS/VIZ/CAS in nav bar               │
│                                                                  │
│ ✅ MODERNIZE:                                                    │
│    • Clean typography (no pixelated fonts)                        │
│    • Rounded corners on cards/panels (subtle, 4-8px)             │
│    • Smooth transitions/animations (subtle, not flashy)          │
│    • Proper spacing and alignment grid                           │
│    • Modern icon set (Lucide or similar)                          │
│    • Drop shadows replaced with border separators                │
│    • Responsive panels (resizable sidebar widths)                │
│                                                                  │
│ ❌ AVOID:                                                        │
│    • Excessive whitespace (wastes screen in newsroom)            │
│    • Overly rounded "bubbly" UI (needs to feel professional)    │
│    • Animations that delay interaction                           │
│    • Trendy gradients or glassmorphism                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

#### Theme Switching
- Available in **Workspace** (personal preference) and **Settings > General** (system default)
- Each user can override the system default from their Workspace profile
- Theme preference stored per-user in their profile

---

### Q17: Font System

**Answer:** Custom font management via Settings (Admin only).

#### Implementation

```
┌──────────────────────────────────────────────────────────────────┐
│  SETTINGS > FONT MANAGEMENT (Admin Only)                         │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  KANNADA FONT                                                    │
│  Current: Noto Sans Kannada (system default)                     │
│  [Upload .ttf / .otf / .woff2]  [Preview] [Apply]              │
│                                                                  │
│  ENGLISH FONT                                                    │
│  Current: Inter (system default)                                 │
│  [Upload .ttf / .otf / .woff2]  [Preview] [Apply]              │
│                                                                  │
│  SCRIPT DISPLAY SETTINGS                                         │
│  Kannada script font size: [▼ 18px ]  (for story body)          │
│  English script font size: [▼ 16px ]  (for story body)          │
│  Teleprompter font size:   [▼ 32px ]  (for prompter feed)      │
│                                                                  │
│  ⚠️ Changes apply to ALL users system-wide.                     │
│  ⚠️ Uploaded fonts are served from the server.                  │
│                                                                  │
│  [RESET TO DEFAULTS]                              [SAVE CHANGES] │
└──────────────────────────────────────────────────────────────────┘
```

#### System Defaults (before admin uploads custom fonts)
- **Kannada:** Noto Sans Kannada
- **English:** Inter or Roboto
- Both are Google Fonts — zero-cost, excellent rendering

#### Technical Note
- Uploaded font files are stored on the server in `/config/fonts/`
- Served via CSS `@font-face` to all connected clients
- Single source of truth — admin uploads once, everyone sees the same font
- No per-user font overrides (consistency is critical for broadcast scripts)

---

### Q18: Toolbar Buttons

**Confirmed final toolbar set for Rundown:**

```
┌────────────────────────────────────────────────────────────────────────┐
│ [+ New] [✏️ Edit] [🗑 Delete] [📋 Copy] [↕ Move] [🖨 Print]          │
│ [🔍 Search] [📤 Export] [⚡ Powerview]                                │
└────────────────────────────────────────────────────────────────────────┘
```

| Button | Action | Notes |
|--------|--------|-------|
| **New** | Create new story row in rundown | Opens story creation form |
| **Edit** | Edit selected story | Opens story editor panel |
| **Delete** | Delete selected story/row | Confirmation dialog required |
| **Copy** | Duplicate selected story | Creates copy with new ID |
| **Move** | Reorder story in rundown | Drag-and-drop OR arrow up/down |
| **Print** | Print current rundown | Formatted print layout, PDF option |
| **Search** | Search stories in rundown | Filter by headline, slug, ID, status |
| **Export** | Export rundown | Formats: PDF, CSV, XML (MOS-compatible) |
| **Powerview** | Toggle enhanced monitoring view | Full-screen rundown with live timing, on-air indicators, countdown |

**Excluded from legacy (intentionally):** Skip/Unskip, Link, unnamed icon-only buttons — these are **not** included.

---

## Unified Team Workflow Summary

```
                    ┌─────────────────────────────────┐
                    │         NEWS FORGE SYSTEM         │
                    └─────────────────────────────────┘
                                    │
        ┌───────────────────────────┼───────────────────────────┐
        ▼                           ▼                           ▼
  ┌───────────┐             ┌──────────────┐            ┌──────────────┐
  │   INPUT    │             │    OUTPUT     │            │  EDITOR HUB  │
  │   TEAM     │             │    TEAM       │            │              │
  ├───────────┤             ├──────────────┤            ├──────────────┤
  │            │             │              │            │ COPY EDITORS │
  │ • Upload   │─ Story ───►│ • Review     │─ Notes ──►│ • Write      │
  │   raw clips│  created    │   stories    │  & instru-│   scripts    │
  │   to server│  with ID    │ • Add        │  ctions   │ • ANCHOR,    │
  │   directory│             │   editorial  │           │   PKG, VO,   │
  │ • Upload   │             │   notes      │           │   VOSOT      │
  │   raw text │             │ • Add clip   │           │ • Bilingual  │
  │ • Story ID │             │   editing    │           │   KN + EN    │
  │   generated│             │   instruct.  │           │              │
  │ • Auto-    │             │ • Move clip  │           ├──────────────┤
  │   proxy    │             │   status     │           │VIDEO EDITORS │
  │   generated│             │   PENDING →  │           │ • Claim clips│
  │            │             │   AVAILABLE  │           │ • Edit in NLE│
  └───────────┘             └──────────────┘           │ • Save to    │
                                                        │   /edited/   │
                                                        │ • Auto-link  │
                                                        │   to story   │
                                                        │ • Productiv- │
                                                        │   ity scored │
                                                        └──────┬───────┘
                                                               │
                                                               ▼
                                                     ┌──────────────────┐
                                                     │     RUNDOWN       │
                                                     ├──────────────────┤
                                                     │ • Stories with   │
                                                     │   scripts ready  │
                                                     │ • Edited clips   │
                                                     │   auto-attached  │
                                                     │ • Additional     │
                                                     │   clips via      │
                                                     │   search popup   │
                                                     │ • Ready for      │
                                                     │   playout        │
                                                     └──────────────────┘
```

---

## Architecture Diagram

### File System Architecture

```
SERVER (High-Speed LAN)
│
├── /media/
│   ├── /raw/                         ← INPUT uploads here
│   │   ├── /STY-2025-00042-KN/
│   │   │   ├── STY-2025-00042-KN_C01_RAW.mxf
│   │   │   ├── STY-2025-00042-KN_C02_RAW.mxf
│   │   │   └── manifest.json
│   │   └── /STY-2025-00043-EN/
│   │       └── ...
│   │
│   ├── /proxies/                     ← AUTO-GENERATED (low-res previews)
│   │   ├── /STY-2025-00042-KN/
│   │   │   ├── STY-2025-00042-KN_C01_PROXY.mp4
│   │   │   └── STY-2025-00042-KN_C02_PROXY.mp4
│   │   └── ...
│   │
│   ├── /edited/                      ← VIDEO EDITORS save here
│   │   ├── /STY-2025-00042-KN/
│   │   │   ├── STY-2025-00042-KN_C01_EDIT.mxf
│   │   │   └── manifest.json (updated)
│   │   └── ...
│   │
│   ├── /rundown-attachments/         ← Manual attachments
│   │   └── ...
│   │
│   └── /archive/                     ← Old stories moved here
│       └── ...
│
├── /config/
│   ├── /fonts/
│   │   ├── kannada-custom.ttf
│   │   └── english-custom.ttf
│   └── system-config.json
│
└── /app/                             ← News Forge application
    └── ...
```

### Background Services

```
┌─────────────────────────────────────────────────────────────────┐
│ BACKGROUND SERVICES (always running)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ 1. FILE WATCHER: /raw/                                          │
│    • Detects new file uploads                                    │
│    • Triggers proxy generation                                   │
│    • Creates manifest.json                                       │
│    • Renames files to Story ID convention                        │
│    • Updates database: clip status = PENDING                    │
│                                                                  │
│ 2. PROXY GENERATOR                                               │
│    • FFmpeg-based                                                │
│    • Generates 720p H.264 MP4 proxies                           │
│    • ~10-15 sec per 2-min clip                                  │
│    • Stores in /proxies/ directory                               │
│                                                                  │
│ 3. FILE WATCHER: /edited/                                       │
│    • Detects when editor saves finished file                    │
│    • Updates manifest.json                                       │
│    • Updates database: clip status = COMPLETED                  │
│    • Auto-links clip to originating story via Story ID          │
│    • Generates new proxy for edited version                     │
│    • Triggers notification to Output team                       │
│                                                                  │
│ 4. HEALTH MONITOR                                                │
│    • Checks disk space                                           │
│    • Checks MOS connections                                      │
│    • Checks playout engine heartbeat                            │
│    • Reports to Settings > System Health                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Open Questions & Clarifications Needed

Before moving to execution, these questions need answers:

### Editor Hub Questions

| # | Question | Why It Matters |
|---|----------|---------------|
| **EH-1** | When a video editor "marks done" — do they click a button in News Forge, or does the system auto-detect the file appearing in `/edited/`? Or both (auto-detect + manual confirmation)? | Determines if we need a file watcher service vs. just a button |
| **EH-2** | Can an editor **unclaim** a clip and return it to the Available pool? | Edge case: editor starts but can't finish |
| **EH-3** | Should there be a **deadline/timer** on claimed clips? (e.g., if not completed in 30 min, auto-release back to pool) | Prevents clips from being stuck if an editor forgets |
| **EH-4** | Copy editors write scripts in Editor Hub — is this the **same text editor** that appears in the Rundown story editor? Or a separate simplified editor? | Determines if we build one editor component or two |
| **EH-5** | The "productivity score" — is this just a count (clips completed today/week/month)? Or a more complex metric (speed, quality rating, etc.)? | Determines complexity of the analytics |
| **EH-6** | Do copy editors also have a "claim" system for scripts? Or are scripts assigned to them by the Output team? | Parallels the video editor workflow question |

### File System Questions

| # | Question | Why It Matters |
|---|----------|---------------|
| **FS-1** | What video formats will be uploaded? MXF only? Or also MOV, MP4, AVI? | Affects proxy generation pipeline |
| **FS-2** | Expected file sizes? (e.g., 1-5GB per clip? Larger?) | Affects upload handling and proxy generation time estimates |
| **FS-3** | Is the server running Windows or Linux? | Affects file watcher implementation and path formats |
| **FS-4** | How many concurrent editors will be working? (5? 10? 20?) | Affects file locking strategy and server load |

### General Questions

| # | Question | Why It Matters |
|---|----------|---------------|
| **G-1** | The 4 themes — do you have specific color preferences for any of them? Or should I propose a full color palette? | Design phase |
| **G-2** | The clip search popup in Rundown — should it also show clips from **archived** stories? Or only active stories? | Scope of search |
| **G-3** | Should the system support **simultaneous bilingual scripts**? (i.e., one story has both Kannada and English versions side by side?) Or are they completely separate stories? | Affects story editor layout significantly |

---

## Final Confirmed Navigation Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [N] NEWS FORGE    Workspace  Input  Output  EditorHub  Rundown  Settings│
│     BY KAYAK                                    [MOS VIZ CAS] [🕐] [👤] │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  WORKSPACE:  Profile, email, password, preferences, theme selector       │
│                                                                          │
│  INPUT:      Story creation + raw clip/text upload to server directory   │
│              Story ID auto-generated here                                │
│              High-speed LAN upload                                       │
│                                                                          │
│  OUTPUT:     Editorial review + notes + editing instructions             │
│              Moves clips from PENDING → AVAILABLE                        │
│              Cannot be edited by other teams                             │
│                                                                          │
│  EDITOR HUB: Video editors: claim clips, track editing, mark done       │
│              Copy editors: write scripts (ANCHOR, PKG, VO, VOSOT)       │
│              Read-only view of Output notes                              │
│              Productivity tracking                                       │
│              Low-res preview popup for clips                             │
│                                                                          │
│  RUNDOWN:    Main broadcast rundown — sidebar + table + story editor     │
│              Auto-attached edited clips                                  │
│              Manual clip attachment via search popup                     │
│              Toolbar: New, Edit, Delete, Copy, Move, Print, Search,     │
│              Export, Powerview                                           │
│                                                                          │
│  SETTINGS:   General, Storage & Paths, Rundown Config, MOS Connections, │
│              Playout Engine, Users & Roles, Font Management,            │
│              Automation, System Health                                   │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

*Document prepared for News Forge by Kayak development. All answers sourced directly from stakeholder responses. Open questions in Section 6 must be resolved before development begins on the corresponding modules.*