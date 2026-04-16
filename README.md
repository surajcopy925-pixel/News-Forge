# News Forge — Broadcast NRCS Web Application

News Forge is a high-performance Newsroom Computer System (NRCS) tailored for modern broadcast workflows. It facilitates the end-to-end editorial process, from story ingestion to playout.

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

### 2. Database Setup
Ensure you have a PostgreSQL instance running and update your `.env` file with the connection string. Then run:
```bash
npx prisma db push
npm run prisma:seed
```

### 3. Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

## 🏗️ Core Pages
- **Workspace**: User profile and personal settings.
- **Input**: Story creation and media upload.
- **Output**: Editorial direction and instructions.
- **Editor Hub**: Copy and video editing task management.
- **Rundown**: Broadcast timeline management.
- **Settings**: System-wide configuration.

---
*Built for News Forge by Kayak.*
