# News Forge — Broadcast NRCS Web Application

News Forge is a high-performance Newsroom Computer System (NRCS) tailored for modern broadcast workflows. It facilitates the end-to-end editorial process, from story ingestion to playout, with real-time collaboration and secure authentication.

## 🚀 Technical Handover
If you are taking over this project, please refer to the following comprehensive guides:

- **[HANDOVER.md](./HANDOVER.md)**: Executive summary, tech stack, workflows, and current implementation status.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)**: Technical deep dive, data models, and back-end strategies.
- **[AGENTS.md](./AGENTS.md)**: Detailed specifications and stakeholder requirements for AI agents.

## 🛠️ Getting Started

### 1. Installation
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file based on your environment. Ensure you have the following keys:
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/newsforge"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-secure-secret-here"
```

### 3. Database Setup
Ensure you have a PostgreSQL instance running. Then run:
```bash
npx prisma db push
npm run prisma:seed
```
*Note: The seed script will create default users (e.g., `admin@newsforge.com` / `newsforge123`).*

### 4. Client Workstation Setup (Viz Pilot)
For users interacting with CG Graphics, the local machine must be configured to handle the custom protocol:
1. Locate `public/vizpilot-protocol.reg` in the repository or download it from the web interface.
2. Double-click the file to register the `vizpilot://` protocol handler in the Windows Registry.

### 5. Teleprompter Setup (Optional)
If using a teleprompter like WinPlus/Autocue:
1. Ensure `PROMPTER_PORT=10541` is open in your firewall.
2. In your prompter software, add an NCS connection:
   - **Host:** Server IP
   - **NCS ID:** `NEWSFORGE`
   - **MOS ID:** `PROMPTER`
   - **Port:** `10541`

### 6. Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application. You will be redirected to the login page.

## 🏗️ Core Pages
- **Login**: Secure access via NextAuth.
- **Workspace**: User profile and personal settings.
- **Input**: Story creation and media upload.
- **Output**: Editorial direction and instructions.
- **Editor Hub**: Copy and video editing task management.
- **Rundown**: Broadcast timeline management.
- **Settings**: System-wide configuration.

---
*Built for News Forge by Kayak.*
