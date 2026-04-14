You are building a broadcast NRCS (News Room Computer System) web application 
called "NEWS FORGE" by "KAYAK".

Tech stack:
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS (no component library, no shadcn, no MUI)
- Icons: lucide-react only
- State: React useState/useContext (no Redux, no Zustand yet)
- All data is MOCK/STATIC for now. No API calls. No backend.
- Dark theme. Background: #0B1120. Panels: #111827. Borders: #374151.

Font imports (put in globals.css):
- Inter (UI text)
- JetBrains Mono (timecodes, IDs)
- Noto Sans Kannada (Kannada script text)

The app has 6 tabs: Workspace, Input, Output, Editor Hub, Rundown, Settings.
Each tab is a full page under Next.js App Router.

File structure:
src/
  app/
    layout.tsx              (root)
    globals.css
    (main)/
      layout.tsx            (shared layout with TopNav)
      workspace/page.tsx
      input/page.tsx
      output/page.tsx
      editor-hub/page.tsx
      rundown/page.tsx
      settings/page.tsx
  components/
    TopNav.tsx
    (other shared components as needed)

RULES:
- Every page must fill exactly 100vh - 48px (nav is 48px)
- Use overflow-hidden on containers, overflow-y-auto on scrollable panels
- All timecodes use font-mono
- All Kannada text uses font-family: 'Noto Sans Kannada'
- Mock data inline in components. No separate data files yet.
- No loading states, no error states, no skeleton screens yet.
- Build each page as ONE file first. We split into components later.