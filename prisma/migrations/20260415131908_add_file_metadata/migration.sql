-- AlterTable
ALTER TABLE "story_clips" ADD COLUMN     "fileSize" INTEGER,
ALTER COLUMN "fileType" SET DEFAULT 'video/mp4';
