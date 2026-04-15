-- CreateEnum
CREATE TYPE "StoryFormat" AS ENUM ('PKG', 'VO', 'VO_BITE', 'ANCHOR', 'BREAK', 'LIVE', 'GFX', 'EMPTY');

-- CreateEnum
CREATE TYPE "StoryStatus" AS ENUM ('NOT_READY', 'EDITING', 'READY', 'DRAFT', 'APPROVED', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "ClipStatus" AS ENUM ('PENDING', 'EDITING', 'DONE');

-- CreateEnum
CREATE TYPE "RundownStatus" AS ENUM ('PLANNING', 'READY', 'REHEARSAL', 'LIVE', 'DONE');

-- CreateEnum
CREATE TYPE "MosStatus" AS ENUM ('SYNCED', 'OFFLINE');

-- CreateEnum
CREATE TYPE "ScriptSource" AS ENUM ('POLISHED', 'RAW');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('REPORTER', 'EDITOR', 'COPY_EDITOR', 'PRODUCER', 'ADMIN');

-- CreateEnum
CREATE TYPE "Language" AS ENUM ('en', 'kn');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('URGENT', 'NORMAL', 'LOW');

-- CreateTable
CREATE TABLE "users" (
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "stories" (
    "storyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "format" "StoryFormat" NOT NULL DEFAULT 'EMPTY',
    "status" "StoryStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL DEFAULT '',
    "rawScript" TEXT NOT NULL DEFAULT '',
    "polishedScript" TEXT,
    "anchorScript" TEXT NOT NULL DEFAULT '',
    "voiceoverScript" TEXT NOT NULL DEFAULT '',
    "editorialNotes" TEXT NOT NULL DEFAULT '',
    "scriptSentToRundown" TEXT,
    "sentToRundownId" TEXT,
    "sentToRundownAt" TIMESTAMP(3),
    "sentBy" TEXT,
    "polishedBy" TEXT,
    "polishedAt" TIMESTAMP(3),
    "isPolished" BOOLEAN NOT NULL DEFAULT false,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "plannedDuration" TEXT NOT NULL DEFAULT '00:00:00',
    "rundownId" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "location" TEXT,
    "source" TEXT,
    "language" "Language" NOT NULL DEFAULT 'en',
    "priority" "Priority" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "stories_pkey" PRIMARY KEY ("storyId")
);

-- CreateTable
CREATE TABLE "story_clips" (
    "clipId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileType" TEXT NOT NULL DEFAULT 'VIDEO/MP4',
    "displayLabel" TEXT NOT NULL DEFAULT '',
    "duration" TEXT,
    "status" "ClipStatus" NOT NULL DEFAULT 'PENDING',
    "claimedBy" TEXT,
    "claimedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "editingInstructions" TEXT NOT NULL DEFAULT '',
    "editorialNotes" TEXT NOT NULL DEFAULT '',
    "codec" TEXT,
    "resolution" TEXT,
    "fps" TEXT,
    "proxyUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "story_clips_pkey" PRIMARY KEY ("clipId")
);

-- CreateTable
CREATE TABLE "rundowns" (
    "rundownId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "broadcastTime" TEXT NOT NULL,
    "plannedDuration" TEXT NOT NULL DEFAULT '00:30:00',
    "status" "RundownStatus" NOT NULL DEFAULT 'PLANNING',
    "mosStatus" "MosStatus" NOT NULL DEFAULT 'OFFLINE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rundowns_pkey" PRIMARY KEY ("rundownId")
);

-- CreateTable
CREATE TABLE "rundown_entries" (
    "entryId" TEXT NOT NULL,
    "rundownId" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "scriptContent" TEXT,
    "scriptSource" "ScriptSource",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rundown_entries_pkey" PRIMARY KEY ("entryId")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "rundowns_date_broadcastTime_key" ON "rundowns"("date", "broadcastTime");

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_polishedBy_fkey" FOREIGN KEY ("polishedBy") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_sentBy_fkey" FOREIGN KEY ("sentBy") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stories" ADD CONSTRAINT "stories_rundownId_fkey" FOREIGN KEY ("rundownId") REFERENCES "rundowns"("rundownId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_clips" ADD CONSTRAINT "story_clips_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("storyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "story_clips" ADD CONSTRAINT "story_clips_claimedBy_fkey" FOREIGN KEY ("claimedBy") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rundown_entries" ADD CONSTRAINT "rundown_entries_rundownId_fkey" FOREIGN KEY ("rundownId") REFERENCES "rundowns"("rundownId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rundown_entries" ADD CONSTRAINT "rundown_entries_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "stories"("storyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
